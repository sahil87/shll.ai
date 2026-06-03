---
title: Workflows
description: Real-world idea workflows — capture, triage, and feed into fab-kit.
---

These are patterns from daily use, not exhaustive docs. Each workflow is a single scenario followed end-to-end.

## Capture mid-flow

You're in the middle of fixing one bug and notice another. Don't break flow.

```bash
idea "the timezone offset is off by 1 in user_profile.tsx"
```

`idea` is fast enough — under 50ms cold — that this is cheaper than opening a new tab to your tracker.

## Triage on Monday morning

Open the backlog in your editor, reorder, kill duplicates, group related items.

```bash
idea edit
```

Because the backlog is just markdown, regular editor multi-cursor and find-replace work fine. No special triage UI.

## Feed an item into fab-kit

`fab-kit`'s `/fab-new` reads from `fab/backlog.md`. Pick an item, point at it.

```bash
idea list
# [qu1d] refactor auth middleware to use JWT
# [4xt2] add CSV export to reports page

fab change new --slug auth-middleware-jwt
```

`fab-kit` reads the backlog entry as the seed for the intake stage. After the change ships, `idea done qu1d` closes the loop.

## Per-worktree backlogs

When using [`wt`](/tools/wt/overview/), each worktree has its own backlog. Items captured while working on `feat-x` stay scoped to that worktree.

```bash
wt create feat-x
cd ../<repo>.worktrees/feat-x
idea "thought about feat-x specifically"
# the main worktree's backlog is untouched
```

To promote a worktree item to the main backlog, copy the line manually:

```bash
idea edit                              # in the worktree
# copy the line
cd $(wt root)/main                     # or wherever main is
idea edit                              # paste, save
```

## Tag conventions

Tags are just `#word` substrings in the backlog text. No registry, no validation.

Common tags from my own use:

- `#bug` — broken behavior
- `#refactor` — internal-only change
- `#perf` — speed/memory
- `#dx` — developer-experience polish
- `#docs` — docs-only

```bash
idea list | grep '#bug'   # tags are plain text — filter with grep
```
