import { describe, expect, test } from "bun:test"
import { deriveImperialDashboardPort, ImperialDashboardManager } from "./manager"

describe("ImperialDashboardManager", () => {
  test("derives stable workspace-specific port from directory", () => {
    const portA1 = deriveImperialDashboardPort("/tmp/project-a")
    const portA2 = deriveImperialDashboardPort("/tmp/project-a")
    const portB = deriveImperialDashboardPort("/tmp/project-b")

    expect(portA1).toBe(portA2)
    expect(portA1).not.toBe(portB)
    expect(portA1).toBeGreaterThanOrEqual(7897)
  })

  test("uses derived port in url when default port is requested", () => {
    const manager = new ImperialDashboardManager("/tmp/project-url", {
      enabled: true,
      host: "127.0.0.1",
      port: 7897,
      refreshMs: 1500,
    })

    expect(manager.url()).toContain(String(deriveImperialDashboardPort("/tmp/project-url")))
  })
})
