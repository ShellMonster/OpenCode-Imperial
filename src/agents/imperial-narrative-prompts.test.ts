import { describe, expect, test } from "bun:test"
import { ATLAS_SYSTEM_PROMPT } from "./atlas/default"
import { ATLAS_GPT_SYSTEM_PROMPT } from "./atlas/gpt"
import { ATLAS_GEMINI_SYSTEM_PROMPT } from "./atlas/gemini"
import { PROMETHEUS_GPT_SYSTEM_PROMPT } from "./prometheus/gpt"
import { PROMETHEUS_GEMINI_SYSTEM_PROMPT } from "./prometheus/gemini"
import { PROMETHEUS_IDENTITY_CONSTRAINTS } from "./prometheus/identity-constraints"
import { createSisyphusAgent } from "./sisyphus"
import { createSisyphusJuniorAgentWithOverrides } from "./sisyphus-junior"

describe("imperial narrative prompt style", () => {
  const prompts = [
    ATLAS_SYSTEM_PROMPT,
    ATLAS_GPT_SYSTEM_PROMPT,
    ATLAS_GEMINI_SYSTEM_PROMPT,
    PROMETHEUS_GPT_SYSTEM_PROMPT,
    PROMETHEUS_GEMINI_SYSTEM_PROMPT,
    PROMETHEUS_IDENTITY_CONSTRAINTS,
  ]

  test("planner/orchestrator prompts should use 三省六部 narrative marker", () => {
    for (const prompt of prompts) {
      expect(prompt).toContain("三省六部")
    }
  })

  test("prometheus prompts should enforce imperial honorific tone without product-manager framing", () => {
    for (const prompt of [
      PROMETHEUS_GPT_SYSTEM_PROMPT,
      PROMETHEUS_GEMINI_SYSTEM_PROMPT,
      PROMETHEUS_IDENTITY_CONSTRAINTS,
    ]) {
      expect(prompt).toContain("陛下")
      expect(prompt).toContain("臣")
      expect(prompt).toContain("Do NOT")
      expect(prompt).toContain("产品经理")
    }
  })

  test("prometheus prompts should preserve remonstration instead of blind obedience", () => {
    expect(PROMETHEUS_GPT_SYSTEM_PROMPT).toContain("blind obedience")
    expect(PROMETHEUS_GPT_SYSTEM_PROMPT).toContain("better alternative")

    expect(PROMETHEUS_GEMINI_SYSTEM_PROMPT).toContain("risk")
    expect(PROMETHEUS_GEMINI_SYSTEM_PROMPT).toContain("recommended path")

    expect(PROMETHEUS_IDENTITY_CONSTRAINTS).toContain("independent judgment")
    expect(PROMETHEUS_IDENTITY_CONSTRAINTS).toContain("remonstrate")
    expect(PROMETHEUS_IDENTITY_CONSTRAINTS).toContain("替代之策")
  })

  test("core executor prompts should avoid legacy identity phrasing", () => {
    const sisyphusPrompt = createSisyphusAgent(
      "anthropic/claude-opus-4-1",
      [],
      [],
      [],
      [],
      false,
    ).prompt

    const juniorPrompt = createSisyphusJuniorAgentWithOverrides({
      model: "anthropic/claude-sonnet-4-5",
    }).prompt

    expect(sisyphusPrompt).not.toContain("You are \"Sisyphus\" - Powerful AI Agent")
    expect(juniorPrompt).not.toContain("You are Sisyphus-Junior")
    expect(sisyphusPrompt).toContain("三省六部")
    expect(juniorPrompt).toContain("三省六部")
  })
})
