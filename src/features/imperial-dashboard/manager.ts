import { createImperialDashboardFetchHandler } from "./http-handler"
import { log } from "../../shared/logger"

export type ImperialDashboardRuntimeConfig = {
  enabled: boolean
  host: string
  port: number
  refreshMs: number
  authToken?: string
  onTaskAction?: (input: { action: "stop" | "cancel" | "resume"; sessionID: string; reason?: string }) => Promise<{
    ok: boolean
    note: string
  }>
}

export class ImperialDashboardManager {
  private readonly directory: string
  private readonly config: ImperialDashboardRuntimeConfig
  private server?: ReturnType<typeof Bun.serve>

  constructor(directory: string, config: ImperialDashboardRuntimeConfig) {
    this.directory = directory
    this.config = config
  }

  start(): void {
    if (!this.config.enabled || this.server) return

    const fetch = createImperialDashboardFetchHandler({
      directory: this.directory,
      refreshMs: this.config.refreshMs,
      authToken: this.config.authToken,
      onTaskAction: this.config.onTaskAction,
    })

    try {
      this.server = Bun.serve({
        hostname: this.config.host,
        port: this.config.port,
        fetch,
      })
    } catch (error) {
      log("[imperial-dashboard] failed to start", {
        host: this.config.host,
        port: this.config.port,
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }

    log("[imperial-dashboard] server started", {
      url: this.url(),
    })
  }

  stop(): void {
    if (!this.server) return
    this.server.stop(true)
    this.server = undefined
    log("[imperial-dashboard] server stopped")
  }

  url(): string {
    return `http://${this.config.host}:${this.config.port}/imperial-dashboard`
  }
}
