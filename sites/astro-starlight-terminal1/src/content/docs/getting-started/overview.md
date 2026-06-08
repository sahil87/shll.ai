---
title: Overview
description: What the shll toolkit is, who it's for, and how the pieces fit together.
---

The **shll toolkit** is seven small CLIs that work together to make AI-assisted coding tractable. Each tool is independent, brew-installable, and useful on its own — but they compose into a pipeline that runs from idea capture to merged PR with the AI doing the typing.

## The shape

```text
idea  →  fab-kit  →  wt        →  run-kit
 ↑          ↓           ↓             ↓
 │       constitution  worktree     dashboard
 │       plan          per branch   for agents
 │
 └── backlog feeds /fab-new
```

`tu` watches the cost of all of it. `hop` is a personal directory of your git repos — jump between them and batch-update them from anywhere. `shll` is the bootstrap.

## What's on this site

- **Tool pages** — one section per CLI: overview, install, commands, workflows.
- **Workflows** — cross-tool recipes for common scenarios.
- **Getting started** — install everything, then orient yourself.

## What's not on this site

Each tool's authoritative reference lives in its own GitHub repo. The pages here are deliberately scoped — opinionated overviews and the commands you'll actually use day-to-day. For exhaustive flag reference, follow the GitHub link at the bottom of each tool's overview.
