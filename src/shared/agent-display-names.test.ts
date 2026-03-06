import { describe, it, expect } from "bun:test"
import { AGENT_DISPLAY_NAMES, getAgentDisplayName, getAgentConfigKey } from "./agent-display-names"

describe("getAgentDisplayName", () => {
  it("returns display name for lowercase config key (new format)", () => {
    // given config key "sisyphus"
    const configKey = "sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "太子(总管执行)"
    expect(result).toBe("太子(总管执行)")
  })

  it("returns display name for uppercase config key (old format - case-insensitive)", () => {
    // given config key "Sisyphus" (old format)
    const configKey = "Sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "太子(总管执行)" (case-insensitive lookup)
    expect(result).toBe("太子(总管执行)")
  })

  it("returns original key for unknown agents (fallback)", () => {
    // given config key "custom-agent"
    const configKey = "custom-agent"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "custom-agent" (original key unchanged)
    expect(result).toBe("custom-agent")
  })

  it("returns display name for atlas", () => {
    // given config key "atlas"
    const configKey = "atlas"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

     // then returns "尚书省(统筹执行)"
    expect(result).toBe("尚书省(统筹执行)")
  })

  it("returns display name for prometheus", () => {
    // given config key "prometheus"
    const configKey = "prometheus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "中书省(制策规划)"
    expect(result).toBe("中书省(制策规划)")
  })

  it("returns display name for sisyphus-junior", () => {
    // given config key "sisyphus-junior"
    const configKey = "sisyphus-junior"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "六部执行官(分部执行)"
    expect(result).toBe("六部执行官(分部执行)")
  })

  it("returns display name for metis", () => {
    // given config key "metis"
    const configKey = "metis"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "中书参议(方案顾问)"
    expect(result).toBe("中书参议(方案顾问)")
  })

  it("returns display name for momus", () => {
    // given config key "momus"
    const configKey = "momus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

     // then returns "门下省(审议复核)"
    expect(result).toBe("门下省(审议复核)")
  })

  it("returns display name for oracle", () => {
    // given config key "oracle"
    const configKey = "oracle"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "刑部(疑难会审)"
    expect(result).toBe("刑部(疑难会审)")
  })

  it("returns display name for librarian", () => {
    // given config key "librarian"
    const configKey = "librarian"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "礼部(文献检索)"
    expect(result).toBe("礼部(文献检索)")
  })

  it("returns display name for explore", () => {
    // given config key "explore"
    const configKey = "explore"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "兵部(情报勘探)"
    expect(result).toBe("兵部(情报勘探)")
  })

  it("returns display name for multimodal-looker", () => {
    // given config key "multimodal-looker"
    const configKey = "multimodal-looker"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "户部(多模态审阅)"
    expect(result).toBe("户部(多模态审阅)")
  })
})

describe("getAgentConfigKey", () => {
  it("resolves display name to config key", () => {
    // given display name "太子(总管执行)"
    // when getAgentConfigKey called
    // then returns "sisyphus"
    expect(getAgentConfigKey("太子(总管执行)")).toBe("sisyphus")
  })

  it("resolves display name case-insensitively", () => {
    // given display name in different case
    // when getAgentConfigKey called
    // then returns "atlas"
    expect(getAgentConfigKey("shangshu (atlas)")).toBe("atlas")
  })

  it("supports legacy display names for backward compatibility", () => {
    expect(getAgentConfigKey("Sisyphus (Ultraworker)")).toBe("sisyphus")
    expect(getAgentConfigKey("Atlas (Plan Executor)")).toBe("atlas")
    expect(getAgentConfigKey("Prometheus (Plan Builder)")).toBe("prometheus")
  })

  it("passes through lowercase config keys unchanged", () => {
    // given lowercase config key "prometheus"
    // when getAgentConfigKey called
    // then returns "prometheus"
    expect(getAgentConfigKey("prometheus")).toBe("prometheus")
  })

  it("returns lowercased unknown agents", () => {
    // given unknown agent name
    // when getAgentConfigKey called
    // then returns lowercased
    expect(getAgentConfigKey("Custom-Agent")).toBe("custom-agent")
  })

  it("resolves all core agent display names", () => {
    // given all core display names
    // when/then each resolves to its config key
    expect(getAgentConfigKey("工部(深度执行)")).toBe("hephaestus")
    expect(getAgentConfigKey("中书省(制策规划)")).toBe("prometheus")
    expect(getAgentConfigKey("尚书省(统筹执行)")).toBe("atlas")
    expect(getAgentConfigKey("中书参议(方案顾问)")).toBe("metis")
    expect(getAgentConfigKey("门下省(审议复核)")).toBe("momus")
    expect(getAgentConfigKey("六部执行官(分部执行)")).toBe("sisyphus-junior")
  })
})

describe("AGENT_DISPLAY_NAMES", () => {
  it("contains all expected agent mappings", () => {
    // given expected mappings
    const expectedMappings = {
      sisyphus: "太子(总管执行)",
      hephaestus: "工部(深度执行)",
      prometheus: "中书省(制策规划)",
      atlas: "尚书省(统筹执行)",
      "sisyphus-junior": "六部执行官(分部执行)",
      metis: "中书参议(方案顾问)",
      momus: "门下省(审议复核)",
      oracle: "刑部(疑难会审)",
      librarian: "礼部(文献检索)",
      explore: "兵部(情报勘探)",
      "multimodal-looker": "户部(多模态审阅)",
    }

    // when checking the constant
    // then contains all expected mappings
    expect(AGENT_DISPLAY_NAMES).toEqual(expectedMappings)
  })
})
