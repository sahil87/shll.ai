# Standard: config-home

Where a [shll toolkit](https://shll.ai) tool's configuration lives, and how override layers stack. Every tool that has a config file resolves it under one fixed, environment-independent root — `$HOME/.config/<tool-name>/` — and layers overrides in one order. The point is determinism: a tool that is simultaneously a daemon, a CLI, and agent-driven must provably read the same config in every process context, and a path that an environment variable can move silently forks which file is read.

This page is the **producer-facing standard**: how your tool must resolve its config path and stack its override layers. It exists because two tools (`hop`, `idea`) independently converged on the same pattern with near-identical justifying comments, and a third (`run-kit`) audit found the opposite — config scattered across seven surfaces with no precedence rule, where the wrong home (an env var) was reachable faster than the right one.

Scope is **binary**: the obligations are satisfied by the compiled tool's runtime path resolution. It binds every toolkit tool that has — or grows — a config file; a tool with no config file (`wt`, `tu` today) is bound the day it adds one.

This standard implements principle №6 of the [toolkit CLI principles](principles.md) (stateless, therefore retry-safe — a config path that cannot be moved by the environment is the config-side face of "same invocation, same behavior"), and its error path serves principle №4 (fail fast with actionable errors).

## One fixed config root

The config root is a **constant**, derived from `$HOME` and nothing else:

- **MUST resolve the config directory as `$HOME/.config/<tool-name>/`**, built with `filepath.Join` from `$HOME` — the only environment input, unavoidable.
- **`<tool-name>` is the full tool name** (`run-kit`, not `rk`) — the same one-string identity the [update standard](update.md) requires across repo, formula, and binary.
- **MUST NOT honor `$XDG_CONFIG_HOME`** and **MUST NOT use `os.UserConfigDir`** (which resolves to `~/Library/Application Support` on macOS). The path is identical on every platform and in every process context *by construction*.
- **An unset `$HOME` is an actionable error**, never a silent fallback (hop: `hop: $HOME is not set; cannot locate config`).
- **SHOULD pin the path with a test** asserting environment variables cannot move it (hop has one).

**Why not XDG?** XDG honor is the conventional choice, and it is rejected deliberately. A daemon started by launchd/systemd, a CLI in the user's shell, and an agent in a tmux pane can each see a different `$XDG_CONFIG_HOME` — and then each reads a different config, with nothing telling anyone why behavior forked. Determinism outranks convention here. A dotfiles user who wants the directory elsewhere symlinks it.

**Failure mode.** An env-movable config path turns "works on my machine" into "works in my *shell*": the daemon honors one value, the CLI another, and an agent debugging the difference reads a third. Each context is internally consistent and collectively wrong.

## One override order

- **MUST layer overrides as: code defaults < config file < env < CLI flag.** One cascade, no per-key exceptions — a key where the file outranks env (or any other inversion) makes the whole order unlearnable.

## Env vars are deployment bootstrap only

The cascade's env layer is safe only because it is narrow:

- **Env forms MUST exist only for deployment bootstrap keys** — values needed at or before process start, per-deployment (e.g. run-kit's `RK_PORT`, `RK_HOST`).
- **Env MUST NOT be an override channel for preference keys.** The failure this bans is real: a preference gate (run-kit's `RK_AUTO_NAME`) landed as an env var because that surface was reachable faster than the settings store — and env-var preferences are invisible to any UI, unlisted in any file, and differ silently between process contexts.

**Failure mode.** Every preference that ships as an env var re-opens the fork this standard closes: the daemon and the CLI disagree about a user preference, and no config file records what was set.

## State is not config — the XDG asymmetry

State dirs get the latitude config is denied:

- A tool **MAY keep an XDG-honoring state dir** (`$XDG_STATE_HOME/<tool-name>/`) — but **only for droppable, never-authoritative files** (caches, snapshots, recovery backups). If deleting the directory changes behavior beyond a cold cache, it is not state and does not belong there.

The asymmetry is deliberate: an env mismatch on a droppable cache cannot fork behavior, which is exactly why config — where a mismatch does fork behavior — gets no XDG honor.

## The fab-kit exception

`fab-kit`'s `~/.fab-kit/` is the **documented exception** to the fixed-`~/.config` pattern: its config is co-located with its version cache, per fab-kit's own decision record (XDG rejected there too — the determinism reasoning is shared; only the root differs). The exception list is **closed** — new tools get no exception.

## Conformance (verified 2026-08-23)

- **`hop` is the reference implementation**: `src/internal/config/resolve.go` — fixed `$HOME/.config/hop/hop.yaml`, `filepath.Join` from `$HOME`, no `$HOP_CONFIG`, no `$XDG_CONFIG_HOME`, and a test asserting env vars cannot move the path.
- **`idea` conforms**: `systemConfigDir` → `~/.config/idea`, "$XDG_CONFIG_HOME is intentionally ignored" — so `--help` is accurate everywhere.
- **`run-kit` is adopting**: its config-consolidation plan moves `~/.rk/settings.yaml` to `$HOME/.config/run-kit/config.yaml` under this standard.
- **`wt`, `tu`**: no config file today — bound when they grow one.
- **`fab-kit`**: the documented exception above.

## Verifying conformance

Before shipping a change that adds or touches a tool's config surface:

- The config path is built with `filepath.Join` from `$HOME`; no `$XDG_CONFIG_HOME` and no `os.UserConfigDir` anywhere on the config-resolution path.
- The directory name is the full tool name.
- An unset `$HOME` produces an actionable error naming the problem.
- Override precedence is exactly `defaults < config file < env < CLI flag`, with no per-key inversions.
- Every key with an env form is a deployment bootstrap key (needed at/before process start); no preference key reads the environment.
- Any XDG-honoring state dir holds only droppable, never-authoritative files.
- A test pins the fixed config path against environment variables.
