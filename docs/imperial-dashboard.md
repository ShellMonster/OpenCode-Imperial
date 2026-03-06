# Imperial Dashboard (Plan B)

A lightweight real-time dashboard is available for imperial workflow sessions.

## Endpoints

- `GET /imperial-dashboard`
- `GET /imperial-dashboard/health`
- `GET /imperial-dashboard/api/snapshot`
- `GET /imperial-dashboard/api/memorials/summary`
- `GET /imperial-dashboard/api/tasks/:sessionID`
- `POST /imperial-dashboard/api/tasks/:sessionID/actions`
- `GET /imperial-dashboard/events` (SSE)

## Current Panels

- Metrics overview
- Task table with filter/sort/search
- Task detail: 门下省审议 / 尚书省派发与回奏 / 六部回执 / 流转活动
- Memorial summary
- Recent audit
- Institution overview
- Workflow funnel
- Bottlenecks / stalled tasks
- Officials load

## Action API

Request body:

```json
{
  "action": "stop | resume | cancel",
  "reason": "optional"
}
```

Strict transition rules:

- `stop`: only when control status is `active`
- `resume`: only when control status is `stopped`
- `cancel`: blocked only when already cancelled
- all actions are blocked when task state is `Done`
- `stop/cancel` trigger runtime bridge: abort parent session + cancel descendant background tasks (best effort)
- `resume` currently restores governance state only (runtime continuation pending)

## Snapshot Query Params

- `state`
- `org`
- `q`
- `control` (`active|stopped|cancelled`)
- `sort` (`updatedAt|createdAt|title|state`)
- `order` (`asc|desc`)
- `limit`
- `offset`

## Configuration

```json
{
  "imperial_workflow": {
    "enabled": true,
    "dashboard": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 7897,
      "refresh_ms": 1500,
      "auth_token": "change-this-token"
    }
  }
}
```

Defaults:

- `dashboard.enabled = true` (when `imperial_workflow.enabled = true`)
- `dashboard.host = 127.0.0.1`
- `dashboard.port = 7897` (default base port; runtime will derive a workspace-specific port when left at default)
- `dashboard.refresh_ms = 1500`

## Authentication (Optional)

When `auth_token` is configured:

- API/Page: pass via `Authorization: Bearer <token>` or `x-imperial-token: <token>` or `?token=<token>`.
- SSE: use `?token=<token>`.

## Data Sources

- `.opencode-imperial/imperial-workflow/tasks.json`
- `.opencode-imperial/imperial-workflow/audit.jsonl`

Legacy compatibility:

- If only legacy `.sisyphus/imperial-workflow/*` exists, dashboard reads it as a fallback.
- New runtime writes use `.opencode-imperial/imperial-workflow/*`.

## Notes

- Dashboard uses SSE push with periodic snapshots.
- When multiple workspaces run concurrently, the default port is automatically derived per workspace to reduce conflicts.
- If the chosen port is occupied, runtime will try nearby fallback ports before giving up.
- Task state writes use a local lockfile plus atomic replace to reduce concurrent overwrite risk.
