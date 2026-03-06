import type { PluginInput } from "@opencode-ai/plugin"
import { PLUGIN_DISPLAY_NAME } from "../../../shared/branding"
import { log } from "../../../shared/logger"

export async function showUpdateAvailableToast(
  ctx: PluginInput,
  latestVersion: string,
  getToastMessage: (isUpdate: boolean, latestVersion?: string) => string
): Promise<void> {
  await ctx.client.tui
    .showToast({
      body: {
        title: `${PLUGIN_DISPLAY_NAME} ${latestVersion}`,
        message: getToastMessage(true, latestVersion),
        variant: "info" as const,
        duration: 8000,
      },
    })
    .catch(() => {})
  log(`[auto-update-checker] Update available toast shown: v${latestVersion}`)
}

export async function showAutoUpdatedToast(ctx: PluginInput, oldVersion: string, newVersion: string): Promise<void> {
  await ctx.client.tui
    .showToast({
      body: {
        title: `${PLUGIN_DISPLAY_NAME} Updated!`,
        message: `v${oldVersion} → v${newVersion}\nRestart OpenCode to apply.`,
        variant: "success" as const,
        duration: 8000,
      },
    })
    .catch(() => {})
  log(`[auto-update-checker] Auto-updated toast shown: v${oldVersion} → v${newVersion}`)
}
