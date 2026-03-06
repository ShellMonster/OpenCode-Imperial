# OpenCode Imperial

`OpenCode Imperial` is an OpenCode plugin focused on imperial-style multi-agent governance.

It is a secondary-development fork based on [oh-my-opencode](https://github.com/ShellMonster/oh-my-opencode), rebuilt around the current project direction instead of the upstream branding and workflow narrative.

The current "三省六部" workflow and dashboard design are inspired by [cft0808/edict](https://github.com/cft0808/edict). This project combines:

- OpenCode's plugin and multi-agent runtime
- the upstream oh-my-opencode orchestration and tooling foundation
- an imperial workflow layer with governance, audit, and dashboard visibility

## Current Position

This repository is not a vanilla upstream mirror anymore.

It currently provides:

- an `opencode-imperial` plugin package and CLI
- Chinese imperial display names for the core agents
- a "三省六部" workflow layer on top of existing multi-agent delegation
- review gates, role mapping, audit logs, task state persistence
- a lightweight real-time dashboard for inspection and control

## Core Idea

Instead of treating agent delegation as an unrestricted background action, this project models it as an institutional workflow:

- `太子(总管执行)` handles ingress and top-level execution
- `中书省(制策规划)` plans and drafts
- `门下省(审议复核)` reviews and seals
- `尚书省(统筹执行)` dispatches and consolidates
- `六部` execute specialized work and return receipts

The workflow is enforced through:

- role mapping
- permission matrix checks
- mandatory review loops
- task state transitions
- scheduler-based stall detection
- audit logs and dashboard views

## Agent Mapping

Current UI display names:

- `太子(总管执行)` -> `sisyphus`
- `工部(深度执行)` -> `hephaestus`
- `中书省(制策规划)` -> `prometheus`
- `尚书省(统筹执行)` -> `atlas`
- `六部执行官(分部执行)` -> `sisyphus-junior`
- `中书参议(方案顾问)` -> `metis`
- `门下省(审议复核)` -> `momus`
- `刑部(疑难会审)` -> `oracle`
- `礼部(文献检索)` -> `librarian`
- `兵部(情报勘探)` -> `explore`
- `户部(多模态审阅)` -> `multimodal-looker`

Internal config keys are still kept for compatibility with the upstream fork and migration path.

## What Is Working Now

Current usable scope:

- imperial task governance
- Zhongshu -> Menxia -> Shangshu -> ministries -> Zhongshu flow
- review note and ministry receipt persistence
- stop / resume / cancel task actions
- dashboard snapshot, memorial, audit, bottleneck, official load
- official detail and session monitor drill-down views
- workspace-specific dashboard port derivation
- lockfile + atomic write protection for task state files

This means the project is already in a usable state, not just a concept prototype.

## Dashboard

The lightweight dashboard is built into the plugin runtime.

Current panels:

- metrics overview
- task table
- task detail
- memorial summary
- recent audit
- institution overview
- workflow funnel
- bottlenecks
- officials load
- official detail
- session monitor

Related docs:

- [Imperial Workflow](./docs/imperial-workflow.md)
- [Imperial Dashboard](./docs/imperial-dashboard.md)

## Installation

Package name:

```bash
opencode-imperial
```

CLI command:

```bash
opencode-imperial
```

Typical commands:

```bash
bunx opencode-imperial install
bunx opencode-imperial doctor
bunx opencode-imperial run "fix the bug"
```

Build and verification:

```bash
bun test
bun run typecheck
bun run build
```

## Minimal Imperial Config

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
    "dashboard": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 7897,
      "refresh_ms": 1500
    }
  }
}
```

When the dashboard uses the default base port `7897`, runtime derives a workspace-specific port automatically to reduce conflicts across multiple projects.

## Runtime Artifacts

When imperial workflow is enabled, the plugin writes:

- `.sisyphus/imperial-workflow/tasks.json`
- `.sisyphus/imperial-workflow/audit.jsonl`

## Project Origin

This project should be understood as:

1. A fork-based secondary development from `oh-my-opencode`
2. Running on top of OpenCode's plugin and multi-agent capabilities
3. Architecturally influenced by `edict`'s "三省六部" framing
4. Focused on turning agent orchestration into a governed workflow system

It is not an official upstream branch of either project.

## Current Direction

The current development focus is:

- stabilizing the imperial workflow
- improving dashboard operations
- adding stronger manual intervention controls
- keeping compatibility where it matters, while moving the user-facing system fully to the imperial narrative
