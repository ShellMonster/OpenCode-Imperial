import { describe, expect, test } from "bun:test"
import { extractImperialTaskTitle, isImperialWorkDirective } from "./ingress-classifier"

describe("imperial ingress classifier", () => {
  test("treats greeting as chat", () => {
    expect(isImperialWorkDirective("你好")).toBe(false)
    expect(isImperialWorkDirective("thanks")).toBe(false)
  })

  test("treats action request as work directive", () => {
    expect(isImperialWorkDirective("请帮我修复这个 bug 并补测试")).toBe(true)
    expect(isImperialWorkDirective("implement caching for this service")).toBe(true)
  })

  test("extracts concise task title", () => {
    const title = extractImperialTaskTitle("实现一个很长很长很长很长很长很长很长很长很长很长很长很长的需求描述")
    expect(title.length).toBeLessThanOrEqual(80)
  })
})
