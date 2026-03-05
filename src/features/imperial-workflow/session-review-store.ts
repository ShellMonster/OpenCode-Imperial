import type { ImperialSessionReviewState } from "./types"

export class ImperialSessionReviewStore {
  private readonly state = new Map<string, ImperialSessionReviewState>()

  get(sessionID: string): ImperialSessionReviewState {
    return this.state.get(sessionID) ?? { reviewRounds: 0, reviewed: false }
  }

  markReviewed(sessionID: string): ImperialSessionReviewState {
    const current = this.get(sessionID)
    const next = {
      reviewRounds: current.reviewRounds + 1,
      reviewed: true,
    }
    this.state.set(sessionID, next)
    return next
  }

  consumeReview(sessionID: string): ImperialSessionReviewState {
    const current = this.get(sessionID)
    const next = {
      reviewRounds: current.reviewRounds,
      reviewed: false,
    }
    this.state.set(sessionID, next)
    return next
  }

  clear(sessionID: string): void {
    this.state.delete(sessionID)
  }

  clearAll(): void {
    this.state.clear()
  }
}

const GLOBAL_IMPERIAL_SESSION_REVIEW_STORE = new ImperialSessionReviewStore()

export function getImperialSessionReviewStore(): ImperialSessionReviewStore {
  return GLOBAL_IMPERIAL_SESSION_REVIEW_STORE
}

export function clearImperialSessionReview(sessionID: string): void {
  GLOBAL_IMPERIAL_SESSION_REVIEW_STORE.clear(sessionID)
}
