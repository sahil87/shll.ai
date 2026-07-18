# shll skill

The agent skill bundle for **shll** — the meta-CLI that installs, updates, wires, and inspects the [@sahil87 toolkit](https://shll.ai) (`wt`, `idea`, `tu`, `run-kit`, `hop`, `fab-kit`). shll is stateless and composes each tool's own CLI; it never replaces them.

## When to use shll

Reach for shll when the task spans the *whole toolkit* rather than one tool:

- Get a machine from bare to a fully installed, shell-wired toolkit.
- Upgrade everything, or check what an upgrade would bring.
- Ask "is the toolkit healthy?" or "which versions am I running?"
- Discover the toolkit: list the tools, read a tool's own skill bundle, or wire agent harnesses with toolkit context.

For a single tool's own operations (`wt` worktrees, `hop` jumping, `fab` workflows), drive that tool directly and load `shll skill <tool>` first.

## Capabilities map

One line each, keyed to the subcommand:

- `shll install [tool...]` — `brew install` every missing roster tool (trust-then-install); idempotent. `--dry-run` previews; `--no-trust` skips trust.
- `shll update [tool...]` — `brew update` once, self-upgrade, then delegate to each installed tool's own `update`. `--dry-run` previews.
- `shll uninstall [tool...]` — remove roster tools via brew, reverse order with shll-self last; confirm-gated (`--yes` skips, non-TTY refuses), `--dry-run` previews.
- `shll changelog [tool[@old..new]...]` — GitHub release notes; no range = installed→latest ("what would an update bring?").
- `shll shell-init <shell>` — emit one eval-safe shell-init blob composing every installed tool's shell-init. Stdout is meant to be `eval`'d.
- `shll shell-setup [shell]` — append the `eval "$(shll shell-init …)"` line to your rc file (idempotent, sentinel-wrapped). `--print` / `--uninstall`.
- `shll agent-setup` — place the `shll-toolkit` Agent Skill at two global skill paths (`~/.agents/skills/` for Codex/Cursor/OpenCode, `~/.claude/skills/` for Claude Code), then delegate run-kit's dashboard hooks to `run-kit agent-setup`. Idempotent (overwrite). `--print` / `--uninstall`.
- `shll skill [tool]` — bare: one-line glossary of installed tools. `shll skill <tool>`: that tool's full agent skill bundle (this page is `shll skill shll`).
- `shll version` — one paste-friendly version row per tool (for bug reports).
- `shll list` — the roster with install status, descriptions, repo links (`--json`).
- `shll doctor` — read-only health check: installed, runnable, trusted, shell-wired (`--json`; any FAIL → exit 1).
- `shll standards [name]` — read the toolkit's binding producer-facing CLI standards (`--json` list; `<name>` prints the doc).

## Composition patterns

- shll shells out to each tool's own CLI — it has no per-tool logic of its own. `shll update` calls `<tool> update`; `shll shell-init` concatenates `<tool> shell-init`; `shll skill <tool>` passes through `<tool> skill` byte-for-byte.
- shll shells out to `brew` for install/upgrade/trust, and to the public GitHub API (unauthenticated) for changelog notes.
- `shll agent-setup` delegates run-kit's hook wiring to `run-kit agent-setup`; the per-tool CLIs keep working standalone.
- Missing tools are skipped, never errors — every command degrades gracefully.

## Output & exit-code contracts

- stdout is data, stderr is diagnostics. `--json` is available on `list`, `doctor`, and the bare `standards` list.
- Exit codes follow the toolkit convention: `0` success, `1` operational failure, `2` usage error (unknown command/flag, bad args).
- `shll shell-init` output is always eval-safe — safe to pipe straight into a live shell — regardless of which tools are installed.
- `shll doctor` is worst-check-wins: any FAIL → exit 1, so it is scriptable in CI.
- Fetch-degrading commands (`shll changelog`) still exit 0 when a release feed is unavailable.

## Gotchas

- **Two-step skill discovery.** `shll skill` alone is a *glossary* (one line per tool), not a dump of every bundle — call `shll skill <tool>` for the tool you actually need. Loading all bundles at once wastes context.
- **`shll skill <tool>` needs the tool installed and recent.** A tool not on PATH, or one whose version predates its `skill` subcommand, prints a one-line notice to stderr and exits 1 — run `shll update`.
- **Homebrew ≥ 6.0.4 with tap trust.** `shll install` records per-formula trust before installing; on Homebrew 6.0+ an untrusted tap refuses the install. Bootstrap shll itself once with `brew trust --formula sahil87/tap/shll && brew install sahil87/tap/shll`.
- **`shll install` never upgrades; `shll update` never installs missing tools.** They are distinct lifecycle verbs.
- **shll is stateless.** Every invocation re-derives facts (installed versions, latest releases) live — there is no cache to clear or config to seed.
