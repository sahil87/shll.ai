One command to install, update, and shell-wire every tool in the [@sahil87 toolkit](https://shll.ai) (`wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`). `shll` doesn't replace the per-tool CLIs — it composes them.

## Why shll?

- **One-shot install** — `shll install` records per-formula Homebrew trust and then runs `brew install sahil87/tap/<formula>` for every roster tool you don't already have. Idempotent and safe to re-run.
- **One-line shell integration** — `shll shell-setup` appends a single eval line to your rc file that wires up `hop`, `wt`, and any future toolkit shell-init in one block. No more managing four eval lines.
- **One update for everything** — `shll update` runs `brew update` once, then upgrades every installed roster tool in sequence. Skips ones you don't have. Skips itself if it wasn't installed via brew.
- **Paste-friendly version dump** — `shll version` prints one row per tool, ideal for bug reports.
- **At-a-glance roster** — `shll list` shows every managed tool with its install status, a one-line description, and its repo (plus `--json` for scripting).
- **One-command health check** — `shll doctor` verifies each tool is installed, runnable, and shell-wired, with an actionable fix on every problem line.

Per-tool CLIs continue to work standalone — `shll` wraps them, it does not replace them.

## Quick start

From a clean machine to a fully wired toolkit:

```sh
brew trust --formula sahil87/tap/shll            # bootstrap: trust shll
brew install sahil87/tap/shll                    # bootstrap: install shll itself
shll install                                     # trusts (per-formula) + installs the other 6
shll shell-setup                                 # rc wiring
exec $SHELL                                      # reload so the shell integration takes effect
```

That's it. `hop`, `wt`, and the other tools are now installed and their shell integration is live.

The first line is a one-time **bootstrap**: shll can't trust its own formula before it exists, so you trust-and-install `shll` itself with brew directly. From there, `shll install` owns trust for the other six tools — it runs `brew trust --formula sahil87/tap/<formula>` before each install (drop the trust step with `--no-trust` if you manage trust yourself). Prefer it as one chained line? `brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll && shll install && shll shell-setup && exec $SHELL`.

> **Why `brew trust` first?** Homebrew 6.0 made tap-trust a **hard install requirement** (it defaults `HOMEBREW_REQUIRE_TAP_TRUST=1`). shll's tap formulae download a binary and run a sandboxed `def install` (not a bottle pour), and that sandboxed step re-checks trust against a real persisted trust record — so naming the formula on the CLI is not enough; you must trust it first. Requires **Homebrew ≥ 6.0.4** (an earlier 6.0.x Linux sandbox bug is fixed there); if you're on 6.0.0–6.0.3, run `brew update` first. See [Troubleshooting](#tap-sahil87tap-must-be-trusted-before-install) for the full explanation.

For the deeper install guide — brew vs the `all` meta-formula, from-source builds, the full `shll shell-setup` rc-wiring, and the tap-trust details — see [docs/site/install.md](docs/site/install.md).

## Install

```sh
brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll
```

The `brew trust` is required on Homebrew 6.0+ (which defaults to requiring explicit tap trust) — shll's formula runs a sandboxed install that needs a real trust record. Requires Homebrew ≥ 6.0.4; on 6.0.0–6.0.3, `brew update` first.

`shll` is also installed transitively via the `all` meta-formula (`brew trust --formula sahil87/tap/all && brew install sahil87/tap/all`), which pulls in every roster tool at once.

For the full guide — brew vs `all`, from-source builds, shell wiring, and the tap-trust details — see [docs/site/install.md](docs/site/install.md).

### From source

```sh
git clone https://github.com/sahil87/shll.git
cd shll
just install
```

Builds the binary and copies it to `~/.local/bin/shll`. Make sure that directory is on your `$PATH`.

## Commands

### `shll install` — bootstrap missing tools

```sh
shll install                 # trust + install every missing roster tool
shll install hop wt          # install only a named subset
shll install --no-trust      # skip the per-formula trust step
shll install --dry-run       # preview the brew install plan, change nothing
```

Iterates the roster in leaves-first order (`wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`) and, for each one that's missing, records per-formula Homebrew trust (`brew trust --formula sahil87/tap/<formula>`) **before** running `brew install sahil87/tap/<formula>`. Homebrew 6.0 makes tap-trust a hard install requirement, so this is what lets the install proceed; `brew trust` is idempotent, so re-runs stay clean. Already-installed tools are skipped silently. Does NOT upgrade — use `shll update` for that.

Pass `--no-trust` to skip the trust step entirely (for users who manage trust themselves). If your Homebrew is too old to ship `brew trust` (pre-6.0, where trust isn't required anyway), the trust step is skipped gracefully and the install proceeds.

Pass one or more tool names to install only that subset (processed in roster order regardless of arg order); an unknown name is a hard error. Unlike `shll update`, `shll` itself is NOT a valid install target — you can't brew-install the running orchestrator (it's the one-time bootstrap `brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll`). `--dry-run` runs the read-only install-status probes, prints the exact `brew install` commands the real run would execute, then exits without installing anything.

Each install prints a `[N/M]` progress header, and a timing summary tail closes the run.

### `shll update` — upgrade everything

```sh
shll update                  # upgrade shll + every installed roster tool
shll update shll             # upgrade only shll itself
shll update hop wt           # upgrade only a named subset
shll update --dry-run        # preview the upgrade plan, change nothing
```

Runs `brew update --quiet` once, then `brew upgrade sahil87/tap/shll` (when shll itself was installed via brew), then delegates to each installed roster tool's **own `update` subcommand** (passing `--skip-brew-update` when the tool advertises it) so each tool's post-upgrade side effects — e.g. `rk`'s daemon restart — are preserved. A roster tool that exposes no `update` subcommand falls back to `brew upgrade sahil87/tap/<formula>`. Uninstalled tools are skipped silently, and the loop is best-effort — one tool's failure doesn't abort the rest. Brew and per-tool progress stream directly to your terminal.

Pass one or more tool names to scope the run to a subset (valid targets: `shll`, `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`), processed in roster order regardless of arg order. A named-but-not-installed target is a hard error here (unlike the whole-roster sweep, which silently skips it). `--dry-run` runs the read-only probes, prints the exact commands the real run would execute (`shll (self)` first when brew-installed), then exits without writing anything.

Each tool gets a `[N/M]` progress header, and a timing summary tail (`Done — N of M tools succeeded in <dur>.`) closes the run.

### `shll shell-setup` — wire the rc file (recommended)

> Still works under the legacy alias `shll shell-install` — same command, unchanged behavior.

```sh
shll shell-setup              # auto-detect shell, append eval block to your rc file
shll shell-setup --print      # dry-run: print the block to stdout, modify nothing
shll shell-setup --uninstall  # clean removal of the block
shll shell-setup --rc-file ~/.zshrc.local   # override the target path
```

`shell-setup` is **pure rc-wiring** — it maintains only the eval line and touches no Homebrew state. (Tap trust lives in `shll install`, which trusts each formula it installs; there is no `--trust-tap` flag.) The appended block is sentinel-wrapped and idempotent — re-running is a no-op when the line is already present:

```sh
# >>> shll >>>
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

The rc file is opened with plain `O_APPEND`, so dotfile-manager symlinks (chezmoi, dotbot, stow, yadm) are preserved. Default targets: `${ZDOTDIR:-$HOME}/.zshrc` for zsh, `$HOME/.bash_profile` (macOS) or `$HOME/.bashrc` (Linux) for bash.

> **Upgrading from an older shll?** If a previous `shll shell-setup --trust-tap` left an `export HOMEBREW_REQUIRE_TAP_TRUST=1` line in your block, the next `shll shell-setup` run cleans it out automatically (the block is rewritten to the eval line only). That export merely re-set Homebrew 6.0's default and was never what unblocked installs — the `brew trust` record is. `--uninstall` removes the whole block as before.

### `shll shell-init <shell>` — composed shell-init

If you'd rather wire the eval line by hand, this is what `shll shell-setup` writes to your rc file:

```sh
eval "$(shll shell-init zsh)"   # in ~/.zshrc
eval "$(shll shell-init bash)"  # in ~/.bashrc
```

The output is the concatenation (in roster order — leaves-first: `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`) of every installed sahil87 tool's own shell-init, with a `# ── <tool> ──` comment separator before each block. What each roster tool is for, and what it adds to your shell:

| Tool | What it's for | What it adds to your shell |
|------|---------------|----------------------------|
| `wt`  | git worktree manager — create, switch, and clean up worktrees | `wt` shell function wrapper (so the "Open here" menu option can `cd` your shell), completion |
| `idea` | worktree-aware idea / backlog capture from the terminal (markdown-first) | completion |
| `tu`  | AI coding-assistant cost/usage tracker (Claude Code, Codex, OpenCode) | completion |
| `rk`  | run-kit — web-based tmux orchestration for parallel agent workspaces | completion |
| `hop` | fast directory navigation / bookmarks (`cd` on steroids) | `hop` shell function (bare-name `cd`, verb dispatch, tool-form), `h` / `hi` aliases, completion |
| `fab-kit` | `fab` — spec-driven change workflow (this repo's own pipeline) | completion |

`hop` and `wt` are the only tools that ship *shell functions* — those need eval-time installation because a function defined inside the binary can't escape into the parent shell. Everything else is completion, which the shell sources lazily on tab. The output is eval-safe: a tool that isn't installed is silently omitted, and a tool whose shell-init errors has its output dropped (the error goes to stderr only). Per-tool `<tool> shell-init <shell>` continues to work standalone if you'd rather wire them up individually.

### `shll version` — paste-friendly version dump

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

One row for `shll` itself plus each roster tool, in roster order. Uninstalled tools render as `not installed`. Each tool's `--version` call has a 2-second timeout, so one hung tool can't block the dump — a timeout also shows as `not installed`. Drop the whole block into a bug report.

### `shll list` — the toolkit roster

```sh
$ shll list
ok  shll     the manager for the shll toolkit                                        https://github.com/sahil87/shll
ok  wt       Git worktree management — create, list, open, delete worktrees          https://github.com/sahil87/wt
ok  idea     Backlog idea management from the terminal                               https://github.com/sahil87/idea
ok  tu       Token-usage tracker for AI coding tools (Claude Code, Codex, OpenCode)  https://github.com/sahil87/tu
ok  rk       Run-kit — tmux session manager with a web UI                            https://github.com/sahil87/run-kit
ok  hop      Fast directory/project jumping across worktrees                         https://github.com/sahil87/hop
ok  fab-kit  Spec-driven workspace & workflow toolkit (the `fab` CLI)                https://github.com/sahil87/fab-kit
```

`shll` leads, then one row per managed tool in roster order: an install-status marker (`ok` / `--`, or a green `✓` / red `✗` on a terminal), the name, a one-line description, and the source-repo URL. The leading `shll` row is the manager itself — it's surfaced so the toolkit reads as one family with `shll` as its manager-member (the same shll-first ordering `shll version` and `shll update` already use). Install status reuses the same PATH probe as `shll version` (it's install-mechanism agnostic, not a Homebrew check); a missing tool is shown as missing, never an error, so `shll list` always exits 0.

```sh
shll list --json    # JSON array, no color — pipe into jq
```

`--json` emits a `{name, description, repo, installed}` array (repo is the full resolved URL), suitable for `shll list --json | jq`. The leading `shll` object additionally carries `"self": true` (absent on the six managed tools), so a script driving `brew install` can recover just the managed set with `jq 'map(select(.self != true))'`.

### `shll doctor` — verify install + wiring

```sh
$ shll doctor
shll     OK  v0.0.16
wt       OK  v0.0.16  wired
idea     OK  v0.0.7
tu       OK  v0.4.17  wired
rk       OK  v2.2.3
hop      OK  v0.1.16  wired
fab-kit  OK  v2.1.1
```

`shll` leads with an always-OK row (it's the running binary; version from the build, no wiring or trust check), then for every roster tool `doctor` checks that (1) the binary is on `PATH`, (2) it reports a version (so a half-installed or stale brew link is caught), (3) its Homebrew formula is **trusted** (so a future `brew upgrade` won't be refused on Homebrew 6.0+), and (4) — for the tools that ship shell integration (`wt`, `tu`, `hop`) — shll's composed eval block is present in your rc file. Each tool gets one line with an `OK` / `WARN` / `FAIL` marker, and every non-OK line carries an actionable suggestion (e.g. `run 'brew install …'`; `formula not trusted — run 'shll install' …`; or `not wired — run 'shll shell-setup' then 'exec $SHELL'`). The always-OK `shll` row never affects the exit code or the problem count (a single roster failure still reads `1 of 6`, never `1 of 7`).

A missing or non-running binary is `FAIL`; an installed-but-untrusted or installed-but-unwired tool is `WARN` (it still works when invoked directly — but an untrusted tool's next upgrade will be refused). The trust sub-check queries `brew trust --json=v1` read-only (it never reads `~/.homebrew/trust.json` directly) and is skipped silently when your Homebrew is too old to ship `brew trust`. `doctor` is strictly **read-only** — it never installs, upgrades, trusts, or edits your rc file — and it **exits non-zero if any tool is FAIL**, so it's scriptable in CI. Pass `--json` for a machine-readable array (one object per tool) under the same checks and exit contract.

## How composition works

shll has no state, no database, and no special knowledge of the tools it wraps. Every subcommand is a thin coordinator over the per-tool CLIs:

| `shll` command | What it actually runs |
|----------------|------------------------|
| `shll install` | `brew trust --formula sahil87/tap/<formula>` then `brew install sahil87/tap/<formula>` per missing tool (`--no-trust` skips the trust step) |
| `shll update` | `brew update --quiet` once, self-upgrade, then each installed tool's own `update` (delegated; `brew upgrade` fallback only when a tool has no `update`) |
| `shll shell-init zsh` | concatenates the stdout of each installed tool's `<tool> shell-init zsh` |
| `shll version` | invokes `<tool> --version` per tool, formats as a table |
| `shll list` | probes each tool's install status, renders the roster (name, description, repo) |
| `shll doctor` | probes `<tool> --version` + reads your rc file, reports install + wiring health |

Per Constitution Principle IV (Composition, Not Replacement): `hop update`, `wt shell-init`, etc. continue to work standalone. shll's only job is to fan-out, collect output, and degrade gracefully when a tool is missing.

## Troubleshooting

### "Tap sahil87/tap must be trusted" before install

On **Homebrew 6.0+**, trusting `sahil87/tap` is a **hard install requirement**, not an advisory warning. Homebrew now defaults `HOMEBREW_REQUIRE_TAP_TRUST=1`, so `brew install sahil87/tap/<formula>` is **refused** until a real trust record exists. If you skipped the bootstrap step, you'll see brew refuse the install (often as an opaque sandbox build failure rather than a clear "untrusted tap" message).

**Why naming the formula on the command line isn't enough.** Trust is checked in two places:

1. At **formula-load** time, *outside* the sandbox — here naming the fully-qualified formula on the CLI (`sahil87/tap/shll`) is explicitly allowed.
2. Again during the **sandboxed `install`** — and this re-check sees the formula's *path*, not the qualified name you typed, so the CLI-naming does **not** satisfy it. A persisted trust record is genuinely required.

shll's tap formulae download a binary and run a sandboxed `def install` (they are **not** `bottle do` bottles — a true bottle *pour* runs no sandboxed install), so that second, sandboxed re-check always fires. That's why you must `brew trust` first.

**The fix is the bootstrap + `shll install`:**

```sh
brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll   # one-time bootstrap for shll itself
shll install                                                             # trusts (per-formula) + installs the other 6
```

`shll install` runs `brew trust --formula sahil87/tap/<formula>` before each install, so once you've bootstrapped `shll` it handles trust for the rest of the roster. `brew trust` is idempotent — re-running is safe.

**Already installed everything but `shll update` / `brew upgrade` now gets refused?** A tool installed *outside* `shll install` (manually, or before this feature) may be untrusted, and Homebrew 6.0+ refuses its next upgrade. Run `shll doctor` — it flags any installed-but-untrusted tool with `WARN` — then re-run `shll install` (idempotent; it trusts and skips the already-installed tools) or `brew trust --formula sahil87/tap/<x>` directly.

**Homebrew version floor.** This requires **Homebrew ≥ 6.0.4**. Homebrew 6.0.0–6.0.3 on Linux had a bubblewrap-sandbox bug that broke trusted installs; it's fixed in 6.0.4. If you're on an earlier 6.0.x, run `brew update` first.

**`--no-trust`.** If you manage tap trust yourself, `shll install --no-trust` skips the per-formula trust step entirely and just runs the installs.

## Reference

- [docs/site/install.md](docs/site/install.md) — install & shell-wiring guide (brew vs `all`, from-source, `shll shell-setup`, tap-trust)
- [docs/site/workflows.md](docs/site/workflows.md) — task-oriented walkthroughs (clean-machine bootstrap, day-to-day `shll update`, version dumps, the composition model)
- `shll --help` — full subcommand listing
- **Command reference at [shll.ai/tools/shll/commands](https://shll.ai/tools/shll/commands/)** — a browsable, always-current command tree. On every release, shll's CI exports its CLI help tree as a machine-readable `help/shll.json` and publishes it to [shll.ai](https://shll.ai), which renders it at that page. The export is produced by a hidden `help-dump` subcommand (internal build tooling, not a user command).
- Per-tool repos for the wrapped CLIs:
  [fab-kit](https://github.com/sahil87/fab-kit) ·
  [run-kit](https://github.com/sahil87/run-kit) ·
  [tu](https://github.com/sahil87/tu) ·
  [hop](https://github.com/sahil87/hop) ·
  [wt](https://github.com/sahil87/wt) ·
  [idea](https://github.com/sahil87/idea)
