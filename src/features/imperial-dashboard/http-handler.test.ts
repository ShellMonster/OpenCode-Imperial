import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
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
})
