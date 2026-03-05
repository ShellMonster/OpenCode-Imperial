# Imperial Dashboard TODO (Plan B)

## Milestone

- [x] Add lightweight local dashboard service (`HTTP + SSE`) for imperial workflow.
- [x] Expose snapshot API: `GET /imperial-dashboard/api/snapshot`.
- [x] Expose task detail API: `GET /imperial-dashboard/api/tasks/:sessionID`.
- [x] Expose SSE stream: `GET /imperial-dashboard/events`.
- [x] Serve built-in dashboard page: `GET /imperial-dashboard`.
- [x] Add runtime config under `imperial_workflow.dashboard`.
- [x] Auto-start/stop manager via plugin lifecycle manager.
- [x] Add tests for snapshot and HTTP handler.
- [x] Add startup failure fallback (port conflict should not crash plugin).

## Runtime Check

- [x] Typecheck passed.
- [x] New tests passed (`imperial-dashboard`, schema, workflow regressions).

## Follow-ups (Next Board Planning)

- [x] Add action APIs (stop/cancel/resume) with strict transition checks.
- [x] Add filter/sort/search params for snapshot endpoint.
- [x] Add optional auth token for dashboard endpoints in shared environments.
- [x] Add richer UI panels (overview + task detail + memorial/audit) aligned with edict style.
- [x] Add best-effort runtime bridge for stop/cancel actions.
- [x] Add runtime continuation bridge for resume action (descendant background tasks).
- [x] Add memorial summary endpoint and metrics panel.
