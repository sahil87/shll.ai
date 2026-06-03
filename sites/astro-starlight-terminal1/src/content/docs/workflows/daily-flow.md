---
title: Daily flow
description: A typical day with the shll toolkit — from morning standup to evening shutdown.
---

This is the cross-tool flow that the toolkit is designed around. Use it as a template, not a script.

## Morning

```bash
hop pull --all      # sync every tracked repo
tu                  # check yesterday's cost
idea list           # what's on the docket today
```

## Pick a change

```bash
idea list            # tags are #word substrings — grep for the ones you care about
# [a7q2] flaky timezone #bug in user-profile.tsx

wt create flaky-tz-test          # new worktree at ../<repo>.worktrees/flaky-tz-test/
cd ../<repo>.worktrees/flaky-tz-test
fab change new --slug flaky-tz-test   # seed the fab change from the idea above
```

## Drive the change with fab-kit

```bash
rk riff --skill /fab-fff       # in the worktree: spawns Claude Code, runs the pipeline
```

`/fab-fff` runs intake → spec → apply → review → hydrate → ship. You watch in `rk`'s browser dashboard; intervene only at gates.

## Review the PR

```bash
gh pr view --web                    # open the PR
# leave comments yourself, or let Copilot review

# back in the worktree:
rk riff --skill /git-pr-review     # triages and fixes review comments
```

## End of day

```bash
hop status --all     # show dirty repos
tu                   # today's spend
wt list --stale      # worktrees idle >7 days
```

## Variants

- **Multiple changes in parallel**: `wt create` more worktrees; `rk riff` agents in each. The dashboard is the cross-pane view.
- **Long-running change**: when the spec stage produces a lot of `[NEEDS CLARIFICATION]` markers, run `/fab-clarify` between turns and answer them in batches.
- **Cost-conscious mode**: `tu --watch` in a side pane keeps the running cost visible.
