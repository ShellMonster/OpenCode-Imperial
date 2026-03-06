import { describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { ImperialTaskStateStore } from "./task-state-store"
import { getLegacyImperialTaskFilePath, getImperialTaskFilePath } from "./task-state-file"

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

  test("persists menxia review note and ministry return receipt details", () => {
    //#given
    const dir = createTempDir("review-receipt")
    const store = new ImperialTaskStateStore(dir)
    store.ensureTask("s-3", "review receipt")

    //#when
    store.advanceFromDelegation({
      sessionID: "s-3",
      callerRole: "zhongshu",
      targetRole: "menxia",
      callerAgent: "zhongshu",
      targetAgent: "menxia",
      note: "submit plan for seal review",
    })
    store.advanceFromDelegation({
      sessionID: "s-3",
      callerRole: "menxia",
      targetRole: "zhongshu",
      callerAgent: "menxia",
      targetAgent: "zhongshu",
      note: "approved for dispatch",
    })
    store.advanceFromDelegation({
      sessionID: "s-3",
      callerRole: "zhongshu",
      targetRole: "shangshu",
      callerAgent: "zhongshu",
      targetAgent: "shangshu",
      note: "forward to execution",
    })
    store.advanceFromDelegation({
      sessionID: "s-3",
      callerRole: "shangshu",
      targetRole: "gongbu",
      callerAgent: "shangshu",
      targetAgent: "gongbu",
      note: "implement runtime entry",
    })
    store.setState("s-3", "Doing", "工部")
    store.advanceFromDelegation({
      sessionID: "s-3",
      callerRole: "gongbu",
      targetRole: "shangshu",
      callerAgent: "gongbu",
      targetAgent: "shangshu",
      note: "runtime entry completed",
    })

    //#then
    const snapshot = store.get("s-3")
    expect(snapshot?.review?.approvedBy).toBe("menxia")
    expect(snapshot?.review?.note).toBe("approved for dispatch")
    expect(snapshot?.dispatch?.assignments[0]?.status).toBe("returned")
    expect(snapshot?.dispatch?.assignments[0]?.returnedBy).toBe("gongbu")
    expect(snapshot?.dispatch?.assignments[0]?.returnNote).toBe("runtime entry completed")

    rmSync(dir, { recursive: true, force: true })
  })

  test("preserves concurrent writes from multiple store instances in same workspace", () => {
    //#given
    const dir = createTempDir("concurrent-store")
    const storeA = new ImperialTaskStateStore(dir)
    const storeB = new ImperialTaskStateStore(dir)
    storeA.ensureTask("s-4", "shared session")

    //#when
    storeA.appendProgress("s-4", "agent-a", "progress from A")
    storeB.appendProgress("s-4", "agent-b", "progress from B")
    storeA.appendFlow("s-4", "A", "B", "flow from A")
    storeB.appendFlow("s-4", "B", "C", "flow from B")

    //#then
    const snapshot = new ImperialTaskStateStore(dir).get("s-4")
    expect(snapshot?.progressLog.some((entry) => entry.agent === "agent-a")).toBe(true)
    expect(snapshot?.progressLog.some((entry) => entry.agent === "agent-b")).toBe(true)
    expect(snapshot?.flowLog.some((entry) => entry.remark === "flow from A")).toBe(true)
    expect(snapshot?.flowLog.some((entry) => entry.remark === "flow from B")).toBe(true)

    rmSync(dir, { recursive: true, force: true })
  })

  test("reads legacy task state when new runtime path does not exist", () => {
    //#given
    const dir = createTempDir("legacy-read")
    const legacyFile = getLegacyImperialTaskFilePath(dir)
    mkdirSync(join(dir, ".sisyphus", "imperial-workflow"), { recursive: true })
    writeFileSync(
      legacyFile,
      JSON.stringify({
        tasks: {
          "legacy-session": {
            id: "task-legacy",
            sessionID: "legacy-session",
            title: "Legacy state",
            state: "Pending",
            org: "太子",
            reviewRound: 0,
            flowLog: [],
            progressLog: [],
            scheduler: {
              enabled: true,
              stallThresholdSec: 180,
              maxRetry: 1,
              retryCount: 0,
              escalationLevel: 0,
              lastProgressAt: "2026-01-01T00:00:00.000Z",
              stallSince: null,
              lastDispatchStatus: "queued",
            },
            control: {
              status: "active",
              previousStatus: null,
              reason: null,
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
      "utf8",
    )

    //#when
    const store = new ImperialTaskStateStore(dir)
    const task = store.get("legacy-session")

    //#then
    expect(task?.title).toBe("Legacy state")
    expect(getImperialTaskFilePath(dir)).toContain(".opencode-imperial")

    rmSync(dir, { recursive: true, force: true })
  })
})
