import type { PluginInput } from "@opencode-ai/plugin"
import { isGptModel } from "../../agents/types"
import { getSessionAgent, updateSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared"
import { getAgentConfigKey, getAgentDisplayName } from "../../shared/agent-display-names"

const TOAST_TITLE = "非 GPT 模型不要使用 工部(深度执行)"
const TOAST_MESSAGE = [
  "工部(深度执行) 是面向 GPT 系模型设计的执行官。",
  "离开 GPT 后，工部(深度执行) 的效果会明显下降。",
  "使用 Claude/Kimi/GLM 时，请切换到 太子(总管执行)。",
].join("\n")
const SISYPHUS_DISPLAY = getAgentDisplayName("sisyphus")

type NoHephaestusNonGptHookOptions = {
  allowNonGptModel?: boolean
}

function showToast(ctx: PluginInput, sessionID: string, variant: "error" | "warning"): void {
  ctx.client.tui.showToast({
    body: {
      title: TOAST_TITLE,
      message: TOAST_MESSAGE,
      variant,
      duration: 10000,
    },
  }).catch((error) => {
    log("[no-hephaestus-non-gpt] Failed to show toast", {
      sessionID,
      error,
    })
  })
}

export function createNoHephaestusNonGptHook(
  ctx: PluginInput,
  options?: NoHephaestusNonGptHookOptions,
) {
  return {
    "chat.message": async (input: {
      sessionID: string
      agent?: string
      model?: { providerID: string; modelID: string }
    }, output?: {
      message?: { agent?: string; [key: string]: unknown }
    }): Promise<void> => {
      const rawAgent = input.agent ?? getSessionAgent(input.sessionID) ?? ""
      const agentKey = getAgentConfigKey(rawAgent)
      const modelID = input.model?.modelID
      const allowNonGptModel = options?.allowNonGptModel === true

      if (agentKey === "hephaestus" && modelID && !isGptModel(modelID)) {
        showToast(ctx, input.sessionID, allowNonGptModel ? "warning" : "error")
        if (allowNonGptModel) {
          return
        }
        input.agent = SISYPHUS_DISPLAY
        if (output?.message) {
          output.message.agent = SISYPHUS_DISPLAY
        }
        updateSessionAgent(input.sessionID, SISYPHUS_DISPLAY)
      }
    },
  }
}
