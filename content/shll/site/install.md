# Install & shell wiring

The deep guide to getting `shll` and the rest of the [@sahil87 toolkit](https://shll.ai) onto a machine and wired into your shell. The README quick-start is the short version; this page covers every install path and the full `shll shell-setup` rc-wiring contract.

`shll` doesn't replace the per-tool CLIs — it composes them. Everything below either shells out to `brew` or invokes a sub-tool's own command; `shll` keeps no state of its own.

> **Homebrew ≥ 6.0.4 required.** Homebrew 6.0 made tap-trust a hard install requirement (it defaults `HOMEBREW_REQUIRE_TAP_TRUST=1`), and an earlier 6.0.x Linux sandbox bug that broke trusted installs is fixed in 6.0.4. If you're on 6.0.0–6.0.3, run `brew update` first.

## Bootstrap via Homebrew

The bootstrap is trust-then-install for `shll` itself:

```sh
brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll
```

The `brew trust` is required: shll's tap formula downloads a binary and runs a sandboxed `def install` (not a bottle pour), and that sandboxed step re-checks trust against a real persisted trust record — so naming the formula on the CLI alone is refused on Homebrew 6.0+ (see [Tap-trust troubleshooting](#tap-trust-troubleshooting) for the load-gate vs. sandboxed-install-gate detail). shll can't trust its *own* formula before it exists, which is why this one-time bootstrap uses `brew trust` directly; from there `shll install` owns trust for the other six roster tools.

`shll` is also pulled in transitively by the `all` meta-formula, which installs every roster tool at once (trust it the same way first):

```sh
brew trust --formula sahil87/tap/all && brew install sahil87/tap/all
```

Use the single formula when you want just `shll` and intend to bootstrap the rest with `shll install`; use `all` when you want the whole toolkit in one shot.

## `shll install` — bootstrap the missing roster tools

```sh
shll install
```

Iterates the hardcoded roster — in leaves-first order, `wt`, `idea`, `tu`, `rk`, `hop`, `fab-kit` — and, for each tool you don't already have, records per-formula Homebrew trust (`brew trust --formula sahil87/tap/<formula>`) **before** running `brew install sahil87/tap/<formula>`. On Homebrew 6.0+ trust is a hard install requirement, so trusting first is what lets the install proceed; `brew trust` is idempotent, so re-runs stay clean. Already-installed tools are skipped silently. It is **idempotent** — safe to re-run; a second run picks up only tools added since the first.

This is Homebrew's recommended **per-formula** trust granularity for third-party taps — shll knows its exact roster, so it trusts only what it actually manages (not the whole tap).

```sh
shll install --no-trust    # skip the per-formula trust step (manage trust yourself)
```

If your Homebrew is too old to ship `brew trust` (pre-6.0, where trust isn't required anyway), the trust step is skipped gracefully and the install proceeds.

`shll install` does **not** upgrade — it only installs what's missing. Use [`shll update`](workflows.md#day-to-day-shll-update) for upgrades. It also runs no `brew update --quiet` first: `brew install` resolves the formula via the tap directly, so the metadata refresh that `shll update` performs is intentionally absent here.

You can also target a subset by name: `shll install hop wt` installs just those two (in roster order, regardless of arg order). `shll` itself is not a valid install target — you can't `brew install` the running orchestrator (it's the one-time bootstrap above).

Requires Homebrew. If `brew` isn't on `PATH`, `shll install` prints `shll install requires Homebrew. Install from https://brew.sh` and exits 1.

## From source

```sh
git clone https://github.com/sahil87/shll.git
cd shll
just install
```

`just install` builds the binary and copies it to `~/.local/bin/shll`. Make sure that directory is on your `$PATH`. A from-source build participates in `shll shell-init` and `shll version` exactly like a brew install — install detection is by binary-on-PATH, not by brew. One caveat: a non-brew `shll` is **not** self-upgraded by `shll update` (there's no brew formula to upgrade), and it reports its own version as whatever the build stamped (`dev` for an unstamped local build).

## `shll shell-setup` — wire the rc file (recommended)

`shll shell-setup` maintains a single sentinel-wrapped, shll-managed block in your shell rc file. The block holds the cross-tool eval line — that's all. It is **pure rc-wiring** and touches no Homebrew state (tap trust lives in [`shll install`](#shll-install--bootstrap-the-missing-roster-tools), which trusts each formula it installs). It is the recommended way to wire your shell: you don't have to know which rc file to edit, and re-running is a no-op.

> Still works under the legacy alias `shll shell-install` — same command, unchanged behavior.

```sh
shll shell-setup                          # auto-detect shell from $SHELL, append the eval block
shll shell-setup zsh                      # explicit shell
shll shell-setup --print                  # dry-run: print the block to stdout, modify nothing
shll shell-setup --uninstall              # clean removal of the whole block
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

### Migrating from an older shll (`--trust-tap` cleanup)

Older shll versions had a `shll shell-setup --trust-tap` flag that also wrote an `export HOMEBREW_REQUIRE_TAP_TRUST=1` policy line into the block. That flag is **removed** — trust now lives in `shll install` (per-formula), and the export line merely re-set Homebrew 6.0's default (it was never what unblocked installs; the `brew trust` record is). If a previous `--trust-tap` run left that export line in your block, the next plain `shll shell-setup` run **rewrites the block to the eval line only**, dropping the stale export automatically. `--uninstall` removes the whole block as before.

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

On **Homebrew 6.0+**, trusting `sahil87/tap` is a **hard install requirement** — not the advisory "allowed by default" warning older Homebrew printed. Homebrew now defaults `HOMEBREW_REQUIRE_TAP_TRUST=1`, so `brew install sahil87/tap/<formula>` is **refused** until a real trust record exists. If you skip the bootstrap, brew refuses the install — often as an opaque sandbox build failure rather than a clear "untrusted tap" message.

**Why naming the formula on the CLI isn't enough — the two trust gates.** Trust is checked in two places:

1. At **formula-load** time, *outside* the sandbox — here naming the fully-qualified formula (`sahil87/tap/shll`) on the command line is explicitly allowed.
2. Again during the **sandboxed `install`** — and that in-sandbox re-check sees the formula's *path*, not the qualified name you typed, so CLI-naming does **not** satisfy it. A persisted trust record (tap- or formula-level) is genuinely required.

shll's tap formulae download a binary and run a sandboxed `def install` — they are **not** `bottle do` bottles (a true bottle *pour* runs no sandboxed install and would need no pre-trust). So the second, sandboxed gate always fires for these formulae, which is exactly why the bootstrap `brew trust` line is required.

**The fix — bootstrap, then let `shll install` handle the rest:**

```sh
brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll   # one-time bootstrap for shll itself
shll install                                                             # trusts each remaining formula, then installs
```

`shll install` runs `brew trust --formula sahil87/tap/<formula>` before each install (per-formula — Homebrew's recommended granularity for third-party taps). `brew trust` is idempotent, so re-running any of this is safe. Pass `shll install --no-trust` if you'd rather manage trust yourself.

**Already installed but a later `brew upgrade` / `shll update` is refused?** A tool installed outside `shll install` (manually, or before this feature) may be untrusted, and Homebrew 6.0+ refuses its next upgrade. `shll doctor` flags any installed-but-untrusted tool with `WARN` (read-only, via `brew trust --json=v1`); re-run `shll install` (idempotent) or `brew trust --formula sahil87/tap/<x>` to fix it.

**Homebrew version floor.** Requires **Homebrew ≥ 6.0.4** — 6.0.0–6.0.3 on Linux had a bubblewrap-sandbox bug that broke trusted installs (the sandbox couldn't read the trust file), fixed in 6.0.4. On an earlier 6.0.x, run `brew update` first.

## See also

- [Workflows](workflows.md) — clean-machine bootstrap, day-to-day `shll update`, version dumps, and the composition model.
- [shll.ai](https://shll.ai) — the always-current command reference (CI publishes shll's help tree on every release).
- [github.com/sahil87/shll](https://github.com/sahil87/shll) — the source repository.
