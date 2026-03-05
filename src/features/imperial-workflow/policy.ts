import type { ImperialWorkflowInputConfig, ImperialDelegationDecision, ImperialWorkflowPolicy } from "./types"
import type { ImperialRole } from "../../config/schema/imperial-workflow"
import { DEFAULT_IMPERIAL_PERMISSION_MATRIX, DEFAULT_IMPERIAL_ROLE_MAP } from "./defaults"
import { ImperialSessionReviewStore } from "./session-review-store"
import { getAgentConfigKey } from "../../shared/agent-display-names"

function normalizeAgentName(agentName: string | undefined): string | undefined {
  if (!agentName?.trim()) return undefined
  return getAgentConfigKey(agentName.trim())
}

function resolveRole(roleMap: ImperialWorkflowPolicy["roleMap"], agentName: string | undefined): ImperialRole | undefined {
  const normalized = normalizeAgentName(agentName)
  if (!normalized) return undefined
  return roleMap[normalized]
}

export function createImperialWorkflowPolicy(config: ImperialWorkflowInputConfig): ImperialWorkflowPolicy {
  const roleMap = {
    ...DEFAULT_IMPERIAL_ROLE_MAP,
    ...(config?.role_map ?? {}),
  }

  const permissionMatrix = {
    ...DEFAULT_IMPERIAL_PERMISSION_MATRIX,
    ...(config?.permission_matrix ?? {}),
  }

  return {
    enabled: config?.enabled ?? false,
    strictReview: config?.strict_review ?? true,
    strictMapping: config?.strict_mapping ?? false,
    requireReviewNote: config?.require_review_note ?? false,
    maxReviewRound: config?.max_review_round ?? 3,
    roleMap,
    permissionMatrix,
  }
}

export function evaluateImperialDelegation(input: {
  policy: ImperialWorkflowPolicy
  reviewStore: ImperialSessionReviewStore
  sessionID: string
  callerAgent?: string
  targetAgent?: string
  reviewNote?: string
}): ImperialDelegationDecision {
  const { policy, reviewStore, sessionID, callerAgent, targetAgent, reviewNote } = input
  if (!policy.enabled) {
    return { allowed: true }
  }

  const callerRole = resolveRole(policy.roleMap, callerAgent)
  const targetRole = resolveRole(policy.roleMap, targetAgent)

  if (!callerRole || !targetRole) {
    if (policy.strictMapping) {
      return {
        allowed: false,
        callerRole,
        targetRole,
        reason: "Imperial workflow denied: unmapped delegation is forbidden when strict_mapping=true.",
      }
    }
    return { allowed: true, callerRole, targetRole }
  }

  const allowedTargets = policy.permissionMatrix[callerRole] ?? []
  if (!allowedTargets.includes(targetRole)) {
    return {
      allowed: false,
      callerRole,
      targetRole,
      reason: `Imperial workflow denied: ${callerRole} cannot delegate to ${targetRole}.`,
    }
  }

  if (callerRole === "zhongshu" && targetRole === "menxia") {
    const state = reviewStore.markReviewRequested(sessionID)
    if (state.reviewRounds > policy.maxReviewRound) {
      return {
        allowed: false,
        callerRole,
        targetRole,
        reason: `Imperial workflow denied: max review rounds exceeded (${policy.maxReviewRound}). Dispatch to shangshu or reset session.`,
      }
    }
    return { allowed: true, callerRole, targetRole }
  }

  if (callerRole === "menxia" && targetRole === "zhongshu") {
    reviewStore.markApproved(sessionID, reviewNote)
    return { allowed: true, callerRole, targetRole }
  }

  if (policy.strictReview && callerRole === "zhongshu" && targetRole === "shangshu") {
    const state = reviewStore.get(sessionID)
    if (!state.reviewed) {
      return {
        allowed: false,
        callerRole,
        targetRole,
        reason: "Imperial workflow denied: zhongshu must delegate to menxia for review before dispatching to shangshu.",
      }
    }
    if (policy.requireReviewNote && !state.reviewNote?.trim()) {
      return {
        allowed: false,
        callerRole,
        targetRole,
        reason: "Imperial workflow denied: review note is required before dispatching to shangshu.",
      }
    }
    reviewStore.consumeReview(sessionID)
  }

  return { allowed: true, callerRole, targetRole }
}
