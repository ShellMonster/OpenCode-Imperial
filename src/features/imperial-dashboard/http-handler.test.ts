import { describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getImperialTaskFilePath } from "../imperial-workflow/task-state-file"
import { createImperialDashboardFetchHandler } from "./http-handler"

function fixtureDir(): string {
  const dir = join(tmpdir(), `omo-imperial-http-${Date.now()}`)
  const base = join(dir, ".opencode-imperial", "imperial-workflow")
  mkdirSync(base, { recursive: true })
  writeFileSync(
    join(base, "tasks.json"),
    JSON.stringify({
      tasks: {
        s1: {
          id: "task-1",
          sessionID: "s1",
          title: "Test",
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
  return dir
}

describe("imperial dashboard http handler", () => {
  test("returns snapshot json", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/snapshot"))

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { total: number; overview: { institutions: unknown[] }; funnel: unknown[] }
    expect(payload.total).toBe(1)
    expect(Array.isArray(payload.overview.institutions)).toBe(true)
    expect(Array.isArray(payload.funnel)).toBe(true)
  })

  test("returns html shell", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard"))

    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html.includes("Imperial Workflow Dashboard")).toBe(true)
    expect(html.includes("Institution Overview")).toBe(true)
    expect(html.includes("Officials Load")).toBe(true)
  })

  test("returns task detail", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1"))

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      task: { sessionID: string }
      institutional: { review: { pending: boolean }; dispatch: { assignedMinistries: string[] } }
    }
    expect(payload.task.sessionID).toBe("s1")
    expect(payload.institutional.review.pending).toBe(false)
    expect(Array.isArray(payload.institutional.dispatch.assignedMinistries)).toBe(true)
  })

  test("returns memorial summary", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/memorials/summary"))

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { totals: { tasks: number } }
    expect(payload.totals.tasks).toBe(1)
  })

  test("returns official detail", async () => {
    const dir = fixtureDir()
    writeFileSync(
      getImperialTaskFilePath(dir),
      JSON.stringify({
        tasks: {
          s1: {
            id: "task-1",
            sessionID: "s1",
            title: "Official detail",
            state: "Doing",
            org: "gongbu",
            reviewRound: 0,
            flowLog: [{ at: "2026-01-01T00:00:00.000Z", from: "shangshu", to: "gongbu", remark: "dispatch" }],
            progressLog: [{ at: "2026-01-01T00:00:10.000Z", agent: "gongbu", text: "working", state: "Doing" }],
            scheduler: {
              enabled: true,
              stallThresholdSec: 180,
              maxRetry: 1,
              retryCount: 0,
              escalationLevel: 0,
              lastProgressAt: "2026-01-01T00:00:10.000Z",
              stallSince: null,
              lastDispatchStatus: "success",
            },
            dispatch: {
              assignments: [
                { ministryRole: "gongbu", assignedAt: "2026-01-01T00:00:00.000Z", status: "assigned" },
              ],
              consolidated: false,
            },
            control: { status: "active", previousStatus: null, reason: null, updatedAt: "2026-01-01T00:00:10.000Z" },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:10.000Z",
          },
        },
      }),
      "utf8",
    )
    const handler = createImperialDashboardFetchHandler({ directory: dir, refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/officials/gongbu"))
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { role: string; summary: { assignedTasks: number } }
    expect(payload.role).toBe("gongbu")
    expect(payload.summary.assignedTasks).toBe(1)
  })

  test("returns session monitor", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/sessions/s1/monitor"))
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { sessionID: string; health: { status: string } }
    expect(payload.sessionID).toBe("s1")
    expect(typeof payload.health.status).toBe("string")
  })

  test("applies task action with strict transition", async () => {
    const dir = fixtureDir()
    const handler = createImperialDashboardFetchHandler({ directory: dir, refreshMs: 800 })

    const stopResponse = await handler(
      new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "stop", reason: "pause" }),
      }),
    )
    expect(stopResponse.status).toBe(200)

    const resumeResponse = await handler(
      new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      }),
    )
    expect(resumeResponse.status).toBe(200)

    const invalidResume = await handler(
      new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      }),
    )
    expect(invalidResume.status).toBe(400)

    const persisted = JSON.parse(readFileSync(getImperialTaskFilePath(dir), "utf8")) as {
      tasks: { s1: { control: { status: string } } }
    }
    expect(persisted.tasks.s1.control.status).toBe("active")
  })

  test("reads legacy task and audit files when new runtime path is absent", async () => {
    const dir = join(tmpdir(), `omo-imperial-http-legacy-${Date.now()}`)
    const legacyBase = join(dir, ".sisyphus", "imperial-workflow")
    mkdirSync(legacyBase, { recursive: true })
    writeFileSync(
      join(legacyBase, "tasks.json"),
      JSON.stringify({
        tasks: {
          legacy: {
            id: "task-legacy",
            sessionID: "legacy",
            title: "Legacy task",
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
    writeFileSync(
      join(legacyBase, "audit.jsonl"),
      `${JSON.stringify({ timestamp: "2026-01-01T00:00:00.000Z", sessionID: "legacy", allowed: true })}\n`,
      "utf8",
    )

    const handler = createImperialDashboardFetchHandler({ directory: dir, refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/snapshot"))

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { total: number; recentAudit: Array<{ sessionID: string }> }
    expect(payload.total).toBe(1)
    expect(payload.recentAudit[0]?.sessionID).toBe("legacy")
  })

  test("rejects unauthorized when token configured", async () => {
    const dir = fixtureDir()
    const handler = createImperialDashboardFetchHandler({ directory: dir, refreshMs: 800, authToken: "my-secret-token" })

    const denied = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/snapshot"))
    expect(denied.status).toBe(401)

    const allowed = await handler(
      new Request("http://127.0.0.1/imperial-dashboard/api/snapshot", {
        headers: { "x-imperial-token": "my-secret-token" },
      }),
    )
    expect(allowed.status).toBe(200)
  })

  test("calls runtime action bridge after successful action", async () => {
    const dir = fixtureDir()
    const calls: Array<{ action: string; sessionID: string }> = []
    const handler = createImperialDashboardFetchHandler({
      directory: dir,
      refreshMs: 800,
      onTaskAction: async ({ action, sessionID }) => {
        calls.push({ action, sessionID })
        return { ok: true, note: "runtime ok" }
      },
    })

    const response = await handler(
      new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      }),
    )

    expect(response.status).toBe(200)
    expect(calls).toHaveLength(1)
    expect(calls[0].action).toBe("stop")
    expect(calls[0].sessionID).toBe("s1")
  })
})
