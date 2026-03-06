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
