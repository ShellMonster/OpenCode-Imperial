import type { PluginInput } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../background-agent"

type RuntimeAction = "stop" | "cancel" | "resume"

export type RuntimeActionResult = {
  ok: boolean
  note: string
}

export function createImperialDashboardRuntimeLink(ctx: PluginInput, backgroundManager: BackgroundManager) {
  return async (input: { action: RuntimeAction; sessionID: string; reason?: string }): Promise<RuntimeActionResult> => {
    const { action, sessionID, reason } = input

    if (action === "resume") {
      return {
        ok: true,
        note: "resume currently updates governance state only; runtime resume is not auto-triggered",
      }
    }

    const descendants = backgroundManager.getAllDescendantTasks(sessionID)
    let cancelled = 0
    for (const task of descendants) {
      const done = await backgroundManager.cancelTask(task.id, {
        source: `imperial-dashboard-${action}`,
        reason: reason ?? `dashboard ${action}`,
        abortSession: true,
        skipNotification: true,
      })
      if (done) cancelled += 1
    }

    let parentAborted = false
    try {
      await ctx.client.session.abort({ path: { id: sessionID } })
      parentAborted = true
    } catch {
      parentAborted = false
    }

    return {
      ok: true,
      note: `runtime bridge: cancelled ${cancelled} descendant task(s), parent aborted=${parentAborted}`,
    }
  }
}
