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
      } as unknown as Parameters<typeof createImperialDashboardRuntimeLink>[1],
    )

    const result = await link({ action: "stop", sessionID: "main-1" })

    expect(result.ok).toBe(true)
    expect(cancelled).toEqual(["bg-1", "bg-2"])
    expect(aborted).toEqual(["main-1"])
  })
})
