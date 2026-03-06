import type { ImperialTaskState } from "./state-machine"
import { canTransition, nextStateFromDelegation } from "./state-machine"
import type { ImperialRole } from "../../config/schema/imperial-workflow"
import { log } from "../../shared/logger"
import { generateImperialTaskID } from "./task-id"
import type { ImperialTaskRecord } from "./task-types"
import { evaluateTaskScheduler } from "./scheduler"
import {
  getImperialTaskFilePath,
  getPreferredImperialTaskReadPath,
  mutateImperialTaskStateFile,
  readImperialTaskStateFile,
  type ImperialTaskStateFile,
} from "./task-state-file"

const MINISTRY_ROLES: ImperialRole[] = ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"]

export class ImperialTaskStateStore {
  private readonly filePath: string
  private data: ImperialTaskStateFile = { tasks: {} }

  constructor(directory: string) {
    this.filePath = getImperialTaskFilePath(directory)
    this.load(getPreferredImperialTaskReadPath(directory))
  }

  get(sessionID: string): ImperialTaskRecord | undefined {
    const task = this.data.tasks[sessionID]
    if (!task) return undefined
    normalizeTaskRecord(task)
    return task
  }

  ensureTask(sessionID: string, title: string, schedulerConfig?: { stallThresholdSec?: number; maxRetry?: number }): ImperialTaskRecord {
    return this.mutate((state) => {
      const existing = state.tasks[sessionID]
      if (existing) {
        normalizeTaskRecord(existing)
        return existing
      }

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
      state.tasks[sessionID] = created
      return created
    })
  }

  appendFlow(sessionID: string, from: string, to: string, remark: string): void {
    this.mutate((state) => {
      const task = state.tasks[sessionID]
      if (!task) return
      normalizeTaskRecord(task)
      task.flowLog.push({
        at: new Date().toISOString(),
        from,
        to,
        remark,
      })
      task.updatedAt = new Date().toISOString()
    })
  }

  appendProgress(sessionID: string, agent: string, text: string): void {
    this.mutate((state) => {
      const task = state.tasks[sessionID]
      if (!task) return
      normalizeTaskRecord(task)
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
    })
  }

  setState(sessionID: string, state: ImperialTaskState, org: string): void {
    this.mutate((file) => {
      const task = file.tasks[sessionID]
      if (!task) return
      normalizeTaskRecord(task)
      const now = new Date().toISOString()
      task.state = state
      task.org = org
      task.updatedAt = now
      task.scheduler.lastProgressAt = now
    })
  }

  clear(sessionID: string): void {
    this.mutate((state) => {
      delete state.tasks[sessionID]
    })
  }

  advanceFromDelegation(input: {
    sessionID: string
    callerRole: ImperialRole
    targetRole: ImperialRole
    callerAgent?: string
    targetAgent?: string
    note?: string
  }): void {
    const next = nextStateFromDelegation(input.callerRole, input.targetRole)
    if (!next) return

    this.mutate((state) => {
      const task = state.tasks[input.sessionID]
      if (!task) return
      normalizeTaskRecord(task)

      const now = new Date().toISOString()
      const note = input.note?.trim()
      this.updateDispatchMeta(task, input.callerRole, input.targetRole, now, input.callerAgent, note)

      if (input.callerRole === "shangshu" && input.targetRole === "zhongshu") {
        const returnedCount = task.dispatch!.assignments.filter((assignment) => assignment.status === "returned").length
        if (returnedCount === 0) {
          task.flowLog.push({
            at: now,
            from: "尚书省",
            to: "中书省",
            remark: "dispatch closure blocked: no returned ministry receipt",
          })
          task.updatedAt = now
          return
        }
        task.dispatch!.consolidated = true
        task.dispatch!.consolidatedAt = now
        task.dispatch!.consolidatedBy = input.callerAgent ?? "shangshu"
        task.dispatch!.consolidatedNote = note
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
        task.review!.pending = true
        task.review!.requestedAt = now
        task.review!.requestedBy = input.callerAgent ?? input.callerRole
      }
      if (input.callerRole === "menxia" && input.targetRole === "zhongshu") {
        task.review!.pending = false
        task.review!.approvedAt = now
        task.review!.approvedBy = input.callerAgent ?? input.callerRole
        if (note) task.review!.note = note
      }
      task.scheduler.lastDispatchStatus = "success"
      task.scheduler.lastProgressAt = now
      task.updatedAt = now
      task.flowLog.push({
        at: now,
        from: input.callerAgent ?? input.callerRole,
        to: input.targetAgent ?? input.targetRole,
        remark: `${input.callerRole} -> ${input.targetRole}`,
      })
    })
  }

  runSchedulerCheck(sessionID: string, now = new Date()): { type: "none" | "retry" | "escalate"; remark?: string } {
    return this.mutate((state) => {
      const task = state.tasks[sessionID]
      if (!task) return { type: "none" as const }
      normalizeTaskRecord(task)
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
      task.flowLog.push({ at: now.toISOString(), from: "scheduler", to: "scheduler", remark: decision.remark })
      return decision
    })
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

  private load(readPath = this.filePath): void {
    this.data = readImperialTaskStateFile(readPath)
    for (const task of Object.values(this.data.tasks)) {
      normalizeTaskRecord(task)
    }
  }

  private mutate<T>(mutator: (state: ImperialTaskStateFile) => T): T {
    try {
      const { state, result } = mutateImperialTaskStateFile(this.filePath, (file) => {
        for (const task of Object.values(file.tasks)) {
          normalizeTaskRecord(task)
        }
        return mutator(file)
      })
      for (const task of Object.values(state.tasks)) {
        normalizeTaskRecord(task)
      }
      this.data = state
      return result
    } catch (error) {
      log("[imperial-workflow] task state persistence skipped", {
        filePath: this.filePath,
        error: error instanceof Error ? error.message : String(error),
      })
      return mutator(this.data)
    }
  }
  private updateDispatchMeta(
    task: ImperialTaskRecord,
    callerRole: ImperialRole,
    targetRole: ImperialRole,
    nowIso: string,
    callerAgent?: string,
    note?: string,
  ): void {
    const dispatch = task.dispatch!
    if (callerRole === "shangshu" && MINISTRY_ROLES.includes(targetRole)) {
      const existing = dispatch.assignments.find((item) => item.ministryRole === targetRole)
      if (existing) {
        existing.status = "assigned"
        existing.assignedAt = nowIso
        existing.returnedAt = undefined
        existing.returnedBy = undefined
        existing.returnNote = undefined
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
        existing.returnedBy = callerAgent
        if (note) existing.returnNote = note
      } else {
        dispatch.assignments.push({
          ministryRole: callerRole,
          status: "returned",
          assignedAt: nowIso,
          returnedAt: nowIso,
          returnedBy: callerAgent,
          ...(note ? { returnNote: note } : {}),
        })
      }
      dispatch.consolidated = false
      dispatch.consolidatedAt = undefined
      dispatch.consolidatedBy = callerAgent
      dispatch.consolidatedNote = undefined
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
  if (!task.review) {
    task.review = {
      pending: false,
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
