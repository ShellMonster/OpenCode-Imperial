import { describe, expect, test } from "bun:test"
import { createImperialWorkflowPolicy, evaluateImperialDelegation } from "./policy"
import { ImperialSessionReviewStore } from "./session-review-store"

describe("imperial workflow policy", () => {
  test("allows delegation when workflow is disabled", () => {
    //#given
    const policy = createImperialWorkflowPolicy({ enabled: false })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const result = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-1",
      callerAgent: "prometheus",
      targetAgent: "atlas",
    })

    //#then
    expect(result.allowed).toBe(true)
  })

  test("denies out-of-matrix delegation with mapped roles", () => {
    //#given
    const policy = createImperialWorkflowPolicy({ enabled: true })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const result = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-2",
      callerAgent: "prometheus",
      targetAgent: "prometheus",
    })

    //#then
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("cannot delegate")
  })

  test("requires menxia review before zhongshu can dispatch to shangshu", () => {
    //#given
    const policy = createImperialWorkflowPolicy({ enabled: true, strict_review: true })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const firstAttempt = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-3",
      callerAgent: "prometheus",
      targetAgent: "atlas",
    })
    const reviewStep = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-3",
      callerAgent: "prometheus",
      targetAgent: "momus",
    })
    const secondAttempt = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-3",
      callerAgent: "prometheus",
      targetAgent: "atlas",
    })

    //#then
    expect(firstAttempt.allowed).toBe(false)
    expect(reviewStep.allowed).toBe(true)
    expect(secondAttempt.allowed).toBe(true)
  })

  test("enforces max review rounds", () => {
    //#given
    const policy = createImperialWorkflowPolicy({
      enabled: true,
      max_review_round: 1,
    })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const firstReview = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-4",
      callerAgent: "prometheus",
      targetAgent: "momus",
    })
    const secondReview = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-4",
      callerAgent: "prometheus",
      targetAgent: "momus",
    })

    //#then
    expect(firstReview.allowed).toBe(true)
    expect(secondReview.allowed).toBe(false)
    expect(secondReview.reason).toContain("max review rounds exceeded")
  })

  test("uses soft mapping mode for unmapped agents", () => {
    //#given
    const policy = createImperialWorkflowPolicy({ enabled: true })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const result = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-5",
      callerAgent: "prometheus",
      targetAgent: "explore",
    })

    //#then
    expect(result.allowed).toBe(true)
  })

  test("supports full six-ministry mapping scenario", () => {
    //#given
    const policy = createImperialWorkflowPolicy({
      enabled: true,
      role_map: {
        prometheus: "zhongshu",
        momus: "menxia",
        atlas: "shangshu",
        librarian: "hubu",
        explore: "libu",
        hephaestus: "bingbu",
        oracle: "xingbu",
        "sisyphus-junior": "gongbu",
        metis: "libu_hr",
      },
    })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const review = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-6",
      callerAgent: "prometheus",
      targetAgent: "momus",
    })
    const dispatch = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-6",
      callerAgent: "prometheus",
      targetAgent: "atlas",
    })
    const ministry = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-6",
      callerAgent: "atlas",
      targetAgent: "oracle",
    })

    //#then
    expect(review.allowed).toBe(true)
    expect(dispatch.allowed).toBe(true)
    expect(ministry.allowed).toBe(true)
  })
})
