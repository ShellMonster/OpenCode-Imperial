import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ImperialTaskRecord } from "../imperial-workflow/task-types"

type TaskStateFile = { tasks: Record<string, ImperialTaskRecord> }

type TaskAction = "stop" | "cancel" | "resume"

export type TaskActionResult = {
  ok: boolean
  status: number
  message: string
  task?: ImperialTaskRecord
}

export function loadTasks(directory: string): ImperialTaskRecord[] {
  const data = loadTaskStateFile(directory)
  return Object.values(data.tasks).map((task) => normalizeTask(task))
}

export function saveTasks(directory: string, tasks: ImperialTaskRecord[]): void {
  const path = taskFilePath(directory)
  const next: TaskStateFile = { tasks: {} }
  for (const task of tasks) {
    next.tasks[task.sessionID] = task
  }
  mkdirSync(join(directory, ".sisyphus", "imperial-workflow"), { recursive: true })
  writeFileSync(path, JSON.stringify(next, null, 2), "utf8")
}

export function applyTaskAction(directory: string, sessionID: string, action: TaskAction, reason?: string): TaskActionResult {
  const tasks = loadTasks(directory)
  const task = tasks.find((item) => item.sessionID === sessionID)
  if (!task) {
    return { ok: false, status: 404, message: `task not found: ${sessionID}` }
  }

  const status = task.control?.status ?? "active"
  if (task.state === "Done") {
    return { ok: false, status: 400, message: `cannot ${action} task in Done state` }
  }

  if (action === "stop") {
    if (status !== "active") return { ok: false, status: 400, message: "stop requires active task" }
    patchControl(task, "stopped", reason ?? "stopped from dashboard")
    appendFlow(task, "dashboard", task.org, `stop: ${reason ?? "-"}`)
    appendProgress(task, "dashboard", `Task stopped: ${reason ?? "-"}`)
  }

  if (action === "resume") {
    if (status !== "stopped") return { ok: false, status: 400, message: "resume requires stopped task" }
    patchControl(task, "active", reason ?? "resumed from dashboard")
    appendFlow(task, "dashboard", task.org, `resume: ${reason ?? "-"}`)
    appendProgress(task, "dashboard", `Task resumed: ${reason ?? "-"}`)
  }

  if (action === "cancel") {
    if (status === "cancelled") return { ok: false, status: 400, message: "task already cancelled" }
    patchControl(task, "cancelled", reason ?? "cancelled from dashboard")
    appendFlow(task, "dashboard", task.org, `cancel: ${reason ?? "-"}`)
    appendProgress(task, "dashboard", `Task cancelled: ${reason ?? "-"}`)
  }

  saveTasks(directory, tasks)
  return { ok: true, status: 200, message: `${action} ok`, task }
}

function loadTaskStateFile(directory: string): TaskStateFile {
  const path = taskFilePath(directory)
  if (!existsSync(path)) return { tasks: {} }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as TaskStateFile
    if (!parsed?.tasks || typeof parsed.tasks !== "object") return { tasks: {} }
    return parsed
  } catch {
    return { tasks: {} }
  }
}

function taskFilePath(directory: string): string {
  return join(directory, ".sisyphus", "imperial-workflow", "tasks.json")
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
