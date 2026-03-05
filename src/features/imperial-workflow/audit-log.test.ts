import { describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { recordImperialAudit } from "./audit-log"

function createTempDir(name: string): string {
  const dir = join(tmpdir(), `omo-imperial-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe("recordImperialAudit", () => {
  test("writes jsonl audit entry", () => {
    //#given
    const dir = createTempDir("audit")
    const file = join(dir, ".sisyphus", "imperial-workflow", "audit.jsonl")

    //#when
    recordImperialAudit({
      timestamp: new Date().toISOString(),
      sessionID: "session-audit",
      callerAgent: "prometheus",
      targetAgent: "momus",
      callerRole: "zhongshu",
      targetRole: "menxia",
      allowed: true,
    }, dir)

    //#then
    expect(existsSync(file)).toBe(true)
    const content = readFileSync(file, "utf8")
    expect(content).toContain("\"sessionID\":\"session-audit\"")

    rmSync(dir, { recursive: true, force: true })
  })
})
