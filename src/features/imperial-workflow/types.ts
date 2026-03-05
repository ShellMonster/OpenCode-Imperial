import type { ImperialRole, ImperialWorkflowConfig } from "../../config/schema/imperial-workflow"

export type ImperialRoleMap = Partial<Record<string, ImperialRole>>
export type ImperialPermissionMatrix = Record<ImperialRole, ImperialRole[]>

export type ImperialWorkflowPolicy = {
  enabled: boolean
  strictReview: boolean
  strictMapping: boolean
  requireReviewNote: boolean
  maxReviewRound: number
  roleMap: ImperialRoleMap
  permissionMatrix: ImperialPermissionMatrix
}

export type ImperialDelegationDecision = {
  allowed: boolean
  callerRole?: ImperialRole
  targetRole?: ImperialRole
  reason?: string
}

export type ImperialSessionReviewState = {
  reviewRounds: number
  reviewed: boolean
  pendingReview: boolean
  reviewedAt?: string
  reviewNote?: string
}

export type ImperialWorkflowInputConfig = ImperialWorkflowConfig | undefined
