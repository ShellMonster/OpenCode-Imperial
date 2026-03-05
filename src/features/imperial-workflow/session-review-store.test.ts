import { describe, expect, test } from "bun:test"
import { ImperialSessionReviewStore } from "./session-review-store"

describe("ImperialSessionReviewStore", () => {
  test("tracks review request and approval lifecycle per session", () => {
    //#given
    const store = new ImperialSessionReviewStore()

    //#when
    const initial = store.get("s-1")
    const requested = store.markReviewRequested("s-1")
    const approved = store.markApproved("s-1", "looks good")
    const consumed = store.consumeReview("s-1")

    //#then
    expect(initial.reviewRounds).toBe(0)
    expect(initial.reviewed).toBe(false)
    expect(requested.reviewRounds).toBe(1)
    expect(requested.pendingReview).toBe(true)
    expect(approved.reviewed).toBe(true)
    expect(approved.reviewNote).toBe("looks good")
    expect(consumed.reviewed).toBe(false)
  })
})
