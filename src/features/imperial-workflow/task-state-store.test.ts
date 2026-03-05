import { describe, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { ImperialTaskStateStore } from "./task-state-store"

function createTempDir(name: string): string {
  const dir = join(tmpdir(), `omo-imperial-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe("ImperialTaskStateStore", () => {
  test("persists and advances state based on delegation", () => {
    //#given
    const dir = createTempDir("state-store")
    const store = new ImperialTaskStateStore(dir)
    store.ensureTask("s-1", "test")

    //#when
    store.advanceFromDelegation({
      sessionID: "s-1",
      callerRole: "zhongshu",
      targetRole: "menxia",
    })
    store.advanceFromDelegation({
      sessionID: "s-1",
      callerRole: "menxia",
      targetRole: "zhongshu",
    })

    //#then
    const snapshot = store.get("s-1")
    expect(snapshot?.state).toBe("Zhongshu")

    rmSync(dir, { recursive: true, force: true })
  })
})
