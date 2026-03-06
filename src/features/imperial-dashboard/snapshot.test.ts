import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  buildImperialDashboardSnapshot,
  buildImperialMemorialSummary,
  buildImperialOfficialDetail,
  buildImperialSessionMonitor,
  buildImperialTaskDetail,
} from "./snapshot"

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
            review: {
              pending: false,
              requestedAt: "2026-01-01T00:00:10.000Z",
              requestedBy: "zhongshu",
              approvedAt: "2026-01-01T00:00:20.000Z",
              approvedBy: "menxia",
              note: "准奏",
            },
            dispatch: {
              assignments: [
                {
                  ministryRole: "gongbu",
                  assignedAt: "2026-01-01T00:00:30.000Z",
                  returnedAt: "2026-01-01T00:01:00.000Z",
                  returnedBy: "gongbu",
                  returnNote: "implementation complete",
                  status: "returned",
                },
              ],
              consolidated: true,
              consolidatedAt: "2026-01-01T00:01:10.000Z",
              consolidatedBy: "shangshu",
              consolidatedNote: "ready for zhongshu memorial",
            },
            control: {
              status: "active",
              previousStatus: null,
              reason: null,
              updatedAt: "2026-01-01T00:01:00.000Z",
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
            control: {
              status: "stopped",
              previousStatus: "active",
              reason: "wait",
              updatedAt: "2026-01-01T00:03:00.000Z",
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
    expect(snapshot.byControl.active).toBe(1)
    expect(snapshot.byControl.stopped).toBe(1)
    expect(snapshot.overview.institutions.find((item) => item.name === "工部")?.total).toBe(1)
    expect(snapshot.funnel.find((item) => item.state === "Doing")?.count).toBe(1)
    expect(snapshot.bottlenecks.stoppedTasks).toBe(1)
    expect(snapshot.bottlenecks.timedOutTasks).toBe(1)
    expect(snapshot.officials.find((item) => item.role === "gongbu")?.returnedAssignments).toBe(1)
  })

  test("builds task detail with merged activity", () => {
    const dir = setupFixture("detail")
    const detail = buildImperialTaskDetail(dir, "s1")

    expect(detail?.task.sessionID).toBe("s1")
    expect(detail?.activity.length).toBe(2)
    expect(detail?.activity[0].kind).toBe("flow")
    expect(detail?.activity[1].kind).toBe("progress")
    expect(detail?.institutional.review.note).toBe("准奏")
    expect(detail?.institutional.dispatch.returnedMinistries).toContain("gongbu")
    expect(detail?.institutional.dispatch.consolidatedNote).toBe("ready for zhongshu memorial")
  })

  test("builds official detail with owned tasks and assignments", () => {
    const dir = setupFixture("official-detail")
    const detail = buildImperialOfficialDetail(dir, "gongbu")
    expect(detail?.role).toBe("gongbu")
    expect(detail?.summary.assignedTasks).toBe(1)
    expect(detail?.assignments[0]?.sessionID).toBe("s1")
    expect(detail?.recentActivity.some((item) => item.kind === "progress")).toBe(true)
  })

  test("builds session monitor with health blockers", () => {
    const dir = setupFixture("session-monitor")
    const monitor = buildImperialSessionMonitor(dir, "s2")
    expect(monitor?.sessionID).toBe("s2")
    expect(monitor?.health.status).toBe("blocked")
    expect(monitor?.health.blockers.some((item) => item.includes("timeout"))).toBe(true)
  })

  test("filters by control and search query", () => {
    const dir = setupFixture("filter")
    const snapshot = buildImperialDashboardSnapshot(dir, { control: "stopped", q: "review" })
    expect(snapshot.total).toBe(1)
    expect(snapshot.tasks[0].sessionID).toBe("s2")
  })

  test("builds bottleneck items for stalled and pending review tasks", () => {
    const dir = setupFixture("bottlenecks")
    const base = join(dir, ".sisyphus", "imperial-workflow")
    writeFileSync(
      join(base, "tasks.json"),
      JSON.stringify(
        {
          tasks: {
            b1: {
              id: "task-b1",
              sessionID: "b1",
              title: "Pending memorial review",
              state: "Menxia",
              org: "门下省",
              reviewRound: 1,
              flowLog: [],
              progressLog: [],
              scheduler: {
                enabled: true,
                stallThresholdSec: 180,
                maxRetry: 1,
                retryCount: 0,
                escalationLevel: 2,
                lastProgressAt: "2026-01-03T00:01:00.000Z",
                stallSince: "2026-01-03T00:02:00.000Z",
                lastDispatchStatus: "timeout",
              },
              review: {
                pending: true,
                requestedBy: "zhongshu",
              },
              dispatch: {
                assignments: [
                  {
                    ministryRole: "hubu",
                    assignedAt: "2026-01-03T00:00:00.000Z",
                    status: "assigned",
                  },
                ],
                consolidated: false,
              },
              control: {
                status: "active",
                previousStatus: null,
                reason: null,
                updatedAt: "2026-01-03T00:02:00.000Z",
              },
              createdAt: "2026-01-03T00:00:00.000Z",
              updatedAt: "2026-01-03T00:02:00.000Z",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    )

    const snapshot = buildImperialDashboardSnapshot(dir)
    expect(snapshot.bottlenecks.items).toHaveLength(1)
    expect(snapshot.bottlenecks.items[0]?.reason).toContain("review pending")
    expect(snapshot.bottlenecks.items[0]?.reason).toContain("dispatch timeout")
    expect(snapshot.officials.find((item) => item.role === "hubu")?.outstandingAssignments).toBe(1)
  })

  test("builds memorial summary metrics", () => {
    const dir = setupFixture("memorial")
    const summary = buildImperialMemorialSummary(dir)
    expect(summary.totals.tasks).toBe(2)
    expect(summary.dispatch.consolidatedTasks).toBeGreaterThanOrEqual(0)
    expect(summary.review.maxReviewRound).toBe(2)
    expect(summary.memorials).toHaveLength(0)
  })

  test("builds memorial entries for completed work", () => {
    const dir = setupFixture("memorial-done")
    const base = join(dir, ".sisyphus", "imperial-workflow")
    writeFileSync(
      join(base, "tasks.json"),
      JSON.stringify(
        {
          tasks: {
            done1: {
              id: "task-done-1",
              sessionID: "done1",
              title: "Ship imperial dashboard",
              state: "Done",
              org: "中书省",
              reviewRound: 2,
              flowLog: [],
              progressLog: [],
              scheduler: {
                enabled: true,
                stallThresholdSec: 180,
                maxRetry: 1,
                retryCount: 0,
                escalationLevel: 0,
                lastProgressAt: "2026-01-02T00:01:00.000Z",
                stallSince: null,
                lastDispatchStatus: "success",
              },
              review: {
                pending: false,
                note: "准奏后执行",
              },
              dispatch: {
                assignments: [
                  {
                    ministryRole: "gongbu",
                    assignedAt: "2026-01-02T00:00:30.000Z",
                    returnedAt: "2026-01-02T00:01:00.000Z",
                    returnedBy: "gongbu",
                    returnNote: "dashboard shipped",
                    status: "returned",
                  },
                ],
                consolidated: true,
                consolidatedAt: "2026-01-02T00:01:10.000Z",
                consolidatedBy: "shangshu",
                consolidatedNote: "ready to memorialize",
              },
              control: {
                status: "active",
                previousStatus: null,
                reason: null,
                updatedAt: "2026-01-02T00:01:10.000Z",
              },
              createdAt: "2026-01-02T00:00:00.000Z",
              updatedAt: "2026-01-02T00:01:10.000Z",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    )

    const summary = buildImperialMemorialSummary(dir)
    expect(summary.memorials).toHaveLength(1)
    expect(summary.memorials[0]?.title).toBe("Ship imperial dashboard")
    expect(summary.memorials[0]?.summary).toContain("gongbu")
    expect(summary.memorials[0]?.summary).toContain("准奏后执行")
  })
})
