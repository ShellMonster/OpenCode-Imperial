import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

const originalChildProcess = await import("node:child_process")
const originalModule = await import("node:module")

const spawnSyncMock = mock(() => ({ status: 0 }))
const resolveMock = mock(() => "/tmp/fake-binary")

mock.module("node:child_process", () => ({
  ...originalChildProcess,
  spawnSync: spawnSyncMock,
}))

mock.module("node:module", () => ({
  ...originalModule,
  createRequire: () => ({
    resolve: resolveMock,
  }),
}))

describe("opencode-imperial wrapper auto-install", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset()
    resolveMock.mockReset()
    delete process.env.OPENCODE_IMPERIAL_DISABLE_AUTO_INSTALL
  })

  afterEach(() => {
    delete process.env.OPENCODE_IMPERIAL_DISABLE_AUTO_INSTALL
  })

  test("tryInstallPlatformPackage installs via npm first", async () => {
    spawnSyncMock.mockReturnValue({ status: 0 })
    const { tryInstallPlatformPackage } = await import("./opencode-imperial-wrapper.js?wrapper-test-npm")

    const result = tryInstallPlatformPackage("opencode-imperial-darwin-arm64")

    expect(result).toBe(true)
    expect(spawnSyncMock).toHaveBeenCalledTimes(1)
    expect(spawnSyncMock.mock.calls[0]?.[0]).toBe("npm")
    expect(spawnSyncMock.mock.calls[0]?.[1]).toEqual([
      "install",
      "--no-save",
      "opencode-imperial-darwin-arm64",
    ])
  })

  test("tryInstallPlatformPackage falls back to bun when npm fails", async () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 1 })
      .mockReturnValueOnce({ status: 0 })
    const { tryInstallPlatformPackage } = await import("./opencode-imperial-wrapper.js?wrapper-test-bun")

    const result = tryInstallPlatformPackage("opencode-imperial-darwin-arm64")

    expect(result).toBe(true)
    expect(spawnSyncMock).toHaveBeenCalledTimes(2)
    expect(spawnSyncMock.mock.calls[0]?.[0]).toBe("npm")
    expect(spawnSyncMock.mock.calls[1]?.[0]).toBe("bun")
  })

  test("tryInstallPlatformPackage respects disable flag", async () => {
    process.env.OPENCODE_IMPERIAL_DISABLE_AUTO_INSTALL = "1"
    const { tryInstallPlatformPackage } = await import("./opencode-imperial-wrapper.js?wrapper-test-disabled")

    const result = tryInstallPlatformPackage("opencode-imperial-darwin-arm64")

    expect(result).toBe(false)
    expect(spawnSyncMock).not.toHaveBeenCalled()
  })
})
