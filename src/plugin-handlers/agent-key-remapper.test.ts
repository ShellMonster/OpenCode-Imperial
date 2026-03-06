import { describe, it, expect } from "bun:test"
import { remapAgentKeysToDisplayNames } from "./agent-key-remapper"

describe("remapAgentKeysToDisplayNames", () => {
  it("remaps known agent keys to display names", () => {
    // given agents with lowercase keys
    const agents = {
      sisyphus: { prompt: "test", mode: "primary" },
      oracle: { prompt: "test", mode: "subagent" },
    }

    // when remapping
    const result = remapAgentKeysToDisplayNames(agents)

    // then known agents get display name keys only
    expect(result["太子(总管执行)"]).toBeDefined()
    expect(result["刑部(疑难会审)"]).toBeDefined()
    expect(result["sisyphus"]).toBeUndefined()
  })

  it("preserves unknown agent keys unchanged", () => {
    // given agents with a custom key
    const agents = {
      "custom-agent": { prompt: "custom" },
    }

    // when remapping
    const result = remapAgentKeysToDisplayNames(agents)

    // then custom key is unchanged
    expect(result["custom-agent"]).toBeDefined()
  })

  it("remaps all core agents to display names", () => {
    // given all core agents
    const agents = {
      sisyphus: {},
      hephaestus: {},
      prometheus: {},
      atlas: {},
      metis: {},
      momus: {},
      "sisyphus-junior": {},
    }

    // when remapping
    const result = remapAgentKeysToDisplayNames(agents)

    // then all get display name keys without lowercase duplicates
    expect(result["太子(总管执行)"]).toBeDefined()
    expect(result["sisyphus"]).toBeUndefined()
    expect(result["工部(深度执行)"]).toBeDefined()
    expect(result["hephaestus"]).toBeUndefined()
    expect(result["中书省(制策规划)"]).toBeDefined()
    expect(result["prometheus"]).toBeUndefined()
    expect(result["尚书省(统筹执行)"]).toBeDefined()
    expect(result["atlas"]).toBeUndefined()
    expect(result["中书参议(方案顾问)"]).toBeDefined()
    expect(result["metis"]).toBeUndefined()
    expect(result["门下省(审议复核)"]).toBeDefined()
    expect(result["momus"]).toBeUndefined()
    expect(result["六部执行官(分部执行)"]).toBeDefined()
    expect(result["sisyphus-junior"]).toBeUndefined()
  })
})
