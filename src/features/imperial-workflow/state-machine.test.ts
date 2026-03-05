import { describe, expect, test } from "bun:test"
import { canTransition, nextStateFromDelegation } from "./state-machine"

describe("imperial state machine", () => {
  test("maps delegation pairs to expected next states", () => {
    expect(nextStateFromDelegation("zhongshu", "menxia")).toBe("Menxia")
    expect(nextStateFromDelegation("zhongshu", "shangshu")).toBe("Assigned")
    expect(nextStateFromDelegation("shangshu", "bingbu")).toBe("Doing")
    expect(nextStateFromDelegation("bingbu", "shangshu")).toBe("Review")
    expect(nextStateFromDelegation("shangshu", "zhongshu")).toBe("Done")
  })

  test("rejects invalid transition edges", () => {
    expect(canTransition("Done", "Zhongshu")).toBe(false)
    expect(canTransition("Assigned", "Review")).toBe(false)
    expect(canTransition("Zhongshu", "Menxia")).toBe(true)
  })
})
