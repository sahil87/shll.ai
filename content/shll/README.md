One command to install, update, and shell-wire every tool in the [shll toolkit](https://shll.ai) (`run-kit`, `rk-desktop`, `fab-kit`, `wt`, `idea`, `tu`, `hop`). `shll` doesn't replace the per-tool CLIs — it composes them.

## Install

From a clean machine to a fully wired toolkit:

```sh
curl -fsSL https://shll.ai/install | sh          # install shll + the whole roster, then auto-wire shell + agent harnesses
exec $SHELL                                      # reload so the shell integration takes effect
```

Install a subset by naming tools after `sh -s --`:

```sh
curl -fsSL https://shll.ai/install | sh -s -- hop wt
```

The script preflights what the install needs — git (the Xcode Command Line Tools on macOS), curl, and tmux — and reports every miss at once with its per-platform fix command. On minimal Ubuntu/Debian images (which ship without curl), run `sudo apt-get install -y curl` first. When Homebrew is absent the script bootstraps it headlessly (official installer, `NONINTERACTIVE=1`) and prints the brew `shellenv` line to keep in your rc file; an existing Homebrew is used as-is (≥ 6.0.4 required — on 6.0.0–6.0.3, run `brew update` first). It's idempotent — safe to re-run, and a no-op for anything already installed.

One pitfall worth knowing: if the download itself fails, `curl -fsSL … | sh` still **exits 0** — `sh` runs the empty input happily — so an `&&`-chained next step proceeds as if the install worked. Check curl's stderr, or `command -v shll` after; details in the [install guide](docs/site/install.md).

`shll install` ends by wiring the machine automatically: it runs the equivalent of `shll setup shell` (the rc-file eval line, sentinel-managed and idempotent) and `shll setup agent --yes` (one thin `shll-toolkit` Agent Skill at the harnesses' global skill paths, plus run-kit's dashboard hooks). Both steps are best-effort — a failure warns and prints the step's manual nudge, and never fails the install. Opt out with `--no-shell-setup` (dotfile-manager users) and/or `--no-agent-setup` (no agent wiring), which ride the bootstrap's argument passthrough: `curl -fsSL https://shll.ai/install | sh -s -- --no-agent-setup`.

Everything else — the manual brew bootstrap, from-source builds, shell-wiring detail, and tap-trust troubleshooting — lives in the [install guide](docs/site/install.md) on [https://shll.ai](https://shll.ai).

## Why shll?

- **One-shot install** — `shll install` records per-formula Homebrew trust and then runs `brew install sahil87/tap/<formula>` for every roster tool you don't already have. Idempotent and safe to re-run.
- **One-line shell integration** — `shll setup shell` appends a single eval line to your rc file that wires up `hop`, `wt`, and any future toolkit shell-init in one block. No more managing four eval lines.
- **One update for everything** — `shll update` runs `brew update` once, then upgrades every installed roster tool in sequence. Skips ones you don't have. Skips itself if it wasn't installed via brew.
- **Paste-friendly version dump** — `shll version` prints one row per tool, ideal for bug reports.
- **At-a-glance roster** — `shll list` shows every managed tool with its install status, a one-line description, and its repo (plus `--json` for scripting).
- **One-command health check** — `shll doctor` verifies each tool is installed, runnable, and shell-wired, with an actionable fix on every problem line.

Per-tool CLIs continue to work standalone — `shll` wraps them, it does not replace them.

## Commands

### `shll install` — bootstrap missing tools

```sh
shll install                 # trust + install every missing roster tool, then wire shell + agent harnesses
shll install hop wt          # install only a named subset
shll install --no-trust      # skip the per-formula trust step
shll install --no-shell-setup  # skip the automatic rc-file wiring
shll install --no-agent-setup  # skip the automatic agent-harness wiring
shll install --dry-run       # preview the brew install plan, change nothing
```

Iterates the roster (`run-kit`, `rk-desktop`, `fab-kit`, `wt`, `idea`, `tu`, `hop`) and, for each brew-managed one that's missing, records per-formula Homebrew trust (`brew trust --formula sahil87/tap/<formula>`) **before** running `brew install sahil87/tap/<formula>`. Homebrew 6.0 makes tap-trust a hard install requirement, so this is what lets the install proceed; `brew trust` is idempotent, so re-runs stay clean. Already-installed tools are skipped silently. `rk-desktop` is the one non-brew entry — it delegates to `rk desktop install` (skipped with a note when `rk` is missing or the platform is unsupported). Does NOT upgrade — use `shll update` for that.

After the install outcome, `shll install` wires the machine automatically. It runs the equivalent of [`shll setup shell`](#shll-setup-shell--wire-the-rc-file-recommended) (appends the `eval "$(shll shell-init <shell>)"` block to your rc file — sentinel-managed and idempotent, so re-runs are no-ops), then [`shll setup agent --yes`](#shll-setup-agent--wire-agent-harnesses) (places the `shll-toolkit` agent skill and delegates run-kit's dashboard hooks, forwarding `--yes` so run-kit's hook prompt can't hang an unattended run). Both steps are best-effort: a failure warns and prints that step's manual nudge, and never changes the install's exit code. Neither runs under `--dry-run`. Opt out with `--no-shell-setup` and/or `--no-agent-setup`; after a fresh wire, restart your shell or run `exec $SHELL`.

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

Runs `brew update --quiet` once, then `brew upgrade sahil87/tap/shll` (when shll itself was installed via brew), then delegates to each installed roster tool's **own `update` subcommand** (passing `--skip-brew-update` when the tool advertises it) so each tool's post-upgrade side effects — e.g. `run-kit`'s daemon restart — are preserved. A roster tool that exposes no `update` subcommand falls back to `brew upgrade sahil87/tap/<formula>`. Uninstalled tools are skipped silently, and the loop is best-effort — one tool's failure doesn't abort the rest. Brew and per-tool progress stream directly to your terminal.

When agent skills were previously placed via [`shll setup agent`](#shll-setup-agent--wire-agent-harnesses), the run ends by re-running `shll setup agent` (as a subprocess, so the freshly upgraded binary places its own skill content) — the placed skills track the toolkit they describe without a manual follow-up. The refresh is placement-gated (a machine that never opted in gets no writes), best-effort (it never changes the run's exit code), and previewed by `--dry-run`.

> **Legacy `rk` keg exception.** On a pre-rename machine still holding the old `rk` keg, `shll update` migrates `run-kit` **brew-direct** (`brew upgrade sahil87/tap/rk`, which resolves the rename) rather than delegating to `run-kit update`. Because that path skips `run-kit update`'s post-upgrade side effect, the daemon is **not** restarted automatically — shll prints a note suggesting `run-kit serve --restart` instead (Constitution III — shll never reimplements a tool's own logic). This is transitional; once legacy kegs are gone, updates always take the normal delegated path above.

Pass one or more tool names to scope the run to a subset (valid targets: `shll`, `wt`, `idea`, `tu`, `run-kit`, `hop`, `fab-kit`; the legacy alias `rk` still resolves to `run-kit`), processed in roster order regardless of arg order. A named-but-not-installed target is a hard error here (unlike the whole-roster sweep, which silently skips it). `--dry-run` runs the read-only probes, prints the exact commands the real run would execute (`shll (self)` first when brew-installed), then exits without writing anything.

Each tool gets a `[N/M]` progress header, and a timing summary tail (`Done — N of M tools succeeded in <dur>.`) closes the run. After the tail, a compact **"What changed:"** digest lists the release-note titles for every tool that actually bumped, followed by a copy-pasteable `shll changelog` command for the full notes.

### `shll check-updates` — is anything outdated? (read-only)

```sh
shll check-updates                     # human table: installed → latest per tool
shll check-updates --json              # machine contract (what run-kit's daemon runs)
shll check-updates --source github     # compare against GitHub release tags instead
```

The toolkit's single update-*check* surface: for shll itself plus every roster tool, it reports the installed version vs the latest available — and never updates anything (that's `shll update`'s job). One backend, selected by `--source`: `--source released` (the default when the flag is omitted) fetches [shll.ai/versions.json](https://shll.ai/versions.json), the roster + notify-policy authority, once per run; `--source github` reads each tool's latest GitHub release tag instead (no notify policy in that backend). Installed versions come from Homebrew, so brew must be present.

The human output is a `shll version`-style aligned table — `shll  0.1.5 → 0.1.6  update available (notable)`, `wt  0.1.3  up to date`, `idea  not installed`. The `(notable)` marker means the pending bump crosses the tool's notify threshold from the manifest (`patch` = any bump is notable; `minor` = only minor-or-higher bumps; `never` = none).

`--json` emits a stable machine contract — `{"schema": 1, "source": "released", "tools": [{"name", "formula", "installed", "latest", "notify", "update_available", "notable"}]}` — with a row only for tools where both versions resolved (not-installed or unresolvable tools are omitted; `--source github` rows omit `notify`/`notable` since no policy source exists there). The contract evolves additively — consumers tolerate unknown fields. Exit codes: 0 when the check ran (pending updates don't change it — verdicts live in the output), 1 when the check itself failed (manifest unreachable, brew missing), 2 on a usage error; a `--source github` per-tool fetch failure degrades just that tool and still exits 0.

### `shll changelog` — release notes for the toolkit

```sh
shll changelog                          # all installed tools: installed → latest ("what would an update bring?")
shll changelog tu                       # one tool: installed → latest
shll changelog tu@0.6.2..0.6.4          # explicit range: releases in (0.6.2, 0.6.4]
shll changelog tu@0.6.2..0.6.4 hop@0.1.16..0.1.18   # multiple tools (this is what `shll update` prints)
```

Fetches each tool's GitHub release notes (unauthenticated, via the public API) and prints them newest-first: a per-tool `{tool} {old} → {new} ({N} releases)` header followed by each release's tag, title, and full "What's Changed" body. With no arguments it previews the pending releases for every installed tool (shll itself first) — its installed version → the latest release. Name one or more tools to scope it, or add an explicit `tool@old..new` range (which works regardless of what's installed). Versions are accepted with or without a leading `v`.

Valid targets are the roster names plus `shll` itself. A no-range form needs Homebrew to read the installed version; an explicit range skips brew entirely. If a fetch fails (rate limit, network), that tool degrades to a `Full Changelog` compare URL and the command still exits 0 (Constitution V — graceful degradation). Output is capped at the 10 most recent releases per tool, with a compare URL for the overflow.

### `shll setup` — wire this machine (shell + agent harnesses)

```sh
shll setup                  # both halves: shell integration, then agent-harness wiring
shll setup --yes            # unattended run (forwards --yes to the run-kit hook delegation)
```

The consolidated, re-runnable entry point for machine wiring — the same two steps `shll install` runs automatically at the end of an install. Both halves are idempotent, so re-running is safe (e.g. after installing a new shell or a new agent harness). Both halves always run; the exit code is the worst of the two. The halves are also runnable individually as [`shll setup shell`](#shll-setup-shell--wire-the-rc-file-recommended) and [`shll setup agent`](#shll-setup-agent--wire-agent-harnesses) below.

### `shll setup shell` — wire the rc file (recommended)

> Renamed from `shll shell-setup`: the old spelling (and its `shll shell-install` alias) still works — hidden, silent, for one release cycle — then it will be removed.

```sh
shll setup shell              # auto-detect shell, append eval block to your rc file
shll setup shell --print      # dry-run: print the block to stdout, modify nothing
shll setup shell --uninstall  # clean removal of the block
shll setup shell --rc-file ~/.zshrc.local   # override the target path
```

`shll setup shell` is **pure rc-wiring** — it maintains only the eval line and touches no Homebrew state. (Tap trust lives in `shll install`, which trusts each formula it installs; there is no `--trust-tap` flag.) The appended block is sentinel-wrapped and idempotent — re-running is a no-op when the line is already present:

```sh
# >>> shll >>>
eval "$(shll shell-init zsh)"
# <<< shll <<<
```

The rc file is opened with plain `O_APPEND`, so dotfile-manager symlinks (chezmoi, dotbot, stow, yadm) are preserved. Default targets: `${ZDOTDIR:-$HOME}/.zshrc` for zsh, `$HOME/.bash_profile` (macOS) or `$HOME/.bashrc` (Linux) for bash.

> **Upgrading from an older shll?** If a previous `shll shell-setup --trust-tap` left an `export HOMEBREW_REQUIRE_TAP_TRUST=1` line in your block, the next `shll setup shell` run cleans it out automatically (the block is rewritten to the eval line only). That export merely re-set Homebrew 6.0's default and was never what unblocked installs — the `brew trust` record is. `--uninstall` removes the whole block as before.

### `shll shell-init <shell>` — composed shell-init

If you'd rather wire the eval line by hand, this is what `shll setup shell` writes to your rc file:

```sh
eval "$(shll shell-init zsh)"   # in ~/.zshrc
eval "$(shll shell-init bash)"  # in ~/.bashrc
```

The output is the concatenation (in roster order — leaves-first: `wt`, `idea`, `tu`, `run-kit`, `hop`, `fab-kit`) of every installed shll tool's own shell-init, with a `# ── <tool> ──` comment separator before each block. What each roster tool is for, and what it adds to your shell:

| Tool | What it's for | What it adds to your shell |
|------|---------------|----------------------------|
| `wt`  | git worktree manager — create, switch, and clean up worktrees | `wt` shell function wrapper (so the "Open here" menu option can `cd` your shell), completion |
| `idea` | worktree-aware idea / backlog capture from the terminal (markdown-first) | completion |
| `tu`  | AI coding-assistant cost/usage tracker (Claude Code, Codex, OpenCode) | completion |
| `run-kit`  | web-based tmux orchestration for parallel agent workspaces (formerly `rk`, which stays as an alias) | completion |
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
run-kit  v1.5.3
hop      v0.1.5
fab-kit  v1.9.4
```

One row for `shll` itself plus each roster tool, in roster order. Uninstalled tools render as `not installed`. Each tool's `--version` call has a 2-second timeout, so one hung tool can't block the dump — a timeout also shows as `not installed`. Drop the whole block into a bug report.

### `shll list` — the toolkit roster

```sh
$ shll list
ok  shll     the manager for the shll toolkit                                                                                                    https://github.com/sahil87/shll
ok  wt       Git worktree management — create, list, open, delete worktrees                                                                      https://github.com/sahil87/wt
ok  idea     Backlog idea management from the terminal                                                                                           https://github.com/sahil87/idea
ok  tu       Token-usage tracker for AI coding tools (Claude Code, Codex, OpenCode)                                                              https://github.com/sahil87/tu
ok  run-kit  Run-kit — tmux session manager with a web UI; can display web pages/HTML to the user and push notifications (rk stays as an alias)  https://github.com/sahil87/run-kit
ok  hop      Fast directory/project jumping across worktrees                                                                                     https://github.com/sahil87/hop
ok  fab-kit  Spec-driven workspace & workflow toolkit (the `fab` CLI)                                                                            https://github.com/sahil87/fab-kit
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
run-kit  OK  v2.2.3
hop      OK  v0.1.16  wired
fab-kit  OK  v2.1.1
```

`shll` leads with its own row (it's the running binary; version from the build, no wiring or trust check — but it does verify any agent skill placed by [`shll setup agent`](#shll-setup-agent--wire-agent-harnesses): a placement whose content is stale, typically from an older shll, is `WARN` with a refresh pointer; no placement means no check). Then for every roster tool `doctor` checks that (1) the binary is on `PATH`, (2) it reports a version (so a half-installed or stale brew link is caught), (3) its Homebrew formula is **trusted** (so a future `brew upgrade` won't be refused on Homebrew 6.0+), and (4) — for the tools that ship shell integration (`wt`, `tu`, `hop`) — shll's composed eval block is present in your rc file. Each tool gets one line with an `OK` / `WARN` / `FAIL` marker, and every non-OK line carries an actionable suggestion (e.g. `run 'brew install …'`; `formula not trusted — run 'shll install' …`; or `not wired — run 'shll setup shell' then 'exec $SHELL'`). The `shll` row can at worst `WARN`, so it never affects the exit code.

A missing or non-running binary is `FAIL`; an installed-but-untrusted or installed-but-unwired tool is `WARN` (it still works when invoked directly — but an untrusted tool's next upgrade will be refused). The trust sub-check queries `brew trust --json=v1` read-only (it never reads `~/.homebrew/trust.json` directly) and is skipped silently when your Homebrew is too old to ship `brew trust`. `doctor` is strictly **read-only** — it never installs, upgrades, trusts, or edits your rc file — and it **exits non-zero if any tool is FAIL**, so it's scriptable in CI. Pass `--json` for a machine-readable array (one object per tool) under the same checks and exit contract.

### `shll standards` — read the toolkit's binding standards

```sh
$ shll standards
principles         foundation   The ten toolkit CLI principles every tool is built against
help-dump          binary       Machine-readable help contract every tool must emit
readme-extraction  repo         README + docs/site structure standard for toolkit repos
skill              binary+repo  Agent skill bundle standard: docs/site/skill.md served by `<tool> skill`

$ shll standards principles   # print the full document (raw markdown, stdout)
```

The agent-facing reader for the toolkit's standards ([docs/site/standards/principles.md](docs/site/standards/principles.md) and companions). The bare form is a self-describing glossary — an agent that has only been told "run `shll standards`" can pick the right document from the list alone, with a **scope** column (foundation / binary / repo / binary+repo) naming where each standard's obligations live; `shll standards <name>` prints that document byte-identical to its canonical `docs/site/standards/` source. Content is embedded at build time, so it's offline and versioned with the release (a drift-guard test keeps the embedded copies byte-matched to `docs/site/standards/`). Pass `--json` on the bare form for a `{name, description, scope, source_path}` array (`source_path` is `docs/site/standards/<name>.md`); an unknown name errors on stderr naming the valid names and exits non-zero.

### `shll skill` — agent skill bundles for the toolkit

```sh
$ shll skill                  # glossary: one line per installed tool (shll first)
shll     the manager for the shll toolkit
wt       Git worktree management — create, list, open, delete worktrees
hop      Fast directory/project jumping across worktrees

Run 'shll skill <tool>' for that tool's full agent skill bundle ('shll skill <tool> <topic>' for a topic page).

$ shll skill hop              # print hop's full agent skill bundle (raw markdown)
$ shll skill run-kit display  # print one of a tool's topic pages (passed through to `run-kit skill display`)
$ shll skill shll             # shll's own bundle (served from the embedded copy)
```

The agent-facing reader for each tool's offline skill bundle — the one-page usage briefing an agent loads before driving the tool (per the toolkit's [`skill` standard](docs/site/standards/skill.md)). The bare form is a **glossary**, not a dump of every bundle: it lists the installed tools one line each (shll first, then the roster, PATH probe only — no brew calls), never concatenating bundles, so an agent picks the one it needs and asks for it by name. `shll skill <tool>` streams that tool's own `<tool> skill` output **byte-for-byte** (`shll skill shll` serves shll's own bundle from an embedded copy, drift-guarded against [docs/site/skill.md](docs/site/skill.md)). A tool that isn't installed, or whose version predates its `skill` subcommand, prints a one-line notice to stderr and exits 1; an unknown tool name is a usage error (exit 2).

### `shll setup agent` — wire agent harnesses

> Renamed from `shll agent-setup`: the old spelling still works — hidden, silent, for one release cycle — then it will be removed.

```sh
shll setup agent              # place the shll-toolkit skill at both locations (idempotent)
shll setup agent --print      # print the SKILL.md content and both target paths, write nothing
shll setup agent --uninstall  # remove both placed skill directories
```

Mechanically places one thin `shll-toolkit` Agent Skill into the harnesses' global skills directories — `~/.agents/skills/shll-toolkit/SKILL.md` (the [agentskills.io](https://agentskills.io) open-standard path, read by Codex and compat-read by Cursor and OpenCode) and `~/.claude/skills/shll-toolkit/SKILL.md` (Claude Code, which doesn't read `~/.agents/`) — so an agent driving this machine learns to load `shll skill` before reaching for a tool. The skill directories are shll-owned, so placement is idempotent by construction: install writes them, a re-run overwrites them, `--uninstall` deletes them — no merge, no prompt, no sentinel machinery. A per-path written/updated/unchanged summary is printed. Then it delegates run-kit's dashboard-hook wiring to `run-kit agent setup` (skipped silently when run-kit isn't installed; `--uninstall` delegates `run-kit agent setup --uninstall`; `--print` never delegates). This graduates the toolkit's harness wiring from `run-kit agent setup`, where it was mis-homed on a leaf tool, up to the manager.

Once placed, the skill maintains itself: [`shll update`](#shll-update--upgrade-everything) ends each run by re-running `shll setup agent` (so the placed content tracks the upgraded binaries), and [`shll doctor`](#shll-doctor--verify-install--wiring) flags a stale placement with a `WARN`. The skill's frontmatter description is generated from the tool roster — each tool contributes its name and a task-domain phrase ("git worktrees", "backlog ideas") so agents match on the task, not just the tool name, and run-kit additionally contributes an agent-proactive sentence (show visual content in a browser window, push notifications) so agents reach for those capabilities unprompted.

## How composition works

shll has no state, no database, and no special knowledge of the tools it wraps. Every subcommand is a thin coordinator over the per-tool CLIs:

| `shll` command | What it actually runs |
|----------------|------------------------|
| `shll install` | `brew trust --formula sahil87/tap/<formula>` then `brew install sahil87/tap/<formula>` per missing tool (`--no-trust` skips the trust step), then the automatic shell-wiring and agent-wiring steps (`--no-shell-setup` / `--no-agent-setup` opt out) |
| `shll update` | `brew update --quiet` once, self-upgrade, then each installed tool's own `update` (delegated; `brew upgrade` fallback only when a tool has no `update`) |
| `shll check-updates` | fetches `shll.ai/versions.json` (or GitHub releases with `--source github`), joins against `brew list --versions`, reports pending updates — read-only |
| `shll changelog` | fetches each tool's GitHub releases (public API), filters to the requested version range, renders the notes |
| `shll shell-init zsh` | concatenates the stdout of each installed tool's `<tool> shell-init zsh` |
| `shll version` | invokes `<tool> --version` per tool, formats as a table |
| `shll list` | probes each tool's install status, renders the roster (name, description, repo) |
| `shll doctor` | probes `<tool> --version` + reads your rc file, reports install + wiring health |
| `shll standards` | prints build-time-embedded copies of the canonical `docs/site/` standards (no subprocess, no network) |
| `shll skill <tool>` | passes through the tool's own `<tool> skill` output byte-for-byte (`shll skill shll` serves an embedded copy) |
| `shll setup agent` | places the `shll-toolkit` skill at the two global skill paths, then delegates `run-kit agent setup` for run-kit's hooks |

Per Constitution Principle IV (Composition, Not Replacement): `hop update`, `wt shell-init`, etc. continue to work standalone. shll's only job is to fan-out, collect output, and degrade gracefully when a tool is missing.

## Reference

- [docs/site/install.md](docs/site/install.md) — install & shell-wiring guide (manual brew bootstrap, from-source, `shll setup shell`, tap-trust)
- [docs/site/workflows.md](docs/site/workflows.md) — task-oriented walkthroughs (clean-machine bootstrap, day-to-day `shll update`, version dumps, the composition model)
- [docs/site/standards/principles.md](docs/site/standards/principles.md) — the ten CLI principles every toolkit tool is built against (agent-native contracts: obligations, failure modes, enforcement receipts)
- [docs/site/standards/help-dump.md](docs/site/standards/help-dump.md) — producer standard for the machine-readable help contract (`help-dump` JSON every tool must emit)
- [docs/site/standards/readme-extraction.md](docs/site/standards/readme-extraction.md) — producer standard for README & `docs/site/` structure (what shll.ai pulls and renders per tool)
- [docs/site/standards/skill.md](docs/site/standards/skill.md) — producer standard for the offline, embedded `<tool> skill` agent bundle (one-page usage briefing, versioned with the binary)
- [docs/site/standards/update.md](docs/site/standards/update.md) — producer standard for the in-place `update` subcommand (`--skip-brew-update` probe, exit-code semantics, brew-handling safety, naming/release alignment)
- [docs/site/standards/version.md](docs/site/standards/version.md) — producer standard for the `--version` surface shll probes (2s budget, first-non-empty-line token, binary-name-equals-tool install probe)
- [docs/site/standards/shell-init.md](docs/site/standards/shell-init.md) — producer standard for the eval-safe `shell-init` output shll concatenates (stdout-only shell source, diagnostics to stderr, fail-non-zero)
- `shll --help` — full subcommand listing
- **Command reference at [shll.ai/shll/commands](https://shll.ai/shll/commands/)** — a browsable, always-current command tree. On every release, shll's CI exports its CLI help tree as a machine-readable `help/shll.json` and publishes it to [shll.ai](https://shll.ai), which renders it at that page. The export is produced by a hidden `help-dump` subcommand (internal build tooling, not a user command).
- Per-tool repos for the wrapped CLIs:
  [fab-kit](https://github.com/sahil87/fab-kit) ·
  [run-kit](https://github.com/sahil87/run-kit) ·
  [tu](https://github.com/sahil87/tu) ·
  [hop](https://github.com/sahil87/hop) ·
  [wt](https://github.com/sahil87/wt) ·
  [idea](https://github.com/sahil87/idea)
