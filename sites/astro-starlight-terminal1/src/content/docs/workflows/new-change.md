---
title: Start a new change
description: The cleanest path from backlog item to active worktree with an agent.
---

A handful of commands, one minute, end-to-end.

## The flow

```bash
idea "add CSV export to reports page"
# captured as [k3m1]

idea list
# [k3m1] 2026-06-08: add CSV export to reports page

wt create csv-export
# new worktree + branch at ../<repo>.worktrees/csv-export/

cd ../<repo>.worktrees/csv-export
fab change new --slug csv-export   # create the fab change folder for this work
run-kit riff --skill /fab-fff
```

That's it. The agent is now driving the pipeline; you watch in the dashboard.

## What just happened, in detail

1. `idea "..."` appends an item to `fab/backlog.md` with a generated ID `[k3m1]`.
2. `wt create csv-export`:
   - Creates a git worktree at `../<repo>.worktrees/csv-export/`
   - Creates a git branch `csv-export`
   - Runs the per-worktree init script you've configured (e.g. to sync `.claude/` skills into the new worktree)
3. `fab change new --slug csv-export` creates the change folder `fab/changes/<YYMMDD>-<XXXX>-csv-export/` and its `.status.yaml`, starting the intake stage. The `/fab-new` skill (or the pipeline's first prompt) then generates `intake.md` from the `[k3m1]` backlog item.
4. `run-kit riff --skill /fab-fff`:
   - Opens a new tmux window in the worktree from step 2 (the Claude Code agent runs as pane 0 of that window)
   - Sends `/fab-fff` as the first input
   - Agent runs the full pipeline autonomously

## Without `wt` (single-repo, no worktrees)

```bash
idea "add CSV export to reports page"
fab change new --slug csv-export
git checkout -b $(fab resolve --folder)
# then: /fab-fff in your agent
```

Workable, but you lose the parallelism. The toolkit assumes worktrees as the default unit of work.

## Without `run-kit` (no dashboard)

```bash
# in the worktree:
claude                  # or codex, cursor — any agent
# in the agent: /fab-fff
```

You lose the cross-session view, but the pipeline runs identically. `run-kit` is convenience, not contract.

## Without `idea` (one-off change)

```bash
wt create csv-export
cd ../<repo>.worktrees/csv-export
fab change new --slug csv-export
# then: /fab-new "add CSV export to reports page"   (or just /fab-fff)
```

`fab change new --slug <slug>` produces the change folder and `.status.yaml` (no `intake.md` yet); the slash command's first prompt generates the intake.
