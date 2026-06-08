---
title: Philosophy
description: Why these tools exist and what they refuse to do.
---

The shll toolkit is built on a few opinions about how AI-assisted coding should work. Not all of them are universal — they're choices, with tradeoffs.

## Plain text, not databases

Every persistent artifact in this toolkit is a file you can `cat`, `grep`, and `git diff`. The backlog (`idea`) is a markdown file. Plans (`fab-kit`) are markdown files. Worktree state (`wt`) lives in your filesystem. Cost data (`tu`) is JSON you can dump.

Rationale: AI agents are good at editing files. They're terrible at hidden state. Keep the contract in the file.

## Plan before you code

`fab-kit`'s 6-stage pipeline (intake → apply → review → hydrate → ship → review-PR) exists because letting an agent code straight from a one-line prompt produces predictable garbage. Forcing an intake stage adds 10 minutes; saves 2 hours of rework.

## Composition over integration

Each tool does one thing and exposes a CLI. They don't share a daemon, an SDK, or a database. Integration happens via files (`fab/backlog.md` is the contract between `idea` and `fab-kit`) and conventions, not APIs.

Rationale: every tool is independently useful. Drop any one of them; the others keep working.

## What we refuse to do

- **No SDK lock-in** — works with Claude Code, Codex, Cursor, Windsurf. Switch agents tomorrow, keep the toolkit.
- **No proprietary formats** — every artifact is markdown, YAML, or JSON.
- **No telemetry without a flag** — `tu` is opt-in observability for *your* costs.
