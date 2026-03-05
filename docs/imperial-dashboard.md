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
- `dashboard.port = 7897`
- `dashboard.refresh_ms = 1500`

## Authentication (Optional)

When `auth_token` is configured:

- API/Page: pass via `Authorization: Bearer <token>` or `x-imperial-token: <token>` or `?token=<token>`.
- SSE: use `?token=<token>`.

## Data Sources

- `.sisyphus/imperial-workflow/tasks.json`
- `.sisyphus/imperial-workflow/audit.jsonl`

## Notes

- Dashboard uses SSE push with periodic snapshots.
- If port is occupied, startup failure is logged and plugin runtime continues.
