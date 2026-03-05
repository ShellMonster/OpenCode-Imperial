import { describe, expect, test } from "bun:test"
import { createImperialDashboardRuntimeLink } from "./runtime-link"

describe("imperial dashboard runtime link", () => {
  test("stops parent session and descendant background tasks", async () => {
    const cancelled: string[] = []
    const aborted: string[] = []

    const link = createImperialDashboardRuntimeLink(
      {
        client: {
          session: {
            abort: async ({ path }: { path: { id: string } }) => {
              aborted.push(path.id)
              return {}
            },
          },
        },
      } as unknown as Parameters<typeof createImperialDashboardRuntimeLink>[0],
      {
        getAllDescendantTasks: () => [
          { id: "bg-1" },
          { id: "bg-2" },
        ],
        cancelTask: async (taskId: string) => {
          cancelled.push(taskId)
          return true
        },
        resume: async () => ({}),
      } as unknown as Parameters<typeof createImperialDashboardRuntimeLink>[1],
    )

    const result = await link({ action: "stop", sessionID: "main-1" })

    expect(result.ok).toBe(true)
    expect(cancelled).toEqual(["bg-1", "bg-2"])
    expect(aborted).toEqual(["main-1"])
  })

  test("resumes interrupted descendant tasks", async () => {
    const resumed: string[] = []
    const link = createImperialDashboardRuntimeLink(
      {
        client: {
          session: {
            abort: async () => ({}),
          },
        },
      } as unknown as Parameters<typeof createImperialDashboardRuntimeLink>[0],
      {
        getAllDescendantTasks: () => [
          { id: "bg-1", sessionID: "ses-1", status: "cancelled", parentMessageID: "m1" },
          { id: "bg-2", sessionID: "ses-2", status: "completed", parentMessageID: "m2" },
          { id: "bg-3", sessionID: "ses-3", status: "interrupt", parentMessageID: "m3" },
        ],
        cancelTask: async () => true,
        resume: async (input: { sessionId: string }) => {
          resumed.push(input.sessionId)
          return {} as never
        },
      } as unknown as Parameters<typeof createImperialDashboardRuntimeLink>[1],
    )

    const result = await link({ action: "resume", sessionID: "main-2", reason: "continue" })

    expect(result.ok).toBe(true)
    expect(resumed).toEqual(["ses-1", "ses-3"])
  })
})
