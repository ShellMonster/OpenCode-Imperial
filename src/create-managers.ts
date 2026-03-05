import type { OhMyOpenCodeConfig } from "./config"
import type { ModelCacheState } from "./plugin-state"
import type { PluginContext, TmuxConfig } from "./plugin/types"

import type { SubagentSessionCreatedEvent } from "./features/background-agent"
import { BackgroundManager } from "./features/background-agent"
import { ImperialDashboardManager } from "./features/imperial-dashboard/manager"
import { SkillMcpManager } from "./features/skill-mcp-manager"
import { initTaskToastManager } from "./features/task-toast-manager"
import { TmuxSessionManager } from "./features/tmux-subagent"
import { createConfigHandler } from "./plugin-handlers"
import { log } from "./shared"

export type Managers = {
  tmuxSessionManager: TmuxSessionManager
  backgroundManager: BackgroundManager
  skillMcpManager: SkillMcpManager
  imperialDashboardManager: ImperialDashboardManager
  configHandler: ReturnType<typeof createConfigHandler>
}

export function createManagers(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
  tmuxConfig: TmuxConfig
  modelCacheState: ModelCacheState
  backgroundNotificationHookEnabled: boolean
}): Managers {
  const { ctx, pluginConfig, tmuxConfig, modelCacheState, backgroundNotificationHookEnabled } = args
  const dashboardConfig = pluginConfig.imperial_workflow?.dashboard
  const imperialDashboardManager = new ImperialDashboardManager(ctx.directory, {
    enabled: (pluginConfig.imperial_workflow?.enabled ?? false) && (dashboardConfig?.enabled ?? true),
    host: dashboardConfig?.host ?? "127.0.0.1",
    port: dashboardConfig?.port ?? 7897,
    refreshMs: dashboardConfig?.refresh_ms ?? 1500,
    authToken: dashboardConfig?.auth_token,
  })

  const tmuxSessionManager = new TmuxSessionManager(ctx, tmuxConfig)

  const backgroundManager = new BackgroundManager(
    ctx,
    pluginConfig.background_task,
    {
      tmuxConfig,
		onSubagentSessionCreated: async (event: SubagentSessionCreatedEvent) => {
			log("[index] onSubagentSessionCreated callback received", {
				sessionID: event.sessionID,
				parentID: event.parentID,
          title: event.title,
        })

        await tmuxSessionManager.onSessionCreated({
          type: "session.created",
          properties: {
            info: {
              id: event.sessionID,
              parentID: event.parentID,
              title: event.title,
            },
          },
        })

        log("[index] onSubagentSessionCreated callback completed")
      },
      onShutdown: () => {
        tmuxSessionManager.cleanup().catch((error) => {
          log("[index] tmux cleanup error during shutdown:", error)
        })
        imperialDashboardManager.stop()
      },
      enableParentSessionNotifications: backgroundNotificationHookEnabled,
    },
  )

  initTaskToastManager(ctx.client)

  const skillMcpManager = new SkillMcpManager()

  const configHandler = createConfigHandler({
    ctx: { directory: ctx.directory, client: ctx.client },
    pluginConfig,
    modelCacheState,
  })

  imperialDashboardManager.start()
  if (pluginConfig.imperial_workflow?.enabled && (dashboardConfig?.enabled ?? true)) {
    log("[index] imperial dashboard active", { url: imperialDashboardManager.url() })
  }

  return {
    tmuxSessionManager,
    backgroundManager,
    skillMcpManager,
    imperialDashboardManager,
    configHandler,
  }
}
