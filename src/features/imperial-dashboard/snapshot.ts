import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { ImperialTaskRecord } from "../imperial-workflow/task-types"

type TaskStateFile = { tasks?: Record<string, ImperialTaskRecord> }

type ActivityItem = { at: string; kind: "flow" | "progress"; payload: unknown }

export type ImperialDashboardSnapshot = {
  generatedAt: string
  total: number
  byState: Record<string, number>
  tasks: ImperialTaskRecord[]
  recentAudit: Array<Record<string, unknown>>
}

const DEFAULT_STATE_COUNTS: Record<string, number> = {
  Pending: 0,
  Zhongshu: 0,
  Menxia: 0,
  Assigned: 0,
  Doing: 0,
  Review: 0,
  Done: 0,
}

export function buildImperialDashboardSnapshot(directory: string): ImperialDashboardSnapshot {
  const tasks = loadTasks(directory)
  const byState = { ...DEFAULT_STATE_COUNTS }
  for (const task of tasks) {
    byState[task.state] = (byState[task.state] ?? 0) + 1
  }

  return {
    generatedAt: new Date().toISOString(),
    total: tasks.length,
    byState,
    tasks: tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    recentAudit: loadRecentAudit(directory, 80),
  }
}

export function buildImperialTaskDetail(directory: string, sessionID: string): {
  task: ImperialTaskRecord
  activity: ActivityItem[]
} | null {
  const task = loadTasks(directory).find((item) => item.sessionID === sessionID)
  if (!task) return null

  const flow = task.flowLog.map((entry) => ({ at: entry.at, kind: "flow" as const, payload: entry }))
  const progress = task.progressLog.map((entry) => ({ at: entry.at, kind: "progress" as const, payload: entry }))
  const activity = [...flow, ...progress].sort((a, b) => a.at.localeCompare(b.at))

  return { task, activity }
}

function loadTasks(directory: string): ImperialTaskRecord[] {
  const file = join(directory, ".sisyphus", "imperial-workflow", "tasks.json")
  const parsed = readJson<TaskStateFile>(file)
  if (!parsed?.tasks) return []
  return Object.values(parsed.tasks)
}

function loadRecentAudit(directory: string, limit: number): Array<Record<string, unknown>> {
  const file = join(directory, ".sisyphus", "imperial-workflow", "audit.jsonl")
  if (!existsSync(file)) return []

  const lines = readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(-limit)

  const rows: Array<Record<string, unknown>> = []
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>
      rows.push(parsed)
    } catch {
      continue
    }
  }
  return rows.reverse()
}

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T
  } catch {
    return null
  }
}
