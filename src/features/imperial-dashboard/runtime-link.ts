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
      const descendants = backgroundManager.getAllDescendantTasks(sessionID)
      const resumable = descendants.filter(
        (task) =>
          Boolean(task.sessionID) &&
          (task.status === "cancelled" || task.status === "interrupt" || task.status === "error"),
      )
      let resumed = 0
      for (const task of resumable) {
        try {
          await backgroundManager.resume({
            sessionId: task.sessionID!,
            prompt: reason?.trim() || "Resume task execution after dashboard resume action.",
            parentSessionID: sessionID,
            parentMessageID: task.parentMessageID || "",
            parentModel: task.parentModel,
            parentAgent: task.parentAgent,
            parentTools: task.parentTools,
          })
          resumed += 1
        } catch {
          continue
        }
      }
      return {
        ok: true,
        note: `runtime bridge: resumed ${resumed} descendant task(s)`,
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
