# Workflows

Task-oriented walkthroughs for `shll`, the meta-CLI for the [@sahil87 toolkit](https://shll.ai). Each section starts from a goal and shows which `shll` command gets you there and what it actually does under the hood. For install paths and shell wiring, see [Install & shell wiring](install.md).

## Clean-machine bootstrap

From a fresh machine to a fully wired toolkit:

```sh
brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll   # bootstrap: trust + install shll itself
shll install                                                             # trusts (per-formula) + installs the other 6
shll shell-setup                                                         # pure rc wiring — no trust flag
exec $SHELL                                                              # reload so the shell integration takes effect
```

Step by step:

1. **`brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll`** puts the `shll` binary on `PATH`. The `brew trust` is required on Homebrew 6.0+ (which makes tap-trust a hard install requirement) — shll's formula runs a sandboxed install that needs a real trust record. shll can't trust its own formula before it exists, so this one-time bootstrap uses `brew trust` directly. (Requires Homebrew ≥ 6.0.4; on 6.0.0–6.0.3, `brew update` first. Or `brew trust --formula sahil87/tap/all && brew install sahil87/tap/all` to pull the whole toolkit at once, in which case the next step is a no-op.)
2. **`shll install`** walks the roster (leaves-first: `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`) and, for each tool you don't already have, runs `brew trust --formula sahil87/tap/<formula>` then `brew install` — so it owns trust for the other six. Idempotent — re-running installs only what's still missing. Pass `--no-trust` to skip the trust step if you manage trust yourself; see the [tap-trust troubleshooting](install.md#tap-trust-troubleshooting).
3. **`shll shell-setup`** appends a single sentinel-wrapped eval block to your rc file. It is pure rc-wiring — trust is `shll install`'s job, not shell-setup's (there is no `--trust-tap` flag).
4. **`exec $SHELL`** reloads the shell so the eval line takes effect; `hop`, `wt`, and the rest are now live.

## Day-to-day: `shll update`

```sh
shll update
```

One command to upgrade everything you have installed. The sequence:

1. **`brew update --quiet`, exactly once.** A single metadata refresh for the whole run — `shll` tells each delegated per-tool update that *advertises* `--skip-brew-update` to skip its own internal `brew update`, so there's no redundant refresh. (A tool predating that flag runs its own `brew update`, costing one extra refresh for that tool — see [`shll update`](install.md).)
2. **Self-upgrade.** If `shll` itself was installed via brew, it runs `brew upgrade sahil87/tap/shll` first. A from-source `shll` is skipped here (no formula to upgrade).
3. **Per-tool upgrade, by delegation.** For each *installed* roster tool, `shll update` invokes that tool's **own `update` subcommand** (with `--skip-brew-update` when the tool advertises it) rather than calling `brew upgrade` directly. This preserves each tool's post-upgrade side effects — e.g. `rk`'s daemon restart — that a bare `brew upgrade` would silently drop. A tool that exposes no `update` subcommand falls back to `brew upgrade`.

Uninstalled tools are skipped (graceful degradation), and the loop is best-effort: a single tool's failure doesn't abort the rest. `brew`'s progress streams straight to your terminal.

`shll update` prints a `[N/M]` progress header before each tool and a timing summary tail at the end (`Done — N of M tools succeeded in <dur>.`, or a `X succeeded, Y failed in <dur>` form on partial failure). The tail reports exit-code outcomes and run duration — it never claims "updated" vs. "up-to-date", since the sub-tools' own output streamed past.

Preview without changing anything:

```sh
shll update --dry-run
```

`--dry-run` runs the read-only probes (so the preview is accurate) but performs **no writes** — no `brew update`, no `brew upgrade`, no `<tool> update`. It prints an aligned table of the exact commands the real run would execute, in roster order (`shll (self)` first when brew-installed), then exits 0. The same flag exists on `shll install`.

You can also scope a run to specific tools: `shll update hop wt` upgrades just those (plus `shll update shll` for the self-upgrade alone). A named-but-not-installed target is an error here (unlike a whole-roster run, which silently skips it).

## Composing shell-init

```sh
eval "$(shll shell-init zsh)"
```

`shll shell-init <shell>` concatenates the `shell-init` output of every installed sahil87 tool, in roster order, into a single blob — replacing what would otherwise be one eval line per tool. (You normally don't run this by hand; [`shll shell-setup`](install.md#shll-shell-setup--wire-the-rc-file-recommended) writes the eval line for you.)

The composition is **eval-safe by construction**, which matters because the output is fed straight to `eval`:

- A tool that isn't installed (binary not on `PATH`) is **silently omitted** — no error, no partial output.
- A tool whose `shell-init` errors has its output **dropped**; the error note goes to stderr only, never into the eval'd stdout.
- `shll` injects only `#`-prefixed comment separators (`# ── <tool> ──`) between blocks — shell no-ops, never executable code or color escapes.

So `eval "$(shll shell-init zsh)"` is safe even when `shll` exits non-zero or a sub-tool is broken: at worst you get a shell with one fewer integration loaded, never a parse error. The order is deterministic (roster order), so a composed blob reads the same way every time.

## Version dump for bug reports

```sh
$ shll version
shll     v0.0.5
wt       v0.0.5
idea     v0.0.2
tu       v0.4.13
rk       v1.5.3
hop      v0.1.5
fab-kit  v1.9.4
```

One column-aligned row for `shll` itself plus each roster tool — plain text, no colors, designed to paste cleanly into a Slack thread or GitHub issue. An uninstalled tool renders as `not installed`. Each tool's `--version` invocation has a 2-second timeout, so one hung tool can't block the dump (a timeout also shows as `not installed`); worst case the whole table finishes in well under 15 seconds even if every tool hangs.

## The composition model

`shll` has no state, no database, and no special knowledge of the tools it wraps. Every subcommand is a thin coordinator over the per-tool CLIs and `brew`:

| `shll` command | What it actually runs |
|----------------|------------------------|
| `shll install` | `brew trust --formula sahil87/tap/<formula>` then `brew install sahil87/tap/<formula>` per missing tool (`--no-trust` skips the trust step) |
| `shll update` | `brew update --quiet` once, self-upgrade, then each installed tool's own `update` (delegated; `brew upgrade` fallback only when a tool has no `update`) |
| `shll shell-init zsh` | concatenates the stdout of each installed tool's `<tool> shell-init zsh` |
| `shll version` | invokes `<tool> --version` per tool, formats as a table |

This is Constitution Principle IV — **Composition, Not Replacement**: `hop update`, `wt shell-init`, etc. continue to work standalone. `shll`'s only job is to fan out, collect output, and degrade gracefully when a tool is missing.

## See also

- [Install & shell wiring](install.md) — every install path and the full `shll shell-setup` rc-wiring contract.
- [shll.ai](https://shll.ai) — the always-current command reference.
