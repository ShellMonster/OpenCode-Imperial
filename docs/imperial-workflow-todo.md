# Imperial Workflow TODO

## Milestone 1: Soft Mapping + Hard Gate (Completed)

- [x] Add `imperial_workflow` config schema and root config integration.
- [x] Implement imperial policy core:
  - [x] Role soft-mapping.
  - [x] Permission matrix check.
  - [x] Menxia review gate for `zhongshu -> shangshu`.
  - [x] Max review round guard.
- [x] Integrate gate into `task` delegation path.
- [x] Integrate gate into `call_omo_agent` path.
- [x] Use shared session review store across tool paths.
- [x] Clear session review state on `session.deleted`.
- [x] Add tests for policy/schema/session-review-store.
- [x] Pass typecheck.

## Milestone 2: Full Six-Ministry Mapping (Completed)

- [x] Define production role map for all active agents in this repo.
- [x] Add sample config block in docs for full 三省六部 mapping.
- [x] Add validation test for full mapping scenario.
- [x] Verify no false-deny on unmapped/legacy agents.

## Milestone 3: Auditability (Completed)

- [x] Add structured audit logs for every gate decision:
  - [x] Caller agent/role.
  - [x] Target agent/role.
  - [x] Session ID.
  - [x] Decision reason.
- [x] Add docs section: how to debug denied delegation.

## Milestone 4: Event-Level State Model (Completed)

- [x] Introduce explicit imperial task state transitions:
  - [x] `Pending -> Zhongshu -> Menxia -> Assigned -> Doing -> Review -> Done`.
- [x] Persist minimal task-level state (not only session-level review flag).
- [x] Add tests for transition legality.

## Milestone 5: Rollout & Compatibility (Completed)

- [x] Add migration notes for users enabling `imperial_workflow`.
- [x] Add fallback behavior docs when `enabled=false`.
- [x] Add release note entry.

## Phase P0/P1: Workflow Completeness (Completed)

- [x] Add Taizi-style ingress classification for user directives.
- [x] Introduce unified imperial task entity with flow/progress/scheduler metadata.
- [x] Add scheduler checks for stalled sessions (retry/escalation).
- [x] Add task activity query interface (`imperial_task_activity`).

## Acceptance Checklist

- [x] `imperial_workflow.enabled=true` enforces matrix + review gate on both tool paths.
- [x] `imperial_workflow.enabled=false` preserves existing behavior.
- [x] All related tests pass.
- [x] Typecheck passes.
- [x] Docs include minimal and full config examples.

## Phase P2: Imperial Runtime Entry (In Progress)

- [x] Rewrite `/start-work` command and runtime template into 三省六部 narrative.
- [x] Replace old planner/executor wording in start-work hook user-facing output.
- [ ] Keep internal compatibility names (`atlas`, `prometheus`, `sisyphus`) unchanged.
- [x] Add/adjust tests for the updated runtime wording.

## Phase P3: Institutional Loop Closure

- [x] Audit Zhongshu -> Menxia -> Shangshu -> ministries -> Zhongshu return flow.
- [x] Make review rejection / resubmission / consolidated return states explicit in task detail output.
- [x] Verify dispatch receipts and scheduler escalations are readable in dashboard activity.

## Phase P4: Dashboard Core Parity

- [ ] Add stronger memorial-style summary for completed work.
- [x] Expose review notes / dispatch receipts / return summaries in dashboard APIs.
- [x] Improve task detail to make the imperial chain readable without cross-checking raw JSON.

## Phase P5: Tail Cleanup

- [ ] Sweep remaining user-facing old naming in docs/help output.
- [ ] Rebuild generated artifacts after source wording stabilizes.
- [ ] Run targeted regression + typecheck as final acceptance.
