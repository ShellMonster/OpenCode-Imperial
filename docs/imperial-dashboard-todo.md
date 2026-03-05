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
- [x] New tests passed (`imperial-dashboard`, config schema).

## Follow-ups (Next Board Planning)

- [ ] Add action APIs (stop/cancel/resume) with strict state transition checks.
- [ ] Add filter/sort/search params for snapshot endpoint.
- [ ] Add optional auth token for dashboard endpoints in shared environments.
- [ ] Add richer UI panels (monitor/memorials/templates) aligned with edict layout.
