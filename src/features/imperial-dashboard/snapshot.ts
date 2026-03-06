import { existsSync, readFileSync } from "node:fs"
import type { ImperialTaskRecord } from "../imperial-workflow/task-types"
import { getPreferredImperialAuditReadPath } from "../imperial-workflow/task-state-file"
import { loadTasks } from "./task-store"

type ActivityItem = { at: string; kind: "flow" | "progress"; payload: unknown }

type ImperialTaskInstitutionalDetail = {
  review: {
    pending: boolean
    round: number
    requestedAt?: string
    requestedBy?: string
    approvedAt?: string
    approvedBy?: string
    note?: string
  }
  dispatch: {
    assignedMinistries: string[]
    returnedMinistries: string[]
    outstandingMinistries: string[]
    consolidated: boolean
    consolidatedAt?: string
    consolidatedBy?: string
    consolidatedNote?: string
    receipts: Array<{
      ministryRole: string
      status: "assigned" | "returned"
      assignedAt: string
      returnedAt?: string
      returnedBy?: string
      returnNote?: string
    }>
  }
}

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
  overview: {
    institutions: Array<{
      name: string
      total: number
      active: number
      stopped: number
      cancelled: number
    }>
  }
  funnel: Array<{
    state: string
    count: number
  }>
  bottlenecks: {
    stalledTasks: number
    stoppedTasks: number
    pendingReview: number
    timedOutTasks: number
    escalatedTasks: number
    items: Array<{
      sessionID: string
      title: string
      state: string
      org: string
      control: string
      stallSince?: string | null
      reviewPending: boolean
      escalationLevel: number
      lastDispatchStatus: string
      reason: string
    }>
  }
  officials: Array<{
    role: string
    owningTasks: number
    assignedTasks: number
    activeTasks: number
    returnedAssignments: number
    outstandingAssignments: number
  }>
  tasks: ImperialTaskRecord[]
  recentAudit: Array<Record<string, unknown>>
}

export type ImperialMemorialSummary = {
  generatedAt: string
  totals: {
    tasks: number
    done: number
    activeControl: number
    stoppedControl: number
    cancelledControl: number
  }
  review: {
    avgReviewRound: number
    maxReviewRound: number
  }
  dispatch: {
    assignmentTotal: number
    assignmentReturned: number
    consolidatedTasks: number
  }
  audit: {
    recentDenied: number
  }
  memorials: Array<{
    sessionID: string
    title: string
    completedAt: string
    org: string
    reviewRound: number
    consolidated: boolean
    summary: string
  }>
}

export type ImperialOfficialDetail = {
  role: string
  summary: {
    owningTasks: number
    assignedTasks: number
    activeTasks: number
    returnedAssignments: number
    outstandingAssignments: number
  }
  ownedTasks: Array<{
    sessionID: string
    title: string
    state: string
    control: string
    updatedAt: string
  }>
  assignments: Array<{
    sessionID: string
    title: string
    status: string
    assignedAt: string
    returnedAt?: string
    returnedBy?: string
    returnNote?: string
  }>
  recentActivity: Array<{
    sessionID: string
    title: string
    at: string
    kind: "flow" | "progress"
    summary: string
  }>
}

export type ImperialSessionMonitor = {
  sessionID: string
  title: string
  state: string
  org: string
  control: {
    status: string
    reason?: string | null
    updatedAt?: string
  }
  scheduler: {
    retryCount: number
    escalationLevel: number
    stallSince?: string | null
    lastProgressAt: string
    lastDispatchStatus: string
  }
  review: ImperialTaskInstitutionalDetail["review"]
  dispatch: ImperialTaskInstitutionalDetail["dispatch"]
  activity: ActivityItem[]
  health: {
    status: "healthy" | "watch" | "blocked"
    blockers: string[]
  }
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
    overview: buildInstitutionOverview(filtered),
    funnel: buildFunnel(allTasks),
    bottlenecks: buildBottlenecks(allTasks),
    officials: buildOfficialLoad(allTasks),
    tasks: paginate(sortTasks(filtered, query.sort ?? "updatedAt", query.order ?? "desc"), query.offset ?? 0, query.limit ?? 100),
    recentAudit: loadRecentAudit(directory, 80),
  }
}

export function buildImperialTaskDetail(directory: string, sessionID: string): {
  task: ImperialTaskRecord
  activity: ActivityItem[]
  institutional: ImperialTaskInstitutionalDetail
} | null {
  const task = loadTasks(directory).find((item) => item.sessionID === sessionID)
  if (!task) return null

  const flow = task.flowLog.map((entry) => ({ at: entry.at, kind: "flow" as const, payload: entry }))
  const progress = task.progressLog.map((entry) => ({ at: entry.at, kind: "progress" as const, payload: entry }))
  const activity = [...flow, ...progress].sort((a, b) => a.at.localeCompare(b.at))

  return { task, activity, institutional: buildInstitutionalDetail(task) }
}

export function buildImperialMemorialSummary(directory: string): ImperialMemorialSummary {
  const tasks = loadTasks(directory)
  const audit = loadRecentAudit(directory, 200)

  const totalReview = tasks.reduce((sum, task) => sum + (task.reviewRound ?? 0), 0)
  const maxReviewRound = tasks.reduce((max, task) => Math.max(max, task.reviewRound ?? 0), 0)
  const assignmentTotal = tasks.reduce((sum, task) => sum + (task.dispatch?.assignments.length ?? 0), 0)
  const assignmentReturned = tasks.reduce(
    (sum, task) => sum + (task.dispatch?.assignments.filter((item) => item.status === "returned").length ?? 0),
    0,
  )
  const consolidatedTasks = tasks.filter((task) => task.dispatch?.consolidated).length
  const recentDenied = audit.filter((item) => item.allowed === false).length

  const activeControl = tasks.filter((task) => (task.control?.status ?? "active") === "active").length
  const stoppedControl = tasks.filter((task) => (task.control?.status ?? "active") === "stopped").length
  const cancelledControl = tasks.filter((task) => (task.control?.status ?? "active") === "cancelled").length
  const memorials = tasks
    .filter((task) => task.state === "Done")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 12)
    .map((task) => ({
      sessionID: task.sessionID,
      title: task.title,
      completedAt: task.updatedAt,
      org: task.org,
      reviewRound: task.reviewRound ?? 0,
      consolidated: task.dispatch?.consolidated ?? false,
      summary: buildMemorialNarrative(task),
    }))

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      tasks: tasks.length,
      done: tasks.filter((task) => task.state === "Done").length,
      activeControl,
      stoppedControl,
      cancelledControl,
    },
    review: {
      avgReviewRound: tasks.length > 0 ? Number((totalReview / tasks.length).toFixed(2)) : 0,
      maxReviewRound,
    },
    dispatch: {
      assignmentTotal,
      assignmentReturned,
      consolidatedTasks,
    },
    audit: {
      recentDenied,
    },
    memorials,
  }
}

export function buildImperialOfficialDetail(directory: string, role: string): ImperialOfficialDetail | null {
  const tasks = loadTasks(directory)
  const normalizedRole = role.trim()
  if (!normalizedRole) return null

  const ownedTasks = tasks.filter((task) => task.org === normalizedRole)
  const assignments = tasks.flatMap((task) =>
    (task.dispatch?.assignments ?? [])
      .filter((item) => item.ministryRole === normalizedRole)
      .map((item) => ({
        sessionID: task.sessionID,
        title: task.title,
        status: item.status,
        assignedAt: item.assignedAt,
        returnedAt: item.returnedAt,
        returnedBy: item.returnedBy,
        returnNote: item.returnNote,
      })),
  )

  if (ownedTasks.length === 0 && assignments.length === 0) return null

  const recentActivity = tasks
    .flatMap((task) => {
      const flow = task.flowLog
        .filter((entry) => entry.from === normalizedRole || entry.to === normalizedRole)
        .map((entry) => ({
          sessionID: task.sessionID,
          title: task.title,
          at: entry.at,
          kind: "flow" as const,
          summary: `${entry.from} -> ${entry.to} | ${entry.remark}`,
        }))
      const progress = task.progressLog
        .filter((entry) => entry.agent === normalizedRole)
        .map((entry) => ({
          sessionID: task.sessionID,
          title: task.title,
          at: entry.at,
          kind: "progress" as const,
          summary: entry.text,
        }))
      return [...flow, ...progress]
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12)

  return {
    role: normalizedRole,
    summary: {
      owningTasks: ownedTasks.length,
      assignedTasks: assignments.length,
      activeTasks: ownedTasks.filter((task) => (task.control?.status ?? "active") === "active").length,
      returnedAssignments: assignments.filter((item) => item.status === "returned").length,
      outstandingAssignments: assignments.filter((item) => item.status !== "returned").length,
    },
    ownedTasks: ownedTasks
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map((task) => ({
        sessionID: task.sessionID,
        title: task.title,
        state: task.state,
        control: task.control?.status ?? "active",
        updatedAt: task.updatedAt,
      })),
    assignments: assignments.sort((a, b) => String(b.assignedAt).localeCompare(String(a.assignedAt))),
    recentActivity,
  }
}

export function buildImperialSessionMonitor(directory: string, sessionID: string): ImperialSessionMonitor | null {
  const detail = buildImperialTaskDetail(directory, sessionID)
  if (!detail) return null

  const blockers = [
    detail.task.control?.status === "stopped" ? "task stopped" : undefined,
    detail.task.control?.status === "cancelled" ? "task cancelled" : undefined,
    detail.task.review?.pending ? "review pending" : undefined,
    detail.task.scheduler.stallSince ? "scheduler stall detected" : undefined,
    detail.task.scheduler.lastDispatchStatus === "timeout" ? "dispatch timeout" : undefined,
    (detail.task.scheduler.escalationLevel ?? 0) > 0 ? `escalated level ${detail.task.scheduler.escalationLevel}` : undefined,
    detail.institutional.dispatch.outstandingMinistries.length > 0 ? `outstanding ministries: ${detail.institutional.dispatch.outstandingMinistries.join(", ")}` : undefined,
  ].filter((item): item is string => Boolean(item))

  const health: ImperialSessionMonitor["health"] =
    blockers.length === 0
      ? { status: "healthy", blockers: [] }
      : blockers.some((item) => item.includes("cancelled") || item.includes("timeout") || item.includes("stall"))
        ? { status: "blocked", blockers }
        : { status: "watch", blockers }

  return {
    sessionID: detail.task.sessionID,
    title: detail.task.title,
    state: detail.task.state,
    org: detail.task.org,
    control: {
      status: detail.task.control?.status ?? "active",
      reason: detail.task.control?.reason,
      updatedAt: detail.task.control?.updatedAt,
    },
    scheduler: {
      retryCount: detail.task.scheduler.retryCount,
      escalationLevel: detail.task.scheduler.escalationLevel,
      stallSince: detail.task.scheduler.stallSince,
      lastProgressAt: detail.task.scheduler.lastProgressAt,
      lastDispatchStatus: detail.task.scheduler.lastDispatchStatus,
    },
    review: detail.institutional.review,
    dispatch: detail.institutional.dispatch,
    activity: detail.activity,
    health,
  }
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

function buildInstitutionOverview(tasks: ImperialTaskRecord[]): ImperialDashboardSnapshot["overview"] {
  const bucket = new Map<string, { name: string; total: number; active: number; stopped: number; cancelled: number }>()
  for (const task of tasks) {
    const name = task.org || "未分配"
    const current = bucket.get(name) ?? { name, total: 0, active: 0, stopped: 0, cancelled: 0 }
    current.total += 1
    const control = task.control?.status ?? "active"
    current[control] += 1
    bucket.set(name, current)
  }
  return {
    institutions: [...bucket.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  }
}

function buildFunnel(tasks: ImperialTaskRecord[]): ImperialDashboardSnapshot["funnel"] {
  const counts = countByState(tasks)
  return Object.keys(DEFAULT_STATE_COUNTS).map((state) => ({
    state,
    count: counts[state] ?? 0,
  }))
}

function buildBottlenecks(tasks: ImperialTaskRecord[]): ImperialDashboardSnapshot["bottlenecks"] {
  const items = tasks
    .map((task) => {
      const stalled = Boolean(task.scheduler.stallSince)
      const stopped = (task.control?.status ?? "active") === "stopped"
      const reviewPending = task.review?.pending === true
      const timedOut = task.scheduler.lastDispatchStatus === "timeout"
      const escalated = (task.scheduler.escalationLevel ?? 0) > 0
      if (!stalled && !stopped && !reviewPending && !timedOut && !escalated) return null

      const reasons = [
        stalled ? "stall" : undefined,
        stopped ? "stopped" : undefined,
        reviewPending ? "review pending" : undefined,
        timedOut ? "dispatch timeout" : undefined,
        escalated ? `escalated L${task.scheduler.escalationLevel}` : undefined,
      ].filter((item): item is string => Boolean(item))

      return {
        sessionID: task.sessionID,
        title: task.title,
        state: task.state,
        org: task.org,
        control: task.control?.status ?? "active",
        stallSince: task.scheduler.stallSince,
        reviewPending,
        escalationLevel: task.scheduler.escalationLevel ?? 0,
        lastDispatchStatus: task.scheduler.lastDispatchStatus,
        reason: reasons.join(" | "),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      const aWeight = Number(Boolean(a.stallSince)) + a.escalationLevel + Number(a.control === "stopped")
      const bWeight = Number(Boolean(b.stallSince)) + b.escalationLevel + Number(b.control === "stopped")
      return bWeight - aWeight || String(b.stallSince ?? "").localeCompare(String(a.stallSince ?? ""))
    })
    .slice(0, 12)

  return {
    stalledTasks: tasks.filter((task) => Boolean(task.scheduler.stallSince)).length,
    stoppedTasks: tasks.filter((task) => (task.control?.status ?? "active") === "stopped").length,
    pendingReview: tasks.filter((task) => task.review?.pending === true).length,
    timedOutTasks: tasks.filter((task) => task.scheduler.lastDispatchStatus === "timeout").length,
    escalatedTasks: tasks.filter((task) => (task.scheduler.escalationLevel ?? 0) > 0).length,
    items,
  }
}

function buildOfficialLoad(tasks: ImperialTaskRecord[]): ImperialDashboardSnapshot["officials"] {
  const bucket = new Map<string, ImperialDashboardSnapshot["officials"][number]>()

  const ensure = (role: string) => {
    const key = role || "未分配"
    const current = bucket.get(key) ?? {
      role: key,
      owningTasks: 0,
      assignedTasks: 0,
      activeTasks: 0,
      returnedAssignments: 0,
      outstandingAssignments: 0,
    }
    bucket.set(key, current)
    return current
  }

  for (const task of tasks) {
    const owner = ensure(task.org)
    owner.owningTasks += 1
    if ((task.control?.status ?? "active") === "active") {
      owner.activeTasks += 1
    }

    for (const assignment of task.dispatch?.assignments ?? []) {
      const officer = ensure(assignment.ministryRole)
      officer.assignedTasks += 1
      if (assignment.status === "returned") {
        officer.returnedAssignments += 1
      } else {
        officer.outstandingAssignments += 1
      }
    }
  }

  return [...bucket.values()].sort((a, b) => {
    const aLoad = a.owningTasks + a.assignedTasks + a.outstandingAssignments
    const bLoad = b.owningTasks + b.assignedTasks + b.outstandingAssignments
    return bLoad - aLoad || a.role.localeCompare(b.role)
  })
}

function loadRecentAudit(directory: string, limit: number): Array<Record<string, unknown>> {
  const file = getPreferredImperialAuditReadPath(directory)
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

function buildInstitutionalDetail(task: ImperialTaskRecord): ImperialTaskInstitutionalDetail {
  const assignments = task.dispatch?.assignments ?? []
  const assignedMinistries = assignments.map((item) => item.ministryRole)
  const returnedMinistries = assignments.filter((item) => item.status === "returned").map((item) => item.ministryRole)
  const outstandingMinistries = assignments.filter((item) => item.status !== "returned").map((item) => item.ministryRole)

  return {
    review: {
      pending: task.review?.pending ?? false,
      round: task.reviewRound ?? 0,
      requestedAt: task.review?.requestedAt,
      requestedBy: task.review?.requestedBy,
      approvedAt: task.review?.approvedAt,
      approvedBy: task.review?.approvedBy,
      note: task.review?.note,
    },
    dispatch: {
      assignedMinistries,
      returnedMinistries,
      outstandingMinistries,
      consolidated: task.dispatch?.consolidated ?? false,
      consolidatedAt: task.dispatch?.consolidatedAt,
      consolidatedBy: task.dispatch?.consolidatedBy,
      consolidatedNote: task.dispatch?.consolidatedNote,
      receipts: assignments.map((item) => ({
        ministryRole: item.ministryRole,
        status: item.status,
        assignedAt: item.assignedAt,
        returnedAt: item.returnedAt,
        returnedBy: item.returnedBy,
        returnNote: item.returnNote,
      })),
    },
  }
}

function buildMemorialNarrative(task: ImperialTaskRecord): string {
  const returned = task.dispatch?.assignments.filter((item) => item.status === "returned").map((item) => item.ministryRole) ?? []
  const reviewNote = task.review?.note?.trim()
  const consolidatedNote = task.dispatch?.consolidatedNote?.trim()
  const fragments = [
    returned.length > 0 ? `Returned by ${returned.join(", ")}` : "No ministry receipt recorded",
    reviewNote ? `Menxia note: ${reviewNote}` : undefined,
    consolidatedNote ? `Shangshu summary: ${consolidatedNote}` : undefined,
  ].filter((item): item is string => Boolean(item))
  return fragments.join(" | ")
}
