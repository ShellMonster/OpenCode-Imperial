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
    const approvalStep = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-3",
      callerAgent: "momus",
      targetAgent: "prometheus",
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
    expect(approvalStep.allowed).toBe(true)
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

  test("denies unmapped delegation in strict mapping mode", () => {
    //#given
    const policy = createImperialWorkflowPolicy({
      enabled: true,
      strict_mapping: true,
    })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const result = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-5b",
      callerAgent: "prometheus",
      targetAgent: "explore",
    })

    //#then
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("unmapped")
  })

  test("requires review note when configured", () => {
    //#given
    const policy = createImperialWorkflowPolicy({
      enabled: true,
      strict_review: true,
      require_review_note: true,
    })
    const reviewStore = new ImperialSessionReviewStore()

    //#when
    const requestReview = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-note",
      callerAgent: "prometheus",
      targetAgent: "momus",
    })
    const approveWithoutNote = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-note",
      callerAgent: "momus",
      targetAgent: "prometheus",
    })
    const dispatch = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-note",
      callerAgent: "prometheus",
      targetAgent: "atlas",
    })

    //#then
    expect(requestReview.allowed).toBe(true)
    expect(approveWithoutNote.allowed).toBe(true)
    expect(dispatch.allowed).toBe(false)
    expect(dispatch.reason).toContain("review note")
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
    const approval = evaluateImperialDelegation({
      policy,
      reviewStore,
      sessionID: "s-6",
      callerAgent: "momus",
      targetAgent: "prometheus",
      reviewNote: "approved for dispatch",
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
    expect(approval.allowed).toBe(true)
    expect(dispatch.allowed).toBe(true)
    expect(ministry.allowed).toBe(true)
  })
})
