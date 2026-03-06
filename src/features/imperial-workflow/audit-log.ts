import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { log } from "../../shared/logger"
import type { ImperialRole } from "../../config/schema/imperial-workflow"
import { getImperialAuditFilePath } from "./task-state-file"

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

  const filePath = getImperialAuditFilePath(directory)
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
