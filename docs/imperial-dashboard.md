# Imperial Dashboard (Plan B)

A lightweight real-time dashboard is now available for imperial workflow sessions.

## Endpoints

- `GET /imperial-dashboard`
- `GET /imperial-dashboard/health`
- `GET /imperial-dashboard/api/snapshot`
- `GET /imperial-dashboard/api/tasks/:sessionID`
- `GET /imperial-dashboard/events` (SSE)

## Configuration

```json
{
  "imperial_workflow": {
    "enabled": true,
    "dashboard": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 7897,
      "refresh_ms": 1500
    }
  }
}
```

Defaults:

- `dashboard.enabled = true` (when `imperial_workflow.enabled = true`)
- `dashboard.host = 127.0.0.1`
- `dashboard.port = 7897`
- `dashboard.refresh_ms = 1500`

## Data Sources

- `.sisyphus/imperial-workflow/tasks.json`
- `.sisyphus/imperial-workflow/audit.jsonl`

## Notes

- The dashboard uses SSE push with periodic snapshots.
- If the port is already occupied, startup failure is logged and plugin runtime continues.
