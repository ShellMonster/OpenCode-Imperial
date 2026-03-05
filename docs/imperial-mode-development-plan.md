# Imperial Zhongshu Mode Development Plan

## Goal

Turn current imperial workflow into a complete `Zhongshu-centric` execution model with real review closure, strict governance mode, and dispatch/runtime linkage.

## Milestones

### P0 (Must Have)

- [x] Governance strict mode
  - [x] Add `strict_mapping` option.
  - [x] Deny delegation when caller/target role is unmapped (when strict mode enabled).
- [x] Real review closure
  - [x] Separate `review requested` and `review approved` states in session review store.
  - [x] Require `menxia -> zhongshu` approval before `zhongshu -> shangshu`.
  - [x] Add optional `require_review_note` policy.
- [x] Default Zhongshu preset
  - [x] Provide production-ready config preset (role map + permissions + strict flags).

### P1 (Should Have)

- [x] Dispatch closure hardening
  - [x] Track assignment receipts from six ministries.
  - [x] Add `shangshu` consolidation record before task enters `Done`.
- [~] Dashboard-operation runtime linkage
  - [x] Stop/cancel bridges to runtime session/task controls.
  - [ ] Resume bridge (full runtime continuation) pending.

### P2 (Could Have)

- [ ] Institutional reporting
  - [ ] Add imperial memorial summary endpoint.
  - [ ] Add review quality metrics panel.

## Acceptance Criteria

- [x] `strict_mapping=true` blocks all unmapped delegations.
- [x] `strict_review=true` + no `menxia->zhongshu` approval blocks `zhongshu->shangshu`.
- [x] `require_review_note=true` blocks dispatch when review note is missing.
- [x] Existing non-strict behavior remains backward-compatible.
- [x] Typecheck and relevant tests pass.

## Current Execution Focus

- [x] Implement P0 end-to-end first.
