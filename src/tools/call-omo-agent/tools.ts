import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import { ALLOWED_AGENTS, CALL_OMO_AGENT_DESCRIPTION } from "./constants"
import type { AllowedAgentType, CallOmoAgentArgs, ToolContextWithMetadata } from "./types"
import type { BackgroundManager } from "../../features/background-agent"
import { log } from "../../shared"
import { executeBackground } from "./background-executor"
import { executeSync } from "./sync-executor"
import type { ImperialWorkflowConfig } from "../../config/schema/imperial-workflow"
import {
  createImperialWorkflowPolicy,
  evaluateImperialDelegation,
  ImperialSessionReviewStore,
  getImperialTaskStateStore,
  recordImperialAudit,
} from "../../features/imperial-workflow"

export function createCallOmoAgent(
  ctx: PluginInput,
  backgroundManager: BackgroundManager,
  disabledAgents: string[] = [],
  imperialWorkflow?: ImperialWorkflowConfig,
  imperialReviewStore?: ImperialSessionReviewStore,
): ToolDefinition {
  const imperialPolicy = createImperialWorkflowPolicy(imperialWorkflow)
  const reviewStore = imperialReviewStore ?? new ImperialSessionReviewStore()
  const taskStateStore = getImperialTaskStateStore(ctx.directory)
  const agentDescriptions = ALLOWED_AGENTS.map(
    (name) => `- ${name}: Specialized agent for ${name} tasks`
  ).join("\n")
  const description = CALL_OMO_AGENT_DESCRIPTION.replace("{agents}", agentDescriptions)

  return tool({
    description,
    args: {
      description: tool.schema.string().describe("A short (3-5 words) description of the task"),
      prompt: tool.schema.string().describe("The task for the agent to perform"),
      subagent_type: tool.schema
        .string()
        .describe("The type of specialized agent to use for this task (explore or librarian only)"),
      run_in_background: tool.schema
        .boolean()
        .describe("REQUIRED. true: run asynchronously (use background_output to get results), false: run synchronously and wait for completion"),
      session_id: tool.schema.string().describe("Existing Task session to continue").optional(),
    },
    async execute(args: CallOmoAgentArgs, toolContext) {
      const toolCtx = toolContext as ToolContextWithMetadata
      log(`[call_omo_agent] Starting with agent: ${args.subagent_type}, background: ${args.run_in_background}`)

      // Case-insensitive agent validation - allows "Explore", "EXPLORE", "explore" etc.
      if (
        !ALLOWED_AGENTS.some(
          (name) => name.toLowerCase() === args.subagent_type.toLowerCase(),
        )
      ) {
        return `Error: Invalid agent type "${args.subagent_type}". Only ${ALLOWED_AGENTS.join(", ")} are allowed.`
      }

      const normalizedAgent = args.subagent_type.toLowerCase() as AllowedAgentType
      args = { ...args, subagent_type: normalizedAgent }
      if (imperialPolicy.enabled) {
        taskStateStore.ensureTask(toolCtx.sessionID, args.description, {
          stallThresholdSec: imperialWorkflow?.stall_threshold_sec,
          maxRetry: imperialWorkflow?.max_retry,
        })
      }

      const imperialDecision = evaluateImperialDelegation({
        policy: imperialPolicy,
        reviewStore,
        sessionID: toolCtx.sessionID,
        callerAgent: toolCtx.agent,
        targetAgent: normalizedAgent,
      })
      recordImperialAudit(
        {
          timestamp: new Date().toISOString(),
          sessionID: toolCtx.sessionID,
          callerAgent: toolCtx.agent,
          targetAgent: normalizedAgent,
          callerRole: imperialDecision.callerRole,
          targetRole: imperialDecision.targetRole,
          allowed: imperialDecision.allowed,
          reason: imperialDecision.reason,
        },
        ctx.directory,
      )
      if (!imperialDecision.allowed) {
        return imperialDecision.reason ?? "Imperial workflow denied this delegation."
      }
      if (imperialPolicy.enabled && imperialDecision.callerRole && imperialDecision.targetRole) {
        taskStateStore.advanceFromDelegation({
          sessionID: toolCtx.sessionID,
          callerRole: imperialDecision.callerRole,
          targetRole: imperialDecision.targetRole,
          callerAgent: toolCtx.agent,
          targetAgent: normalizedAgent,
        })
        taskStateStore.appendProgress(
          toolCtx.sessionID,
          toolCtx.agent,
          `delegated call_omo_agent to ${normalizedAgent}`,
        )
        log("[call_omo_agent] imperial delegation decision", {
          sessionID: toolCtx.sessionID,
          callerAgent: toolCtx.agent,
          targetAgent: normalizedAgent,
          callerRole: imperialDecision.callerRole,
          targetRole: imperialDecision.targetRole,
          allowed: imperialDecision.allowed,
        })
      }

      // Check if agent is disabled
      if (disabledAgents.some((disabled) => disabled.toLowerCase() === normalizedAgent)) {
        return `Error: Agent "${normalizedAgent}" is disabled via disabled_agents configuration. Remove it from disabled_agents in your oh-my-opencode.json to use it.`
      }

      if (args.run_in_background) {
        if (args.session_id) {
          return `Error: session_id is not supported in background mode. Use run_in_background=false to continue an existing session.`
        }
        return await executeBackground(args, toolCtx, backgroundManager, ctx.client)
      }

      return await executeSync(args, toolCtx, ctx)
    },
  })
}
