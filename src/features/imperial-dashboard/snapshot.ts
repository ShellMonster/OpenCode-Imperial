import { existsSync, readFileSync } from "node:fs"
import type { ImperialTaskRecord } from "../imperial-workflow/task-types"
import { loadTasks } from "./task-store"

type ActivityItem = { at: string; kind: "flow" | "progress"; payload: unknown }

export type ImperialDashboardSnapshotQuery = {
  state?: string
  org?: string
  q?: string
  control?: string
  sort?: "updatedAt" | "createdAt" | "title" | "state"
  order?: "asc" | "desc"
  limit?: number
  offset?: number
}

export type ImperialDashboardSnapshot = {
  generatedAt: string
  total: number
  totalAll: number
  byState: Record<string, number>
  byControl: Record<string, number>
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

export function buildImperialDashboardSnapshot(directory: string, query: ImperialDashboardSnapshotQuery = {}): ImperialDashboardSnapshot {
  const allTasks = loadTasks(directory)
  const filtered = applyQuery(allTasks, query)

  return {
    generatedAt: new Date().toISOString(),
    total: filtered.length,
    totalAll: allTasks.length,
    byState: countByState(filtered),
    byControl: countByControl(filtered),
    tasks: paginate(sortTasks(filtered, query.sort ?? "updatedAt", query.order ?? "desc"), query.offset ?? 0, query.limit ?? 100),
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

function applyQuery(tasks: ImperialTaskRecord[], query: ImperialDashboardSnapshotQuery): ImperialTaskRecord[] {
  return tasks.filter((task) => {
    if (query.state && task.state !== query.state) return false
    if (query.org && task.org !== query.org) return false
    if (query.control && (task.control?.status ?? "active") !== query.control) return false
    if (query.q) {
      const q = query.q.toLowerCase()
      const haystack = `${task.title} ${task.sessionID} ${task.org}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

function sortTasks(tasks: ImperialTaskRecord[], field: "updatedAt" | "createdAt" | "title" | "state", order: "asc" | "desc"): ImperialTaskRecord[] {
  const factor = order === "asc" ? 1 : -1
  return [...tasks].sort((a, b) => {
    const av = String(a[field] ?? "")
    const bv = String(b[field] ?? "")
    return av.localeCompare(bv) * factor
  })
}

function paginate(tasks: ImperialTaskRecord[], offset: number, limit: number): ImperialTaskRecord[] {
  const safeOffset = Math.max(0, offset)
  const safeLimit = Math.min(500, Math.max(1, limit))
  return tasks.slice(safeOffset, safeOffset + safeLimit)
}

function countByState(tasks: ImperialTaskRecord[]): Record<string, number> {
  const byState = { ...DEFAULT_STATE_COUNTS }
  for (const task of tasks) {
    byState[task.state] = (byState[task.state] ?? 0) + 1
  }
  return byState
}

function countByControl(tasks: ImperialTaskRecord[]): Record<string, number> {
  const counts: Record<string, number> = { active: 0, stopped: 0, cancelled: 0 }
  for (const task of tasks) {
    const key = task.control?.status ?? "active"
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function loadRecentAudit(directory: string, limit: number): Array<Record<string, unknown>> {
  const file = `${directory}/.sisyphus/imperial-workflow/audit.jsonl`
  if (!existsSync(file)) return []

  const lines = readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(-limit)

  const rows: Array<Record<string, unknown>> = []
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line) as Record<string, unknown>)
    } catch {
      continue
    }
  }
  return rows.reverse()
}
