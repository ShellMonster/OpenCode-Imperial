import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { buildImperialDashboardSnapshot, buildImperialTaskDetail } from "./snapshot"

function setupFixture(name: string): string {
  const dir = join(tmpdir(), `omo-imperial-dashboard-${name}-${Date.now()}`)
  const base = join(dir, ".sisyphus", "imperial-workflow")
  mkdirSync(base, { recursive: true })

  writeFileSync(
    join(base, "tasks.json"),
    JSON.stringify(
      {
        tasks: {
          s1: {
            id: "task-1",
            sessionID: "s1",
            title: "Build dashboard",
            state: "Doing",
            org: "工部",
            reviewRound: 1,
            flowLog: [{ at: "2026-01-01T00:00:00.000Z", from: "尚书省", to: "工部", remark: "派发" }],
            progressLog: [{ at: "2026-01-01T00:01:00.000Z", agent: "gongbu", text: "coding", state: "Doing" }],
            scheduler: {
              enabled: true,
              stallThresholdSec: 180,
              maxRetry: 1,
              retryCount: 0,
              escalationLevel: 0,
              lastProgressAt: "2026-01-01T00:01:00.000Z",
              stallSince: null,
              lastDispatchStatus: "success",
            },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:01:00.000Z",
          },
          s2: {
            id: "task-2",
            sessionID: "s2",
            title: "Review policy",
            state: "Menxia",
            org: "门下省",
            reviewRound: 2,
            flowLog: [],
            progressLog: [],
            scheduler: {
              enabled: true,
              stallThresholdSec: 180,
              maxRetry: 1,
              retryCount: 1,
              escalationLevel: 1,
              lastProgressAt: "2026-01-01T00:02:00.000Z",
              stallSince: "2026-01-01T00:03:00.000Z",
              lastDispatchStatus: "timeout",
            },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:03:00.000Z",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  )

  writeFileSync(
    join(base, "audit.jsonl"),
    [
      JSON.stringify({ timestamp: "2026-01-01T00:00:00.000Z", sessionID: "s1", allowed: true }),
      JSON.stringify({ timestamp: "2026-01-01T00:00:02.000Z", sessionID: "s2", allowed: false, reason: "blocked" }),
    ].join("\n") + "\n",
    "utf8",
  )

  return dir
}

describe("imperial dashboard snapshot", () => {
  test("builds overview and state aggregates", () => {
    const dir = setupFixture("snapshot")
    const snapshot = buildImperialDashboardSnapshot(dir)

    expect(snapshot.total).toBe(2)
    expect(snapshot.byState.Doing).toBe(1)
    expect(snapshot.byState.Menxia).toBe(1)
    expect(snapshot.tasks[0].updatedAt >= snapshot.tasks[1].updatedAt).toBe(true)
    expect(snapshot.recentAudit.length).toBe(2)
  })

  test("builds task detail with merged activity", () => {
    const dir = setupFixture("detail")
    const detail = buildImperialTaskDetail(dir, "s1")

    expect(detail?.task.sessionID).toBe("s1")
    expect(detail?.activity.length).toBe(2)
    expect(detail?.activity[0].kind).toBe("flow")
    expect(detail?.activity[1].kind).toBe("progress")
  })
})
