import type { ImperialSessionReviewState } from "./types"

export class ImperialSessionReviewStore {
  private readonly state = new Map<string, ImperialSessionReviewState>()

  get(sessionID: string): ImperialSessionReviewState {
    return this.state.get(sessionID) ?? {
      reviewRounds: 0,
      reviewed: false,
      pendingReview: false,
    }
  }

  markReviewRequested(sessionID: string): ImperialSessionReviewState {
    const current = this.get(sessionID)
    const next = {
      reviewRounds: current.reviewRounds + 1,
      reviewed: false,
      pendingReview: true,
      reviewNote: current.reviewNote,
      reviewedAt: current.reviewedAt,
    }
    this.state.set(sessionID, next)
    return next
  }

  markApproved(sessionID: string, reviewNote?: string): ImperialSessionReviewState {
    const current = this.get(sessionID)
    const normalizedNote = reviewNote?.trim()
    const next = {
      reviewRounds: current.reviewRounds,
      reviewed: true,
      pendingReview: false,
      reviewedAt: new Date().toISOString(),
      reviewNote: normalizedNote && normalizedNote.length > 0
        ? normalizedNote
        : current.reviewNote,
    }
    this.state.set(sessionID, next)
    return next
  }

  consumeReview(sessionID: string): ImperialSessionReviewState {
    const current = this.get(sessionID)
    const next = {
      reviewRounds: current.reviewRounds,
      reviewed: false,
      pendingReview: false,
      reviewedAt: current.reviewedAt,
      reviewNote: current.reviewNote,
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
