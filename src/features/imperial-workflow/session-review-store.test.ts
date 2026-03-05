import { describe, expect, test } from "bun:test"
import { ImperialSessionReviewStore } from "./session-review-store"

describe("ImperialSessionReviewStore", () => {
  test("tracks review rounds and reviewed flag per session", () => {
    //#given
    const store = new ImperialSessionReviewStore()

    //#when
    const initial = store.get("s-1")
    const reviewed = store.markReviewed("s-1")
    const consumed = store.consumeReview("s-1")

    //#then
    expect(initial.reviewRounds).toBe(0)
    expect(initial.reviewed).toBe(false)
    expect(reviewed.reviewRounds).toBe(1)
    expect(reviewed.reviewed).toBe(true)
    expect(consumed.reviewed).toBe(false)
  })
})
