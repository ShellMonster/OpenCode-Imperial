# Imperial Workflow Configuration

This plugin now supports a configurable imperial governance layer with:

- Soft role mapping (`agent -> role`)
- Hard delegation gate (permission matrix)
- Mandatory review gate (`zhongshu -> menxia -> zhongshu -> shangshu`)
- Taizi-style ingress classification for user directives
- Lightweight scheduler checks (retry/escalation on stall)
- Unified task activity query tool (`imperial_task_activity`)
- Optional lightweight real-time dashboard (`HTTP + SSE`)

## Minimal Config (Three Departments)

```json
{
  "imperial_workflow": {
    "enabled": true,
    "strict_review": true,
    "strict_mapping": true,
    "require_review_note": true,
    "max_review_round": 3,
    "stall_threshold_sec": 180,
    "max_retry": 1,
    "role_map": {
      "prometheus": "zhongshu",
      "momus": "menxia",
      "atlas": "shangshu"
    }
  }
}
```

## Full Config (Three Departments + Six Ministries)

```json
{
  "imperial_workflow": {
    "enabled": true,
    "strict_review": true,
    "max_review_round": 3,
    "stall_threshold_sec": 180,
    "max_retry": 1,
    "role_map": {
      "prometheus": "zhongshu",
      "momus": "menxia",
      "atlas": "shangshu",
      "librarian": "hubu",
      "explore": "libu",
      "hephaestus": "bingbu",
      "oracle": "xingbu",
      "sisyphus-junior": "gongbu",
      "metis": "libu_hr"
    }
  }
}
```

## Optional Permission Matrix Override

If needed, override the default matrix:

```json
{
  "imperial_workflow": {
    "enabled": true,
    "role_map": {
      "prometheus": "zhongshu",
      "momus": "menxia",
      "atlas": "shangshu"
    },
    "permission_matrix": {
      "zhongshu": ["menxia", "shangshu"],
      "menxia": ["zhongshu", "shangshu"],
      "shangshu": ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"]
    }
  }
}
```

## Runtime Artifacts

When enabled, the plugin writes:

- `.sisyphus/imperial-workflow/tasks.json`
- `.sisyphus/imperial-workflow/audit.jsonl`

## Dashboard Runtime (Plan B)

When `imperial_workflow.enabled=true`, you can enable a lightweight local dashboard:

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

Dashboard URL:

- `http://127.0.0.1:7897/imperial-dashboard`

More details: `docs/imperial-dashboard.md`

Dashboard supports:

- Task actions: `stop` / `resume` / `cancel`
- Snapshot filtering: `state`, `org`, `q`, `control`, `sort`, `order`, `limit`, `offset`
- Optional token auth via `dashboard.auth_token`

Recommended strict-mode preset:

- `docs/imperial-zhongshu-preset.jsonc`

## Query Current Task Activity

Use tool:

```text
imperial_task_activity(session_id="<optional>")
```

If `session_id` is omitted, current session is used.

## Soft-Mapping Safety Behavior

- If caller or target agent is **not mapped**, the gate does not block by default.
- This avoids false-deny on legacy or temporary agents during rollout.
- Hard enforcement applies only when both sides are mapped roles.
- Set `strict_mapping=true` to enforce fully mapped institutional mode.

## Debugging Denied Delegation

When a delegation is denied:

1. Check runtime logs for `[imperial-workflow] delegation audit`.
2. Open audit file:
   - `.sisyphus/imperial-workflow/audit.jsonl`
3. Verify:
   - `callerAgent` and `targetAgent`
   - resolved `callerRole` and `targetRole`
   - `reason`
4. Compare with `role_map` and `permission_matrix` in your config.

Common reasons:

- Missing role mapping for expected hard enforcement path.
- Illegal edge in permission matrix.
- `strict_review=true` with missing `zhongshu -> menxia` review step.
- `max_review_round` exceeded due to repeated review loops.

## Rollout & Compatibility

- Safe rollout:
  1. Deploy with `enabled=false` (no behavior change).
  2. Add `role_map` for three departments only.
  3. Enable `imperial_workflow`.
  4. Expand to full six-ministry mapping.
- Backward compatibility:
  - Unmapped agents are not blocked by default.
  - Existing projects can migrate incrementally.
