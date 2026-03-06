# Plugin Coexistence Todo

## Goal

Make `opencode-imperial` coexist cleanly with `oh-my-opencode` on the same machine while keeping the recommended usage model as "single plugin per project workspace".

## Tasks

- [done] Isolate imperial workflow runtime data into an `opencode-imperial`-scoped directory.
- [done] Keep legacy `.sisyphus/imperial-workflow/*` files as read-only compatibility sources.
- [done] Detect enabled `oh-my-opencode` during install and show coexistence guidance without replacing it.
- [done] Update README and workflow/dashboard docs with coexistence guidance and new runtime paths.
- [done] Run targeted tests, `bun run typecheck`, `bun run build`, and a final installer validation.

## Acceptance

- `opencode-imperial` writes workflow state and audit logs under its own runtime directory.
- Existing legacy workflow data is still readable after upgrade.
- Installer does not replace `oh-my-opencode`, but warns about recommended per-project single activation.
- Docs reflect the coexistence model and runtime path changes.
