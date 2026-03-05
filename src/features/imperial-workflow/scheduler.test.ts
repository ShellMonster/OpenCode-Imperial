import { describe, expect, test } from "bun:test"
import { evaluateTaskScheduler } from "./scheduler"
import type { ImperialTaskRecord } from "./task-types"

function createTask(overrides?: Partial<ImperialTaskRecord>): ImperialTaskRecord {
  return {
    id: "JJC-1",
    sessionID: "s-1",
    title: "test",
    state: "Doing",
    org: "工部",
    reviewRound: 1,
    flowLog: [],
    progressLog: [],
    scheduler: {
      enabled: true,
      stallThresholdSec: 180,
      maxRetry: 1,
      retryCount: 0,
      escalationLevel: 0,
      lastProgressAt: "2026-03-06T00:00:00.000Z",
      stallSince: null,
      lastDispatchStatus: "success",
    },
    createdAt: "2026-03-06T00:00:00.000Z",
    updatedAt: "2026-03-06T00:00:00.000Z",
    ...overrides,
  }
}

describe("imperial scheduler", () => {
  test("returns none when below threshold", () => {
    const task = createTask()
    const result = evaluateTaskScheduler(task, new Date("2026-03-06T00:02:00.000Z"))
    expect(result.type).toBe("none")
  })

  test("returns retry when stalled and retry remains", () => {
    const task = createTask()
    const result = evaluateTaskScheduler(task, new Date("2026-03-06T00:05:00.000Z"))
    expect(result.type).toBe("retry")
  })

  test("returns escalate when retries exhausted", () => {
    const task = createTask({ scheduler: { ...createTask().scheduler, retryCount: 1 } })
    const result = evaluateTaskScheduler(task, new Date("2026-03-06T00:05:00.000Z"))
    expect(result.type).toBe("escalate")
  })
})
