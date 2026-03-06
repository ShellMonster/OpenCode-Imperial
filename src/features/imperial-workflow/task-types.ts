import type { ImperialTaskState } from "./state-machine"

export type ImperialFlowLogEntry = {
  at: string
  from: string
  to: string
  remark: string
}

export type ImperialProgressLogEntry = {
  at: string
  agent: string
  text: string
  state: ImperialTaskState
}

export type ImperialSchedulerMeta = {
  enabled: boolean
  stallThresholdSec: number
  maxRetry: number
  retryCount: number
  escalationLevel: number
  lastProgressAt: string
  stallSince: string | null
  lastDispatchStatus: "queued" | "success" | "failed" | "timeout" | "error"
}

export type ImperialTaskControl = {
  status: "active" | "stopped" | "cancelled"
  previousStatus: "active" | "stopped" | "cancelled" | null
  reason: string | null
  updatedAt: string
}

export type ImperialDispatchAssignment = {
  ministryRole: string
  assignedAt: string
  returnedAt?: string
  returnedBy?: string
  returnNote?: string
  status: "assigned" | "returned"
}

export type ImperialDispatchMeta = {
  assignments: ImperialDispatchAssignment[]
  consolidated: boolean
  consolidatedAt?: string
  consolidatedBy?: string
  consolidatedNote?: string
}

export type ImperialReviewMeta = {
  pending: boolean
  requestedAt?: string
  requestedBy?: string
  approvedAt?: string
  approvedBy?: string
  note?: string
}

export type ImperialTaskRecord = {
  id: string
  sessionID: string
  title: string
  state: ImperialTaskState
  org: string
  reviewRound: number
  flowLog: ImperialFlowLogEntry[]
  progressLog: ImperialProgressLogEntry[]
  scheduler: ImperialSchedulerMeta
  control?: ImperialTaskControl
  review?: ImperialReviewMeta
  dispatch?: ImperialDispatchMeta
  createdAt: string
  updatedAt: string
}
