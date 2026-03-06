import type { ImperialTaskRecord } from "../imperial-workflow/task-types"
import {
  getImperialTaskFilePath,
  mutateImperialTaskStateFile,
  readImperialTaskStateFile,
  writeImperialTaskStateFile,
} from "../imperial-workflow/task-state-file"

type TaskAction = "stop" | "cancel" | "resume"

export type TaskActionResult = {
  ok: boolean
  status: number
  message: string
  task?: ImperialTaskRecord
}

export function loadTasks(directory: string): ImperialTaskRecord[] {
  const data = readImperialTaskStateFile(getImperialTaskFilePath(directory))
  return Object.values(data.tasks).map((task) => normalizeTask(task))
}

export function saveTasks(directory: string, tasks: ImperialTaskRecord[]): void {
  const next = { tasks: {} as Record<string, ImperialTaskRecord> }
  for (const task of tasks) {
    next.tasks[task.sessionID] = task
  }
  writeImperialTaskStateFile(getImperialTaskFilePath(directory), next)
}

export function applyTaskAction(directory: string, sessionID: string, action: TaskAction, reason?: string): TaskActionResult {
  const filePath = getImperialTaskFilePath(directory)
  return mutateImperialTaskStateFile(filePath, (state) => {
    const task = state.tasks[sessionID]
    if (!task) {
      return { ok: false, status: 404, message: `task not found: ${sessionID}` } satisfies TaskActionResult
    }

    normalizeTask(task)
    const status = task.control?.status ?? "active"
    if (task.state === "Done") {
      return { ok: false, status: 400, message: `cannot ${action} task in Done state` } satisfies TaskActionResult
    }

    if (action === "stop") {
      if (status !== "active") return { ok: false, status: 400, message: "stop requires active task" } satisfies TaskActionResult
      patchControl(task, "stopped", reason ?? "stopped from dashboard")
      appendFlow(task, "dashboard", task.org, `stop: ${reason ?? "-"}`)
      appendProgress(task, "dashboard", `Task stopped: ${reason ?? "-"}`)
    }

    if (action === "resume") {
      if (status !== "stopped") return { ok: false, status: 400, message: "resume requires stopped task" } satisfies TaskActionResult
      patchControl(task, "active", reason ?? "resumed from dashboard")
      appendFlow(task, "dashboard", task.org, `resume: ${reason ?? "-"}`)
      appendProgress(task, "dashboard", `Task resumed: ${reason ?? "-"}`)
    }

    if (action === "cancel") {
      if (status === "cancelled") return { ok: false, status: 400, message: "task already cancelled" } satisfies TaskActionResult
      patchControl(task, "cancelled", reason ?? "cancelled from dashboard")
      appendFlow(task, "dashboard", task.org, `cancel: ${reason ?? "-"}`)
      appendProgress(task, "dashboard", `Task cancelled: ${reason ?? "-"}`)
    }

    return { ok: true, status: 200, message: `${action} ok`, task } satisfies TaskActionResult
  }).result
}

function normalizeTask(task: ImperialTaskRecord): ImperialTaskRecord {
  if (task.control) return task
  return {
    ...task,
    control: {
      status: "active",
      previousStatus: null,
      reason: null,
      updatedAt: task.updatedAt,
    },
  }
}

function patchControl(task: ImperialTaskRecord, nextStatus: "active" | "stopped" | "cancelled", reason: string): void {
  const now = new Date().toISOString()
  const currentStatus = task.control?.status ?? "active"
  task.control = {
    status: nextStatus,
    previousStatus: currentStatus,
    reason,
    updatedAt: now,
  }
  task.updatedAt = now
  task.scheduler.lastProgressAt = now
}

function appendFlow(task: ImperialTaskRecord, from: string, to: string, remark: string): void {
  task.flowLog.push({ at: new Date().toISOString(), from, to, remark })
}

function appendProgress(task: ImperialTaskRecord, agent: string, text: string): void {
  task.progressLog.push({
    at: new Date().toISOString(),
    agent,
    text,
    state: task.state,
  })
}
