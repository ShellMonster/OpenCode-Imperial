import { describe, expect, test } from "bun:test"
import { ImperialWorkflowConfigSchema } from "./imperial-workflow"

describe("ImperialWorkflowConfigSchema", () => {
  test("parses valid role map and permission matrix", () => {
    //#given
    const input = {
      enabled: true,
      strict_review: true,
      max_review_round: 3,
      stall_threshold_sec: 180,
      max_retry: 2,
      role_map: {
        prometheus: "zhongshu",
        momus: "menxia",
        atlas: "shangshu",
      },
      permission_matrix: {
        zhongshu: ["menxia", "shangshu"],
      },
    }

    //#when
    const parsed = ImperialWorkflowConfigSchema.parse(input)

    //#then
    expect(parsed.enabled).toBe(true)
    expect(parsed.role_map?.prometheus).toBe("zhongshu")
    expect(parsed.permission_matrix?.zhongshu).toEqual(["menxia", "shangshu"])
    expect(parsed.stall_threshold_sec).toBe(180)
    expect(parsed.max_retry).toBe(2)
  })

  test("throws when max_review_round is below minimum", () => {
    //#given
    const input = {
      enabled: true,
      max_review_round: 0,
    }

    //#when
    let thrown: unknown
    try {
      ImperialWorkflowConfigSchema.parse(input)
    } catch (error) {
      thrown = error
    }

    //#then
    expect(thrown).toBeDefined()
    expect((thrown as { issues?: Array<{ path?: string[] }> }).issues?.[0]?.path).toEqual(["max_review_round"])
  })

  test("parses dashboard runtime options", () => {
    //#given
    const input = {
      enabled: true,
      dashboard: {
        enabled: true,
        host: "127.0.0.1",
        port: 7897,
        refresh_ms: 1000,
        auth_token: "secret-token",
      },
    }

    //#when
    const parsed = ImperialWorkflowConfigSchema.parse(input)

    //#then
    expect(parsed.dashboard?.enabled).toBe(true)
    expect(parsed.dashboard?.port).toBe(7897)
    expect(parsed.dashboard?.refresh_ms).toBe(1000)
    expect(parsed.dashboard?.auth_token).toBe("secret-token")
  })
})
