import { appendFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { log } from "../../shared/logger"
import type { ImperialRole } from "../../config/schema/imperial-workflow"

export type ImperialAuditRecord = {
  timestamp: string
  sessionID: string
  callerAgent?: string
  targetAgent?: string
  callerRole?: ImperialRole
  targetRole?: ImperialRole
  allowed: boolean
  reason?: string
}

export function recordImperialAudit(input: ImperialAuditRecord, directory?: string): void {
  log("[imperial-workflow] delegation audit", input)
  if (!directory) return

  const filePath = join(directory, ".sisyphus", "imperial-workflow", "audit.jsonl")
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    appendFileSync(filePath, `${JSON.stringify(input)}\n`, "utf8")
  } catch (error) {
    log("[imperial-workflow] audit persistence skipped", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
