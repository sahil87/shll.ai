# Install & shell wiring

The deep guide to getting `shll` and the rest of the [@sahil87 toolkit](https://shll.ai) onto a machine and wired into your shell. The README quick-start is the three-line version; this page covers every install path and the full `shll shell-setup` rc-wiring contract.

`shll` doesn't replace the per-tool CLIs — it composes them. Everything below either shells out to `brew` or invokes a sub-tool's own command; `shll` keeps no state of its own.

## Install via Homebrew

The normal path is the tap formula:

```sh
brew install sahil87/tap/shll
```

`shll` is also pulled in transitively by the `all` meta-formula, which installs every roster tool at once:

```sh
brew install sahil87/tap/all
```

Use the single formula when you want just `shll` and intend to bootstrap the rest with `shll install`; use `all` when you want the whole toolkit in one shot.

## `shll install` — bootstrap the missing roster tools

```sh
shll install
```

Iterates the hardcoded roster — in leaves-first order, `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit` — and runs `brew install sahil87/tap/<formula>` for each tool you don't already have. Already-installed tools are skipped silently. It is **idempotent** — safe to re-run; a second run picks up only tools added since the first.

`shll install` does **not** upgrade — it only installs what's missing. Use [`shll update`](workflows.md#day-to-day-shll-update) for upgrades. It also runs no `brew update --quiet` first: `brew install` resolves the formula via the tap directly, so the metadata refresh that `shll update` performs is intentionally absent here.

You can also target a subset by name: `shll install hop wt` installs just those two (in roster order, regardless of arg order). `shll` itself is not a valid install target — you can't `brew install` the running orchestrator.

Requires Homebrew. If `brew` isn't on `PATH`, `shll install` prints `shll install requires Homebrew. Install from https://brew.sh` and exits 1.

## From source

```sh
git clone https://github.com/sahil87/shll.git
cd shll
just install
```

`just install` builds the binary and copies it to `~/.local/bin/shll`. Make sure that directory is on your `$PATH`. A from-source build participates in `shll shell-init` and `shll version` exactly like a brew install — install detection is by binary-on-PATH, not by brew. One caveat: a non-brew `shll` is **not** self-upgraded by `shll update` (there's no brew formula to upgrade), and it reports its own version as whatever the build stamped (`dev` for an unstamped local build).

## `shll shell-setup` — wire the rc file (recommended)

`shll shell-setup` maintains a single sentinel-wrapped, shll-managed block in your shell rc file. The block holds the cross-tool eval line — and, with `--trust-tap`, a Homebrew trust-policy line. It is the recommended way to wire your shell: you don't have to know which rc file to edit, and re-running is a per-line no-op.

> Still works under the legacy alias `shll shell-install` — same command, unchanged behavior.

```sh
shll shell-setup                          # auto-detect shell from $SHELL, append the eval block
shll shell-setup zsh                      # explicit shell
shll shell-setup --print                  # dry-run: print the block to stdout, modify nothing
shll shell-setup --uninstall              # clean removal of the whole block
shll shell-setup --trust-tap              # also record genuine Homebrew trust for sahil87/tap
shll shell-setup --rc-file ~/.zshrc.local # override the target path verbatim
```

### The managed block

The block is bookended by sentinels and is idempotent — re-running is a no-op when the line is already present:

```sh
# >>> shll >>>
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

The eval line is the cross-tool composition entry point — it runs [`shll shell-init`](#shll-shell-init-shell--the-composed-eval-line) at shell startup.

### Shell auto-detection and rc-file targets

With no positional argument, `shll shell-setup` infers the shell from the basename of `$SHELL` (so `/bin/zsh` and `/usr/local/bin/zsh` both resolve to `zsh`); pass `zsh`/`bash` explicitly to override. Default rc targets:

| Shell | Default rc file |
|-------|-----------------|
| zsh | `${ZDOTDIR:-$HOME}/.zshrc` |
| bash (macOS) | `$HOME/.bash_profile` |
| bash (Linux) | `$HOME/.bashrc` |

`--rc-file <path>` short-circuits derivation entirely and writes to the path you name — the escape hatch for `$ZDOTDIR` users, dotfile managers, and CI.

### Symlink safety and the never-create invariant

The fresh-block append uses plain `O_APPEND`, so a `~/.zshrc` symlink into a dotfile manager (chezmoi, dotbot, stow, yadm) stays a symlink and the source-of-truth file receives the block. `shll` **never creates** an rc file: if the target doesn't exist it tells you so and exits rather than masking a misconfigured `$ZDOTDIR` or a dotfile manager that hasn't applied yet.

### `--trust-tap` — resolve the tap-trust warning

`--trust-tap` is not a separate mode — it **composes** with the default, `--print`, and `--uninstall` paths. On a normal install it does the full genuine-trust setup in one command:

1. Runs `brew trust --tap sahil87/tap` — Homebrew's own trust ceremony, idempotent and safe to re-run.
2. Adds `export HOMEBREW_REQUIRE_TAP_TRUST=1` to the shll block, so brew enforces explicit trust going forward:

```sh
# >>> shll >>>
export HOMEBREW_REQUIRE_TAP_TRUST=1
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

The two halves travel together on purpose: the export (policy) line without a backing trust record would make brew **block** the tap (worse than the warning), and a trust record without the policy line leaves the warning in place. The export line is merged into your existing block — no duplicates, no second block — so `--trust-tap` works whether or not you've already run a plain `shll shell-setup`.

If your Homebrew is too old to ship `brew trust` (or brew isn't installed), `--trust-tap` **degrades gracefully**: it still writes the eval line (so you get shell integration), **skips** the export line (setting it without a trust record would make brew block the tap), prints a diagnostic pointing at the lighter env-var alternatives, and exits 0. `--uninstall` removes the whole block but does **not** run `brew untrust` — the trust record is inert without the policy line; reverse it yourself with `brew untrust --tap sahil87/tap` if you want.

## `shll shell-init <shell>` — the composed eval line

If you'd rather wire the eval line by hand, this is exactly what `shll shell-setup` writes to your rc file:

```sh
eval "$(shll shell-init zsh)"   # in ~/.zshrc
eval "$(shll shell-init bash)"  # in ~/.bashrc
```

The output is the concatenation, in roster order (leaves-first: `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit`), of every installed sahil87 tool's own `shell-init`. What each tool contributes:

| Tool | What it adds to your shell |
|------|----------------------------|
| `wt`  | `wt` shell function wrapper (so the "Open here" menu option can `cd` your shell), completion |
| `idea` | completion |
| `tu`  | completion |
| `rk`  | completion |
| `hop` | `hop` shell function (bare-name `cd`, verb dispatch, tool-form), `h` / `hi` aliases, completion |
| `fab-kit` | completion |

`hop` and `wt` are the only tools that ship *shell functions* — those need eval-time installation because a function defined inside a binary can't escape into the parent shell. Everything else is completion, sourced lazily on tab. The output is always eval-safe: a tool that isn't installed is silently omitted, and a tool whose `shell-init` errors has its output dropped (the error goes to stderr only) — so a broken sub-tool never corrupts your shell. See [Composing shell-init](workflows.md#composing-shell-init) for the composition mechanics.

## Tap-trust troubleshooting

Running `shll update` (or any shll command that touches brew) may print:

```
Warning: Tap sahil87/tap is allowed by default.
Homebrew will require explicit trust for non-official taps in a future release.
Set `HOMEBREW_REQUIRE_TAP_TRUST=1` to require explicit trust now or
`HOMEBREW_NO_REQUIRE_TAP_TRUST=1` to keep allowing by default.
Hide these hints with `HOMEBREW_NO_ENV_HINTS=1` (see `man brew`).
```

This is a **Homebrew env-hint, not a shll error.** `shll` surfaces it only because it wraps `brew`. Because a single `shll update` touches brew several times across its own steps (`brew update`, the shll self-upgrade) plus whatever brew work each *delegated* per-tool `update` performs internally, the same hint can print **2–3×** per command — it just means brew hasn't been told whether you trust the non-official `sahil87/tap`.

**Recommended fix — record genuine trust:**

```sh
shll shell-setup --trust-tap
```

This runs `brew trust --tap sahil87/tap` (you vouch for your own tap) and sets `HOMEBREW_REQUIRE_TAP_TRUST=1` so brew enforces explicit trust going forward — other untrusted third-party taps then get *blocked* rather than silently allowed. See [`--trust-tap`](#--trust-tap--resolve-the-tap-trust-warning) above.

**Lighter alternatives** (set these yourself if you'd rather not change brew's trust posture):

| Env var | Effect |
|---------|--------|
| `export HOMEBREW_NO_REQUIRE_TAP_TRUST=1` | Keep allowing non-official taps by default; stop nagging. Punts the trust decision. |
| `export HOMEBREW_NO_ENV_HINTS=1` | Silence *all* brew env-hints (blunt — hides future hints too). |

`shll` will **not** set these for you — trusting a tap, or opting out of the warning, is your decision; `--trust-tap` only persists a choice you made by typing it.

## See also

- [Workflows](workflows.md) — clean-machine bootstrap, day-to-day `shll update`, version dumps, and the composition model.
- [shll.ai](https://shll.ai) — the always-current command reference (CI publishes shll's help tree on every release).
- [github.com/sahil87/shll](https://github.com/sahil87/shll) — the source repository.
