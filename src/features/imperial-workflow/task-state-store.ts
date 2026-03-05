import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { ImperialTaskState } from "./state-machine"
import { canTransition, nextStateFromDelegation } from "./state-machine"
import type { ImperialRole } from "../../config/schema/imperial-workflow"
import { log } from "../../shared/logger"
import { generateImperialTaskID } from "./task-id"
import type { ImperialTaskRecord } from "./task-types"
import { evaluateTaskScheduler } from "./scheduler"

type TaskStateFile = {
  tasks: Record<string, ImperialTaskRecord>
}

const MINISTRY_ROLES: ImperialRole[] = ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"]

export class ImperialTaskStateStore {
  private readonly filePath: string
  private data: TaskStateFile = { tasks: {} }

  constructor(directory: string) {
    this.filePath = join(directory, ".sisyphus", "imperial-workflow", "tasks.json")
    this.load()
  }

  get(sessionID: string): ImperialTaskRecord | undefined {
    const task = this.data.tasks[sessionID]
    if (!task) return undefined
    normalizeTaskRecord(task)
    return task
  }

  ensureTask(sessionID: string, title: string, schedulerConfig?: { stallThresholdSec?: number; maxRetry?: number }): ImperialTaskRecord {
    const existing = this.get(sessionID)
    if (existing) return existing

    const now = new Date().toISOString()
    const created: ImperialTaskRecord = {
      id: generateImperialTaskID(),
      sessionID,
      title,
      state: "Pending",
      org: "太子",
      reviewRound: 0,
      flowLog: [],
      progressLog: [],
      scheduler: {
        enabled: true,
        stallThresholdSec: schedulerConfig?.stallThresholdSec ?? 180,
        maxRetry: schedulerConfig?.maxRetry ?? 1,
        retryCount: 0,
        escalationLevel: 0,
        lastProgressAt: now,
        stallSince: null,
        lastDispatchStatus: "queued",
      },
      control: {
        status: "active",
        previousStatus: null,
        reason: null,
        updatedAt: now,
      },
      dispatch: {
        assignments: [],
        consolidated: false,
      },
      createdAt: now,
      updatedAt: now,
    }
    this.data.tasks[sessionID] = created
    this.persist()
    return created
  }

  appendFlow(sessionID: string, from: string, to: string, remark: string): void {
    const task = this.get(sessionID)
    if (!task) return
    task.flowLog.push({
      at: new Date().toISOString(),
      from,
      to,
      remark,
    })
    task.updatedAt = new Date().toISOString()
    this.persist()
  }

  appendProgress(sessionID: string, agent: string, text: string): void {
    const task = this.get(sessionID)
    if (!task) return
    const now = new Date().toISOString()
    task.progressLog.push({
      at: now,
      agent,
      text,
      state: task.state,
    })
    task.scheduler.lastProgressAt = now
    task.scheduler.stallSince = null
    task.updatedAt = now
    this.persist()
  }

  setState(sessionID: string, state: ImperialTaskState, org: string): void {
    const task = this.get(sessionID)
    if (!task) return
    const now = new Date().toISOString()
    task.state = state
    task.org = org
    task.updatedAt = now
    task.scheduler.lastProgressAt = now
    this.persist()
  }

  clear(sessionID: string): void {
    delete this.data.tasks[sessionID]
    this.persist()
  }

  advanceFromDelegation(input: {
    sessionID: string
    callerRole: ImperialRole
    targetRole: ImperialRole
    callerAgent?: string
    targetAgent?: string
  }): void {
    const next = nextStateFromDelegation(input.callerRole, input.targetRole)
    if (!next) return

    const task = this.get(input.sessionID)
    if (!task) return
    normalizeTaskRecord(task)

    const now = new Date().toISOString()
    this.updateDispatchMeta(task, input.callerRole, input.targetRole, now, input.callerAgent)

    if (input.callerRole === "shangshu" && input.targetRole === "zhongshu") {
      const returnedCount = task.dispatch!.assignments.filter((assignment) => assignment.status === "returned").length
      if (returnedCount === 0) {
        this.appendFlow(input.sessionID, "尚书省", "中书省", "dispatch closure blocked: no returned ministry receipt")
        return
      }
      task.dispatch!.consolidated = true
      task.dispatch!.consolidatedAt = now
      task.dispatch!.consolidatedBy = input.callerAgent ?? "shangshu"
    }

    const current = task.state
    if (!canTransition(current, next)) {
      log("[imperial-workflow] invalid state transition ignored", {
        sessionID: input.sessionID,
        from: current,
        to: next,
      })
      return
    }

    task.state = next
    task.org = roleToOrg(next, input.targetRole)
    if (input.callerRole === "zhongshu" && input.targetRole === "menxia") {
      task.reviewRound += 1
    }
    task.scheduler.lastDispatchStatus = "success"
    task.scheduler.lastProgressAt = now
    task.updatedAt = now
    this.appendFlow(
      input.sessionID,
      input.callerAgent ?? input.callerRole,
      input.targetAgent ?? input.targetRole,
      `${input.callerRole} -> ${input.targetRole}`,
    )
    this.persist()
  }

  runSchedulerCheck(sessionID: string, now = new Date()): { type: "none" | "retry" | "escalate"; remark?: string } {
    const task = this.get(sessionID)
    if (!task) return { type: "none" }
    const decision = evaluateTaskScheduler(task, now)
    if (decision.type === "none") return decision

    if (decision.type === "retry") {
      task.scheduler.retryCount += 1
      task.scheduler.lastDispatchStatus = "timeout"
      task.scheduler.stallSince = now.toISOString()
    } else {
      task.scheduler.escalationLevel += 1
      task.scheduler.lastDispatchStatus = "failed"
      task.scheduler.stallSince = now.toISOString()
    }
    task.updatedAt = now.toISOString()
    this.appendFlow(sessionID, "scheduler", "scheduler", decision.remark)
    this.persist()
    return decision
  }

  getActivity(sessionID: string): Array<{ at: string; kind: string; payload: unknown }> {
    const task = this.get(sessionID)
    if (!task) return []
    const flow = task.flowLog.map((entry) => ({ at: entry.at, kind: "flow", payload: entry }))
    const progress = task.progressLog.map((entry) => ({
      at: entry.at,
      kind: "progress",
      payload: entry,
    }))
    return [...flow, ...progress].sort((a, b) => a.at.localeCompare(b.at))
  }

  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as TaskStateFile
      if (parsed && typeof parsed === "object" && parsed.tasks) {
        for (const task of Object.values(parsed.tasks)) {
          normalizeTaskRecord(task)
        }
        this.data = parsed
      }
    } catch {
      this.data = { tasks: {} }
    }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8")
    } catch (error) {
      log("[imperial-workflow] task state persistence skipped", {
        filePath: this.filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private updateDispatchMeta(
    task: ImperialTaskRecord,
    callerRole: ImperialRole,
    targetRole: ImperialRole,
    nowIso: string,
    callerAgent?: string,
  ): void {
    const dispatch = task.dispatch!
    if (callerRole === "shangshu" && MINISTRY_ROLES.includes(targetRole)) {
      const existing = dispatch.assignments.find((item) => item.ministryRole === targetRole)
      if (existing) {
        existing.status = "assigned"
        existing.assignedAt = nowIso
        existing.returnedAt = undefined
      } else {
        dispatch.assignments.push({
          ministryRole: targetRole,
          status: "assigned",
          assignedAt: nowIso,
        })
      }
      return
    }

    if (MINISTRY_ROLES.includes(callerRole) && targetRole === "shangshu") {
      const existing = dispatch.assignments.find((item) => item.ministryRole === callerRole)
      if (existing) {
        existing.status = "returned"
        existing.returnedAt = nowIso
      } else {
        dispatch.assignments.push({
          ministryRole: callerRole,
          status: "returned",
          assignedAt: nowIso,
          returnedAt: nowIso,
        })
      }
      dispatch.consolidated = false
      dispatch.consolidatedAt = undefined
      dispatch.consolidatedBy = callerAgent
    }
  }
}

function normalizeTaskRecord(task: ImperialTaskRecord): void {
  if (!task.control) {
    task.control = {
      status: "active",
      previousStatus: null,
      reason: null,
      updatedAt: task.updatedAt,
    }
  }
  if (!task.dispatch) {
    task.dispatch = {
      assignments: [],
      consolidated: false,
    }
  }
}

function roleToOrg(state: ImperialTaskState, targetRole: ImperialRole): string {
  if (state === "Menxia") return "门下省"
  if (state === "Assigned") return "尚书省"
  if (state === "Doing") {
    const mapping: Partial<Record<ImperialRole, string>> = {
      hubu: "户部",
      libu: "礼部",
      bingbu: "兵部",
      xingbu: "刑部",
      gongbu: "工部",
      libu_hr: "吏部",
    }
    return mapping[targetRole] ?? "六部"
  }
  if (state === "Review") return "尚书省"
  if (state === "Done") return "中书省"
  return "中书省"
}

const stores = new Map<string, ImperialTaskStateStore>()

export function getImperialTaskStateStore(directory: string): ImperialTaskStateStore {
  const existing = stores.get(directory)
  if (existing) return existing
  const created = new ImperialTaskStateStore(directory)
  stores.set(directory, created)
  return created
}
