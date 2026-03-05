import { describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createImperialDashboardFetchHandler } from "./http-handler"

function fixtureDir(): string {
  const dir = join(tmpdir(), `omo-imperial-http-${Date.now()}`)
  const base = join(dir, ".sisyphus", "imperial-workflow")
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
    const payload = (await response.json()) as { total: number }
    expect(payload.total).toBe(1)
  })

  test("returns html shell", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard"))

    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html.includes("Imperial Workflow Dashboard")).toBe(true)
  })

  test("returns task detail", async () => {
    const handler = createImperialDashboardFetchHandler({ directory: fixtureDir(), refreshMs: 800 })
    const response = await handler(new Request("http://127.0.0.1/imperial-dashboard/api/tasks/s1"))

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { task: { sessionID: string } }
    expect(payload.task.sessionID).toBe("s1")
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

    const persisted = JSON.parse(readFileSync(join(dir, ".sisyphus", "imperial-workflow", "tasks.json"), "utf8")) as {
      tasks: { s1: { control: { status: string } } }
    }
    expect(persisted.tasks.s1.control.status).toBe("active")
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
