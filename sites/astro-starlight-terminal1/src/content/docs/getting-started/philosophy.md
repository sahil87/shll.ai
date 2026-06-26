---
title: Philosophy
description: Why these tools exist and what they refuse to do.
---

The shll toolkit is built on a few opinions about how AI-assisted coding should work. Not all of them are universal — they're choices, with tradeoffs.

## Not a coding agent — a layer above one

shll is not another coding agent, and it doesn't want to be. It's the workflow layer that sits *above* the agent you already use. The coding agent writes the code; shll handles everything around it — capturing the idea, writing the plan, isolating the work, and watching the session.

It's analogous to how GitHub Actions didn't replace Git — it organized and automated the work around it. shll doesn't compete with Claude Code, Codex, or Cursor; it organizes and scales how you use them. Switch agents tomorrow and the toolkit comes with you.

## Who it's for

This is workflow infrastructure, and infrastructure earns its weight at scale. If you're just getting started with AI coding, you don't need it yet — learn to collaborate with a single agent first, and reach for shll when the workflow around that agent starts to hurt.

It starts to pay off when you:

- work in large repositories
- run more than one coding agent, or more than one feature, in parallel
- want a written plan before any code gets written
- want that plan, and the backlog and the cost trail, stored in Git as plain files

If none of that is true yet, the toolkit is overkill — and saying so is part of the point.

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
