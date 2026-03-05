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

  test("requires ministry return receipt before shangshu can close to done", () => {
    //#given
    const dir = createTempDir("dispatch-closure")
    const store = new ImperialTaskStateStore(dir)
    store.ensureTask("s-2", "dispatch closure")
    store.setState("s-2", "Review", "尚书省")

    //#when - try close directly without ministry receipt
    store.advanceFromDelegation({
      sessionID: "s-2",
      callerRole: "shangshu",
      targetRole: "zhongshu",
    })
    const blockedState = store.get("s-2")?.state

    // add receipt path: shangshu -> gongbu, then gongbu -> shangshu, then close
    store.advanceFromDelegation({
      sessionID: "s-2",
      callerRole: "shangshu",
      targetRole: "gongbu",
    })
    store.setState("s-2", "Doing", "工部")
    store.advanceFromDelegation({
      sessionID: "s-2",
      callerRole: "gongbu",
      targetRole: "shangshu",
    })
    store.setState("s-2", "Review", "尚书省")
    store.advanceFromDelegation({
      sessionID: "s-2",
      callerRole: "shangshu",
      targetRole: "zhongshu",
    })
    const closed = store.get("s-2")

    //#then
    expect(blockedState).toBe("Review")
    expect(closed?.state).toBe("Done")
    expect(closed?.dispatch?.consolidated).toBe(true)
    expect(closed?.dispatch?.assignments.some((item) => item.status === "returned")).toBe(true)

    rmSync(dir, { recursive: true, force: true })
  })
})
