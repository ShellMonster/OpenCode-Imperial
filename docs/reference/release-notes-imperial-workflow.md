# Release Notes: Imperial Workflow (Soft Mapping + Hard Gate)

## Summary

Added a configurable imperial governance layer for agent delegation:

- Soft role mapping (`role_map`)
- Hard permission gate (`permission_matrix`)
- Mandatory review gate (`zhongshu -> menxia -> shangshu`)
- Session-level review tracking
- Task-state persistence (`.sisyphus/imperial-workflow/tasks.json`)
- Delegation audit log (`.sisyphus/imperial-workflow/audit.jsonl`)
- Taizi-style ingress classification for work directives
- Scheduler checks for stalled sessions (`retry` / `escalate`)
- New tool: `imperial_task_activity`

## New Config

```json
{
  "imperial_workflow": {
    "enabled": true,
    "strict_review": true,
    "max_review_round": 3
  }
}
```

## Compatibility

- `enabled=false`: no behavior change from previous versions.
- Unmapped agents are not blocked by default (safe incremental rollout).

## Operational Notes

- On `session.deleted`, session review state and persisted task state are cleared.
- Both `task` and `call_omo_agent` paths enforce the same policy when enabled.
