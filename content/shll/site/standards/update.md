# Standard: update

How every CLI in the [shll toolkit](https://shll.ai) upgrades itself in place. Each tool exposes an `update` subcommand that swaps its own keg via Homebrew and runs whatever post-upgrade steps it owns; [shll](https://shll.ai) composes those by delegating to each installed tool's `update` rather than calling `brew upgrade` itself — so no tool's post-upgrade side effects are lost.

This page is the **producer-facing standard**: what your tool's `update` must do. The consumer side — `shll update`'s probe-first ordering, the per-tool summary tail, and the post-upgrade release digest — is shll's job and lives in its own memory. A tool author's entire obligation is keeping `update` conformant to this page.

Scope is the **six roster tools** — `wt`, `idea`, `tu`, `run-kit`, `hop`, `fab-kit`. `shll` itself is out of producer scope: inside the delegation loop it self-upgrades with a direct `brew upgrade sahil87/tap/shll` rather than calling an `update` subcommand on itself — shll is the *consumer* here, delegating to the tools below.

This standard implements principle №7 of the [toolkit CLI principles](principles.md) (compose, don't reinvent — `shll update` delegates to your `update` instead of reaching into your keg), its brew-handling clause serves principle №6 (stateless, therefore retry-safe — a corrupted mid-swap keg is the antithesis of retry-safe), and its prompt-free clause tightens principle №1 (non-interactive by default) for this one subcommand.

## Invocation contract

`<tool> update` is uniform across the six roster tools:

- **MUST expose an `update` subcommand** that upgrades the tool **in place** and runs the tool's own post-upgrade side effects (e.g. run-kit restarts its daemon). This is why `shll update` delegates to you instead of running `brew upgrade` directly — only your `update` knows what has to happen after the binary is swapped.
- **MUST continue to work standalone.** `shll update` composes per-tool `update`; it never deprecates the direct invocation.

## Prompt-free, unconditionally

`shll update` delegates to each installed tool's `update` with **inherited stdio**, in the user's own terminal — so mid-compose, stdin typically *is* a TTY. That makes this clause deliberately **stricter than principle №1** of the [toolkit CLI principles](principles.md): №1's reconciliation blesses `Proceed? [y/N]` when a TTY is present (reference implementation: `shll uninstall`), but that reconciliation does not survive composition — a №1-conformant prompt stalls the delegation loop at tool *k* of 6. A watching user can answer it, but the composed run has silently acquired an interaction requirement it never advertised, and it blocks indefinitely whenever nobody is watching — a walked-away `shll update`, an agent-driven pane.

So:

- **MUST run to completion without any interactive prompt, in every environment — including when stdin is a TTY.** No confirmation question, no pager, no "press enter to continue".
- **The obligation covers wrapped subprocesses too.** An `update` almost always wraps `brew` — the wrapped call MUST be invoked non-interactively; a prompt surfacing from a subprocess stalls the compose exactly like one from your own code.
- **There is nothing to confirm.** An in-place upgrade is not a destructive write in the №5 sense — invoking `update` *is* the consent. A tool that wants a guard can offer `--dry-run`, never a prompt.

**Failure mode.** An `update` that prompts only when a TTY is present is conformant to №1 and to every other rule on this page — yet it breaks the compose in both directions. On a real TTY with no human watching — an agent driving `shll update` in a tmux/run-kit pane — the prompt hangs invisibly until the harness times out. And when stdin is not a TTY, the tool refuses fast exactly as №1 requires — but `shll update`'s delegated argv is fixed (`<tool> update [--skip-brew-update]`; there is no way to thread `--yes` through), so the compose hard-fails with no recourse for the caller.

## Advertise and honor `--skip-brew-update`

`shll update` runs `brew update` **once** for the whole toolkit, then delegates to each tool's `update`. To avoid N redundant metadata refreshes, it appends `--skip-brew-update` to every tool whose `update` advertises support.

Two rules with teeth:

- **Advertise the flag as a literal substring.** `<tool> update --help` MUST contain the exact string `--skip-brew-update`. Discovery is a **substring presence check** on the help text (`strings.Contains`), never a regex — the flag string is a **frozen textual contract**, exactly like the [help-dump](help-dump.md) JSON shape. Reword the help line so the literal substring disappears and every `shll update` run silently degrades to N redundant `brew update`s.
- **Honor it.** When invoked with `--skip-brew-update`, the tool MUST skip its own internal `brew update` metadata refresh (shll has already done it once, run-wide). The flag is a promise, not a hint.

## Exit codes

The exit code is the truth `shll update`'s **summary tail** reads for pass/fail; the post-upgrade **digest** ("what an upgrade brought") is driven separately, off the brew-read version transition per tool, not off this exit code. So the exit code MUST mean exactly what it says:

- **MUST exit `0` on success**, and success **includes already-up-to-date** — "nothing to upgrade" is not a failure.
- **MUST exit non-zero only on genuine failure** — a real upgrade error, a broken keg, a failed post-upgrade step.

A tool that exits non-zero when there is simply nothing to do makes `shll update` report a false failure for the whole run.

## Brew-handling safety

An `update` almost always wraps `brew upgrade`, and brew mutations are **not** interruptible without damage — a keg swap runs `brew unlink` then `brew link`, and a process killed between them leaves the tool half-installed (the observed symptom: `zsh: permission denied: <tool>`). So:

- **MUST NOT send `SIGKILL` to a package-manager subprocess mid-transaction.** `SIGKILL` cannot be trapped, so brew gets no chance to finish or roll back the keg swap.
- **MUST NOT impose a short hard timeout on `brew upgrade`.** brew can legitimately block for **minutes** on the network. Observed 2026-07-19: a stalled `api.github.com` call *inside* `brew upgrade` (Homebrew 6 makes an un-timed GitHub API call during every tap-formula upgrade) exceeded a wrapper's 120-second hard kill; the `SIGKILL` landed mid-swap, between `unlink` and `link`, and corrupted the keg — leaving a broken binary.
- **If any bound exists, it SHOULD be generous and terminate gracefully.** Prefer `SIGTERM` plus a grace period (letting brew unwind cleanly), never `SIGKILL`; a bound sized for a network transfer, not a local command. A tool that must bound the call should also consider `HOMEBREW_NO_GITHUB_API=1` to sidestep the un-timed API call rather than reaching for a timeout at all.

**Failure mode.** A short hard timeout plus `SIGKILL` is "conformant" to every other rule on this page while silently corrupting installs on any machine with a slow network moment — the exact incident that motivated this clause.

## Self-update only when brew-installed

A tool distributed via Homebrew SHOULD self-update through brew **only when it was brew-installed**, detected via `os.Executable()` symlink resolution — a resolved path containing `/Cellar/` marks a brew keg (the hop / fab-kit convention). A non-brew install (a `go install` dev build, a hand-placed binary) is not brew's to upgrade: degrade with a **clear message** ("not a brew install — upgrade it however you installed it") instead of erroring or running a `brew upgrade` that would target the wrong or a missing formula.

## Naming and release alignment

The update path is where a tool's brew/formula identity is load-bearing, so the toolkit's naming and release conventions live here:

- **One name, four places.** The GitHub repo name, the roster/tool name shll knows it by, the tap formula leaf (`sahil87/tap/<leaf>`), and the binary name on `PATH` MUST all be the **same string**. `shll update` composes `brew upgrade sahil87/tap/<formula>` and delegates to the `<tool>` binary by that one name — a mismatch breaks the compose.
- **`v{semver}` release tags.** Releases MUST be tagged `v{semver}` (e.g. `v1.4.2`), matching the brew formula version. `shll changelog` and the `shll update` post-upgrade digest consume these tags to render "what an upgrade brought" — an off-convention tag drops out of the digest.
- **A rename MUST ship a `formula_renames.json` entry.** Renaming the tool (repo/formula/binary) MUST add a tap `formula_renames.json` entry so an installed old-name keg migrates on the next `brew upgrade` instead of orphaning. The `rk` → `run-kit` rename is the precedent, and it carries an ongoing migration-guard cost in shll (a legacy-name alias and a dual-keg sweep) — so a rename is a deliberate, tap-coordinated act, not a casual one.

## Verifying conformance

Before shipping a change that touches `update`:

- `<tool> update` exits `0` on success, **including when already up to date**; non-zero only on a genuine failure.
- `<tool> update` runs to completion with **no interactive prompt in any environment, TTY included** — no code path reads stdin for a confirmation.
- `<tool> update --help` output contains the literal substring `--skip-brew-update`, and passing the flag skips the tool's internal `brew update`.
- No code path sends `SIGKILL` to `brew`, and no short hard timeout caps `brew upgrade` (any bound is generous and terminates via `SIGTERM` + grace).
- If the tool self-updates via brew, it gates on a `/Cellar/`-resolved executable path and degrades with a clear message off-brew.
- The repo name, tool name, tap formula leaf, and binary name are one string; releases are tagged `v{semver}`; any rename ships a `formula_renames.json` entry.
