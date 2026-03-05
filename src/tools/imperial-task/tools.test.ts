import { describe, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createImperialTaskActivityTool } from "./tools"
import { getImperialTaskStateStore } from "../../features/imperial-workflow"

function createTempDir(name: string): string {
  const dir = join(tmpdir(), `omo-imperial-tool-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe("imperial_task_activity tool", () => {
  test("returns task snapshot and activity", async () => {
    //#given
    const dir = createTempDir("activity")
    const store = getImperialTaskStateStore(dir)
    store.ensureTask("s-activity", "activity test")
    store.appendFlow("s-activity", "皇上", "太子", "下旨")

    const tool = createImperialTaskActivityTool(dir)

    //#when
    const result = await tool.execute(
      {},
      {
        sessionID: "s-activity",
        messageID: "m1",
        agent: "prometheus",
        abort: new AbortController().signal,
      },
    )

    //#then
    expect(String(result)).toContain("\"task\"")
    expect(String(result)).toContain("\"activity\"")

    rmSync(dir, { recursive: true, force: true })
  })
})
