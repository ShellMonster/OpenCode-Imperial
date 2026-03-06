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
  private actualPort: number

  constructor(directory: string, config: ImperialDashboardRuntimeConfig) {
    this.directory = directory
    this.config = config
    this.actualPort = buildDashboardPortCandidates(directory, config.port)[0] ?? config.port
  }

  start(): void {
    if (!this.config.enabled || this.server) return

    const fetch = createImperialDashboardFetchHandler({
      directory: this.directory,
      refreshMs: this.config.refreshMs,
      authToken: this.config.authToken,
      onTaskAction: this.config.onTaskAction,
    })

    const candidatePorts = buildDashboardPortCandidates(this.directory, this.config.port)
    for (const port of candidatePorts) {
      try {
        this.server = Bun.serve({
          hostname: this.config.host,
          port,
          fetch,
        })
        this.actualPort = port
        break
      } catch (error) {
        log("[imperial-dashboard] failed to bind candidate port", {
          host: this.config.host,
          port,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (!this.server) {
      log("[imperial-dashboard] failed to start", {
        host: this.config.host,
        port: this.config.port,
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
    return `http://${this.config.host}:${this.actualPort}/imperial-dashboard`
  }
}

export function deriveImperialDashboardPort(directory: string, basePort = 7897): number {
  let hash = 0
  for (const char of directory) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return basePort + (hash % 200)
}

function buildDashboardPortCandidates(directory: string, requestedPort: number): number[] {
  const isDefaultPort = requestedPort === 7897
  const first = isDefaultPort ? deriveImperialDashboardPort(directory, requestedPort) : requestedPort
  const candidates = [first]
  for (let i = 1; i <= 12; i += 1) {
    const next = first + i
    if (next <= 65535) candidates.push(next)
  }
  if (isDefaultPort && !candidates.includes(requestedPort)) {
    candidates.push(requestedPort)
  }
  return candidates
}
