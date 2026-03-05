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
  createdAt: string
  updatedAt: string
}
