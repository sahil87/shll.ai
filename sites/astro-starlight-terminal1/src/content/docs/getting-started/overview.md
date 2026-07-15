---
title: Overview
description: What the shll toolkit is, who it's for, and how the pieces fit together.
---

The **shll toolkit** is seven small CLIs for AI-assisted coding — independent tools that compose into one workflow. Each is brew-installable and useful on its own, but together they run the whole loop: from capturing an idea to a merged pull request, with the AI doing the typing. It's built for developers running multiple coding agents in parallel who want a plan and a paper trail, not a black box — every backlog, plan, and cost report is a plain file you can `cat`, `grep`, and `git diff`.

## The shape

```text
idea  →  fab-kit  →  wt        →  run-kit
 ↑          ↓           ↓             ↓
 │       constitution  worktree     dashboard
 │       plan          per branch   for agents
 │
 └── backlog feeds /fab-new
```

The chain runs **[idea](/idea/)** → **[fab-kit](/fab-kit/)** → **[wt](/wt/)** → **[run-kit](/run-kit/)**: a backlog item becomes a planned change, the change runs in its own worktree, and the dashboard watches every agent. Around the chain, **[tu](/tu/)** watches the cost of all of it, **[hop](/hop/)** is a personal directory of your git repos — jump between them and batch-update them from anywhere — and **[shll](/shll/)** is the bootstrap that installs and updates the whole set.

## What's on this site

- **Tool pages** — one section per CLI: overview, install, commands, workflows.
- **Workflows** — cross-tool recipes for common scenarios.
- **Getting started** — install everything, then orient yourself.

## What's not on this site

Each tool's authoritative reference lives in its own GitHub repo. The pages here are deliberately scoped — opinionated overviews and the commands you'll actually use day-to-day. For exhaustive flag reference, follow the GitHub link at the bottom of each tool's overview.
