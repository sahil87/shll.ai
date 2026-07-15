---
title: Install everything
description: One line, the whole toolkit.
---

```bash
curl -fsSL https://shll.ai/install | sh
```

The script bootstraps `shll` (trusts + brew-installs its formula), then hands off to `shll install`, which trusts and installs every roster tool you're missing. Requires [Homebrew](https://brew.sh) — the script exits with a pointer if it's absent. (Only want some of the tools? See [Per-tool install](#per-tool-install).)

Then wire your shell:

```bash
shll shell-setup                        # wire your shell integration
run-kit agent-setup                     # optional, once per machine: agent state in the run-kit dashboard
exec $SHELL                             # reload so the shell integration takes effect
```

## What the one-liner runs

The script is [a few dozen auditable lines](https://github.com/sahil87/shll/blob/main/scripts/install.sh) equivalent to:

```bash
brew trust --formula sahil87/tap/shll   # bootstrap: trust shll's formula
brew install sahil87/tap/shll           # bootstrap: install shll itself
shll install                            # trusts + brew-installs every roster tool you're missing
```

The first two lines are a one-time **bootstrap**: shll can't trust its own formula before it exists, so you trust-and-install `shll` directly with brew. From there, `shll install` owns trust for the other six tools — it runs `brew trust --formula sahil87/tap/<formula>` before each install (drop it with `--no-trust` if you manage trust yourself).

That's it. `shll install` is idempotent and safe to re-run: it installs only the roster tools you're missing and does **not** upgrade what's already there. To upgrade installed tools, use `shll update`.

> **Why `brew trust` first?** Homebrew 6.0 made tap-trust a hard install requirement (it defaults `HOMEBREW_REQUIRE_TAP_TRUST=1`). shll's formulae download a binary and run a sandboxed install that re-checks trust against a persisted record, so naming the formula on the CLI isn't enough — you must trust it first. Requires Homebrew ≥ 6.0.4; on 6.0.0–6.0.3, run `brew update` first.

Prefer to pull everything in one shot? The `all` meta-formula installs every roster tool at once:

```bash
brew trust --formula sahil87/tap/all && brew install sahil87/tap/all
```

## Verify

```bash
shll version
```

`version` prints a paste-friendly dump of every installed tool and its version — handy for confirming the install worked and for bug reports.

## Optional: run-kit agent state

The `run-kit agent-setup` line above is optional and once per machine — it lights up live agent state in [run-kit](/tools/run-kit/overview/)'s dashboard: **active** / **waiting** / **idle** for every pane running a coding agent. It installs agent-harness hooks into your user-global agent config (v1: Claude Code) that report each pane's lifecycle state; until it's run, agent state shows `—` in the dashboard. It shows the settings diff and asks before writing, re-running is idempotent, and `run-kit agent-setup --uninstall` removes exactly the run-kit-owned entries. Details in the [run-kit install guide](/tools/run-kit/install/).

## Per-tool install

If you only want a subset of the tools, pass their names to the one-liner (this also installs `shll`, which handles the trust ceremony for you):

```bash
curl -fsSL https://shll.ai/install | sh -s -- hop wt
```

Or skip the meta-installer entirely — every tool has its own brew formula and you opt in piece by piece:

```bash
brew trust --formula sahil87/tap/idea && brew install sahil87/tap/idea
brew trust --formula sahil87/tap/fab-kit && brew install sahil87/tap/fab-kit
# etc.
```

(Each formula needs its own `brew trust` on Homebrew 6.0+ — the same trust `shll install` records for you automatically.)

## Update

```bash
shll update
```

Updates every installed tool to the latest tap version. To pin a specific tool, install it directly via brew instead of through `shll install`.

---

Next: head to a [tool overview](/tools/idea/overview/) or learn the [daily flow](/workflows/daily-flow/).
