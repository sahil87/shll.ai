One command to install, update, and shell-wire every tool in the [@sahil87 toolkit](https://shll.ai) (`fab-kit`, `rk`, `tu`, `hop`, `wt`, `idea`). `shll` doesn't replace the per-tool CLIs — it composes them.

## Why shll?

- **One-shot install** — `shll install` runs `brew install sahil87/tap/<formula>` for every roster tool you don't already have. Idempotent and safe to re-run.
- **One-line shell integration** — `shll shell-setup` appends a single eval line to your rc file that wires up `hop`, `wt`, and any future toolkit shell-init in one block. No more managing four eval lines.
- **One update for everything** — `shll update` runs `brew update` once, then upgrades every installed roster tool in sequence. Skips ones you don't have. Skips itself if it wasn't installed via brew.
- **Paste-friendly version dump** — `shll version` prints one row per tool, ideal for bug reports.

Per-tool CLIs continue to work standalone — `shll` wraps them, it does not replace them.

## Quick start

From a clean machine to a fully wired toolkit:

```sh
brew install sahil87/tap/shll       # or: brew install sahil87/tap/all
shll install                        # brew-installs every roster tool you're missing
shll shell-setup --trust-tap        # wire your shell + record trust for sahil87/tap
exec $SHELL                         # reload so the shell integration takes effect
```

That's it. `hop`, `wt`, and the other tools are now installed and their shell integration is live.

For the deeper install guide — brew vs the `all` meta-formula, from-source builds, the full `shll shell-setup` rc-wiring, and the tap-trust matrix — see [docs/site/install.md](docs/site/install.md).

`--trust-tap` records genuine Homebrew trust for `sahil87/tap` so brew stops nagging about non-official taps — drop it (`shll shell-setup`) to leave brew's tap-trust posture unchanged. See [`--trust-tap`](#--trust-tap--resolve-the-homebrew-tap-trust-warning) for what it does and the side effects, or [Troubleshooting](#tap-sahil87tap-is-allowed-by-default-warning) for the lighter alternatives.

## Install

```sh
brew install sahil87/tap/shll
```

`shll` is also installed transitively via the `all` meta-formula (`brew install sahil87/tap/all`), which pulls in every roster tool at once.

For the full guide — brew vs `all`, from-source builds, shell wiring, and the `--trust-tap` ceremony — see [docs/site/install.md](docs/site/install.md).

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
shll install
```

Iterates the roster (`fab-kit`, `rk`, `tu`, `hop`, `wt`, `idea`) and runs `brew install sahil87/tap/<formula>` for each one that's missing. Already-installed tools are skipped silently. Does NOT upgrade — use `shll update` for that.

### `shll update` — upgrade everything

```sh
shll update
```

Runs `brew update --quiet` once, then `brew upgrade sahil87/tap/shll` (when shll itself was installed via brew), then `brew upgrade sahil87/tap/<formula>` for every roster tool currently installed. Brew's progress streams directly to your terminal.

### `shll shell-setup` — wire the rc file (recommended)

> Still works under the legacy alias `shll shell-install` — same command, unchanged behavior.

```sh
shll shell-setup              # auto-detect shell, append eval block to your rc file
shll shell-setup --print      # dry-run: print the block to stdout, modify nothing
shll shell-setup --uninstall  # clean removal of the block
shll shell-setup --trust-tap  # also record genuine Homebrew trust for sahil87/tap
shll shell-setup --rc-file ~/.zshrc.local   # override the target path
```

The appended block is sentinel-wrapped and idempotent — re-running is a no-op when the lines are already present:

```sh
# >>> shll >>>
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

The rc file is opened with plain `O_APPEND`, so dotfile-manager symlinks (chezmoi, dotbot, stow, yadm) are preserved. Default targets: `${ZDOTDIR:-$HOME}/.zshrc` for zsh, `$HOME/.bash_profile` (macOS) or `$HOME/.bashrc` (Linux) for bash.

#### `--trust-tap` — resolve the Homebrew tap-trust warning

`--trust-tap` is not a mode — it **composes** with the default, `--print`, and `--uninstall` paths. On a normal install it does the full genuine-trust setup in one command:

1. Runs `brew trust --tap sahil87/tap` (Homebrew's own trust ceremony — idempotent, safe to re-run).
2. Adds `export HOMEBREW_REQUIRE_TAP_TRUST=1` to the shll block, so brew enforces explicit trust:

```sh
# >>> shll >>>
export HOMEBREW_REQUIRE_TAP_TRUST=1
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

It works whether or not you've already run `shll shell-setup` — the export line is merged into your existing block (no duplicates, no second block). `--trust-tap --print` shows the resulting combined block without touching anything. `--uninstall` removes the whole block (both lines) but does **not** run `brew untrust` — the trust record is inert without the policy line and harmless to leave; reverse it yourself with `brew untrust --tap sahil87/tap` if you want.

If your Homebrew is too old to ship `brew trust` (or brew isn't installed), `--trust-tap` degrades gracefully: it writes the eval line so you still get shell integration, **skips** the export line (setting it without a trust record would make brew *block* the tap), and tells you about the lighter env-var alternatives below.

### `shll shell-init <shell>` — composed shell-init

If you'd rather wire the eval line by hand, this is what `shll shell-setup` writes to your rc file:

```sh
eval "$(shll shell-init zsh)"   # in ~/.zshrc
eval "$(shll shell-init bash)"  # in ~/.bashrc
```

The output is the concatenation (in roster order) of every installed sahil87 tool's own shell-init. What each roster tool is for, and what it adds to your shell:

| Tool | What it's for | What it adds to your shell |
|------|---------------|----------------------------|
| `hop` | fast directory navigation / bookmarks (`cd` on steroids) | `hop` shell function (bare-name `cd`, verb dispatch, tool-form), `h` / `hi` aliases, completion |
| `wt`  | git worktree manager — create, switch, and clean up worktrees | `wt` shell function wrapper (so the "Open here" menu option can `cd` your shell), completion |
| `tu`  | AI coding-assistant cost/usage tracker (Claude Code, Codex, OpenCode) | completion |
| `idea` | worktree-aware idea / backlog capture from the terminal (markdown-first) | completion |
| `rk`  | run-kit — web-based tmux orchestration for parallel agent workspaces | completion |
| `fab-kit` | `fab` — spec-driven change workflow (this repo's own pipeline) | completion |

`hop` and `wt` are the only tools that ship *shell functions* — those need eval-time installation because a function defined inside the binary can't escape into the parent shell. Everything else is completion, which the shell sources lazily on tab. Per-tool `<tool> shell-init <shell>` continues to work standalone if you'd rather wire them up individually.

### `shll version` — paste-friendly version dump

```sh
$ shll version
shll     v0.0.5
fab-kit  v1.9.4
rk       v1.5.3
tu       v0.4.13
hop      v0.1.5
wt       v0.0.5
idea     v0.0.2
```

One row per tool. Uninstalled tools render as `not installed`. Drop the whole block into a bug report.

## How composition works

shll has no state, no database, and no special knowledge of the tools it wraps. Every subcommand is a thin coordinator over the per-tool CLIs:

| `shll` command | What it actually runs |
|----------------|------------------------|
| `shll install` | `brew install sahil87/tap/<formula>` per missing tool |
| `shll update` | `brew update`, then `brew upgrade sahil87/tap/<formula>` per installed tool |
| `shll shell-init zsh` | concatenates the stdout of each installed tool's `<tool> shell-init zsh` |
| `shll version` | invokes `<tool> --version` per tool, formats as a table |

Per Constitution Principle IV (Composition, Not Replacement): `hop update`, `wt shell-init`, etc. continue to work standalone. shll's only job is to fan-out, collect output, and degrade gracefully when a tool is missing.

## Troubleshooting

### "Tap sahil87/tap is allowed by default" warning

Running `shll update` (or any shll command that touches brew) may print something like:

```
Warning: Tap sahil87/tap is allowed by default.
Homebrew will require explicit trust for non-official taps in a future release.
Set `HOMEBREW_REQUIRE_TAP_TRUST=1` to require explicit trust now or
`HOMEBREW_NO_REQUIRE_TAP_TRUST=1` to keep allowing by default.
Hide these hints with `HOMEBREW_NO_ENV_HINTS=1` (see `man brew`).
```

**This is a Homebrew env-hint, not a shll error.** shll surfaces it only because it wraps `brew` — and because `shll update` shells out to brew several times (`brew update`, the shll self-upgrade, per-tool upgrades), the same hint can print **2–3×** per command. It means brew hasn't been told whether you trust the non-official `sahil87/tap`.

**Recommended fix — record genuine trust:**

```sh
shll shell-setup --trust-tap
```

See [`shll shell-setup --trust-tap`](#--trust-tap--resolve-the-homebrew-tap-trust-warning) above for what this does (the `brew trust` ceremony, the `HOMEBREW_REQUIRE_TAP_TRUST=1` export, and how it composes with `--print`/`--uninstall`).

**Lighter alternatives (set these yourself if you prefer):**

| Env var | Effect |
|---------|--------|
| `export HOMEBREW_NO_REQUIRE_TAP_TRUST=1` | Keep allowing non-official taps by default; stop nagging. Punts the trust decision. |
| `export HOMEBREW_NO_ENV_HINTS=1` | Silence *all* brew env-hints (blunt — hides future hints too). |

shll will **not** set these for you. Trusting a tap — or opting out of the warning — is your decision; `--trust-tap` only persists a choice you made by typing it.

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
