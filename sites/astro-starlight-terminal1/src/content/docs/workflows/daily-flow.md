---
title: Daily flow
description: A typical day with the shll toolkit — from morning standup to evening shutdown.
---

This is the cross-tool flow that the toolkit is designed around. Use it as a template, not a script.

## Morning

```bash
hop --all pull      # pull every cloned repo in hop.yaml
tu                  # check today's cost so far
idea list           # what's on the docket today
```

## Pick a change

```bash
idea list            # the backlog (open items); pipe to grep to narrow
# [a7q2] 2026-06-08: flaky timezone in user-profile.tsx

wt create flaky-tz-test          # new worktree at ../<repo>.worktrees/flaky-tz-test/
cd ../<repo>.worktrees/flaky-tz-test
fab change new --slug flaky-tz-test   # create the fab change folder for this work
```

## Drive the change with fab-kit

```bash
run-kit riff --skill /fab-fff  # from this worktree: opens a tmux window, spawns Claude Code, runs the pipeline
```

`/fab-fff` runs apply → review → hydrate → ship → review-PR (everything after intake). You watch in `run-kit`'s browser dashboard; intervene only at gates.

## Review the PR

```bash
gh pr view --web                    # open the PR
# leave comments yourself, or let Copilot review

# back in the worktree:
run-kit riff --skill /git-pr-review     # triages and fixes review comments
```

## End of day

```bash
hop ls --trees       # per-repo worktree status across the registry
tu                   # today's spend
wt list              # see worktrees; wt delete --stale prunes those idle >7d
```

## Variants

- **Multiple changes in parallel**: `wt create` more worktrees; `run-kit riff` agents in each. The dashboard is the cross-pane view.
- **Long-running change**: when the intake has a lot of `[NEEDS CLARIFICATION]` markers, run `/fab-clarify` to resolve them in batches.
- **Cost-conscious mode**: `tu --watch` in a side pane keeps the running cost visible.
