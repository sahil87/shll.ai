# Intake: Website Content Accuracy + Self-Updating Homepage Versions

**Change**: 260608-jf3q-content-accuracy-version-sync
**Created**: 2026-06-08
**Status**: Draft

## Origin

> Conversational `/fab-discuss` session that escalated to `/fab-new`. The user spotted one error on the philosophy page ("fab-kit's 7-stage pipeline" — fab-kit dropped the spec stage and is now 6 stages) and asked for a broader accuracy check of the website content, pointing at the tool repos in `~/code/sahil87/` as ground truth. A second user question — "is there a way to keep the version numbers always updated — do the help json files get updated with the tool version numbers?" — surfaced that the synced `help/*.json` files already carry correct, current versions while the homepage hard-codes stale ones.

A repo-grounded audit ran one verification agent per tool (7 tools), each treating the tool's own repo as ground truth. The audit confirmed the spec-stage error appears in **6 places**, found **every** homepage version number is stale (one fabricated), and surfaced a cluster of copy-paste-breaking command errors. The user chose: (1) build a self-updating `<VersionTable>` component rather than hand-patch numbers, and (2) fix the full audit (factual errors + framing nits), via the fab pipeline.

**Interaction mode**: conversational discussion → audit (subagent fan-out) → decisions confirmed via AskUserQuestion → this intake.

## Why

1. **Problem.** The live site (`sites/astro-starlight-terminal1`) presents factually wrong information about the very tools it advertises: a non-existent "spec stage" / "7-stage pipeline" for fab-kit (6 places), seven stale version numbers on the homepage (one — `wt v1.4.2` — fabricated from a planning-doc placeholder, when wt is actually `v0.0.16`), the tool mislabeled `run-kit` where its CLI/brew identity is `rk`, and several **copy-paste-breaking** commands (`hop pull --all`, `hop status --all`, `wt list --stale`, an invented `idea` `#tag` feature, a fabricated `shll install` output).

2. **Consequence if unfixed.** The site's stated purpose (context.md, constitution "External Links") is to be an accurate front door into the toolkit. Wrong commands erode trust immediately — a visitor who runs `brew install sahil87/tap/run-kit` or `hop pull --all` hits an error. The version numbers will keep drifting on every tool release because they are hand-copied — the exact hand-copy-vs-mechanical-sync trap the constitution's Tool-Page Depth principle warns against.

3. **Why this approach.** The `help/*.json` files (pulled on a schedule per `help-dump-contract`) **already carry** the canonical `version` field for every tool, validated by `HelpDocSchema` (`version: z.string()`), and are already read at build time by `CommandIndex.astro` / `CommandReference.astro` via `repoRootFromModuleUrl()`. Reading versions from that existing synced source — instead of hand-typing them — makes the homepage version block self-correcting (auto-refreshes whenever the scheduled puller commits new `help/*.json`), with zero new dependency and no runtime fetch (Constitution I, static-first). The prose/command fixes are one-time corrections to hand-authored pages; the synced pages (`readme.mdx`/`commands.mdx`/`command-index.mdx`) are explicitly out of scope (never hand-edited).

## What Changes

### A. New `<VersionTable>` component (self-updating homepage version dump)

Create `src/components/VersionTable.astro` that, at build time:

- Resolves the repo-root `help/` dir via `repoRootFromModuleUrl(import.meta.url)` (existing helper in `src/lib/repo-root.ts`).
- For each tool in a **site-authored** ordered roster, reads `help/<slug>.json`, validates against `HelpDocSchema` (`src/lib/schemas.ts`), and extracts the `version` string.
- Normalizes the `v` prefix: prepend `v` if absent (`help/fab-kit.json` = `2.1.1`, `help/tu.json` = `0.4.17` lack it; the rest already have `v`). Output is always `v<semver>`.
- Renders the same terminal-themed markup currently hand-written in `index.mdx:26-33`: one `<span class="shell-line">` per tool, each with the route link (e.g. `/shll`), the version, and the `[git]` repo link.

**Site-authored data stays in the component** (NOT pulled from JSON): the tool list, display order, route links, repo URLs, and **display labels**. Only the `version` string is sourced from JSON.

Roster + labels (display order preserved from current homepage):

| JSON file (slug) | Display label | Route link | Repo link |
|------------------|---------------|------------|-----------|
| `shll.json` | `shll` | `/shll` | `https://github.com/sahil87/shll` |
| `idea.json` | `idea` | `/idea` | `https://github.com/sahil87/idea` |
| `hop.json` | `hop` | `/hop` | `https://github.com/sahil87/hop` |
| `fab-kit.json` | `fab-kit` | `/fab-kit` | `https://github.com/sahil87/fab-kit` |
| `wt.json` | `wt` | `/wt` | `https://github.com/sahil87/wt` |
| `run-kit.json` | **`rk`** | `/run-kit` | `https://github.com/sahil87/run-kit` |
| `tu.json` | `tu` | `/tu` | `https://github.com/sahil87/tu` |

Then edit `index.mdx` to import and render `<VersionTable />` in place of the hand-typed lines 26–33 (the `$ shll version` prompt line stays; the seven version `<span>`s become the component output). Build-time failure if a `help/<slug>.json` is missing or fails schema validation (mirrors `CommandIndex.astro`'s build-stopping behavior — a missing-help defect must not deploy).

### B. fab-kit pipeline: 6 stages, no spec stage

Canonical (fab-kit README.md:7,15 — "## The 6 Stages"): **6-stage pipeline (intake → apply → review → hydrate → ship → review-PR)**. Fix every occurrence:

- `getting-started/philosophy.md:16` — "7-stage pipeline (intake → spec → apply → ...)" → 6-stage list; and "Forcing intake and spec stages" → "Forcing an intake stage" (or reword — there is no spec stage).
- `getting-started/philosophy.md:10` — "Specs and plans (`fab-kit`) are markdown files." → fab-kit's per-change artifact is the **plan** (`plan.md`); there is no per-change `spec.md`. Reword to "Plans (`fab-kit`) are markdown files" (project-level `docs/specs/` still exists but is not a per-change artifact, so don't imply a spec artifact next to "plans").
- `tools/fab-kit/overview.mdx:3` (frontmatter `description`) — "7-stage pipeline that forces..." → "6-stage pipeline that forces...".
- `tools/fab-kit/overview.mdx:11` (body) — "a 7-stage pipeline (intake → spec → apply → ...)" → 6-stage list.
- `getting-started/overview.md:14` — diagram label `spec/plan` → `plan` (per-change artifacts are `intake.md` + `plan.md`).
- `workflows/daily-flow.md:33` — "`/fab-fff` runs intake → spec → apply → review → hydrate → ship." → "`/fab-fff` runs apply → review → hydrate → ship → review-PR (everything after intake)." (no spec; AND it includes review-PR, it does not stop at ship).
- `workflows/daily-flow.md:56` — "when the **spec stage** produces a lot of `[NEEDS CLARIFICATION]` markers, run `/fab-clarify`" → there is no spec stage; `[NEEDS CLARIFICATION]` markers are an **intake** construct and `/fab-clarify` is **intake-only**. Reword to reference the intake stage.
- `index.mdx:51` — caption "`fab-kit` specs" → reframe to the plan-before-code framing (e.g. "`fab-kit` plans"). fab-kit's per-change artifact is the plan, not a spec.

### C. `run-kit` → `rk` relabel (CLI/tool identity)

`run-kit` is only the **repo** name; the binary, the brew formula (`rk.rb`), and `shll version`'s own row all read `rk`. Wherever the CLI/tool is *named as a thing you type or that the tool prints*, use `rk` (keep `/run-kit` route links and the `github.com/sahil87/run-kit` repo URL — those are correct repo references):

- `index.mdx` version dump row — handled by `<VersionTable>` (display label `rk`).
- `index.mdx:23` `shll install` output line — see §E (run-kit → rk in the install list).
- `index.mdx:51` loop diagram caption "`run-kit` watches" → keep route link, change the displayed token to `rk` if it reads as the CLI name (the link text is currently `run-kit`; verify against the surrounding captions — these are nav links to `/tools/run-kit/overview/`, so the *link label* may legitimately stay `run-kit` as a directory entry; only change tokens that read as a typed CLI name). **Decision: leave nav/directory link labels as `run-kit` (they point to the tool's section); change only CLI-invocation/version-output tokens to `rk`.**
- `getting-started/overview.md` shape diagram + prose: the `run-kit` references in the ascii diagram (line 11) and the `tu`/`hop`/`shll` framing line (19) are directory framing — leave as `run-kit` where it names the tool's *section*, but where prose describes the *command*, use `rk`. Workflows already use `rk riff` / `rk` correctly.

### D. Command-syntax bugs (copy-paste-breaking) — `workflows/daily-flow.md`

- Line 11 — `hop pull --all` ("sync every tracked repo") → **`hop --all pull`**. hop's grammar is `hop <selection> <action>`; `--all` is the selection and precedes the verb. There is no `hop pull` subcommand. ("tracked" → "every cloned repo in `hop.yaml`".)
- Line 48 — `hop status --all` ("show dirty repos") → **`hop ls --trees`** (shows per-repo worktree summaries with `*` = dirty, `↑N` = unpushed). There is no `hop status` subcommand.
- Line 19 — `idea list` comment "tags are #word substrings — grep for the ones you care about" → idea has **no tag concept**; queries are case-insensitive substring matches over the description text. Reword (e.g. "filter by substring — `idea list <substr>` matches ID or text"). Also the example backlog line `[a7q2] flaky timezone #bug in user-profile.tsx` is missing the mandatory `YYYY-MM-DD:` date field — fix the example to a valid backlog line shape (`[a7q2] 2026-06-08: flaky timezone in user-profile.tsx`) or drop the inline-comment framing.
- Line 50 — `wt list --stale` ("worktrees idle >7 days") → `--stale` lives on **`wt delete`**, not `wt list`. Either use `wt delete --stale` (destructive — adjust the surrounding "End of day" framing, which currently just *lists* stale worktrees) or, to keep it read-only, `wt list` + note that `wt delete --stale` (default 7d, configurable `--stale=Nd`) prunes them. **Decision: keep it read-only — surface stale via `wt list` and mention `wt delete --stale` as the prune action.**
- Line 12 — bare `tu` comment "check yesterday's cost" → bare `tu` always shows **today's** cost (the evening usage on line 49, "today's spend", is correct). Reword line 12 to "check today's cost so far" (or similar).
- Lines 30/36 framing — `rk riff` creates a git worktree + a new tmux **window** (with the agent as pane 0), not merely "a pane". Tighten the wording in daily-flow.md:30 and new-change.md:36 to mention the worktree + window.

### E. `shll` install accuracy — `index.mdx` + `getting-started/install.md`

- `index.mdx:21-24` — the `shll install` output is fabricated: there is **no `==> tapping sahil87/tap` line**, and real output uses per-tool Homebrew `==> [N/M] <name>` headers (roster order `wt, idea, tu, rk, hop, fab-kit`), not a single `==> installing idea, hop, fab-kit, wt, run-kit, tu` line. Replace the hero shell-session output with a realistic shape (per-tool `==> [N/M] <tool>` lines, `rk` not `run-kit`, no tapping line). Keep it illustrative but not contradicting the tool.
- `getting-started/install.md:13` — "it will only update tools that have moved" is **wrong**: `shll install` does NOT upgrade (its own help says "Does NOT upgrade — use `shll update`"). Reword to: installs only missing roster tools; use `shll update` to upgrade.

### F. `fab change new` wording — `workflows/new-change.md:34`

"`fab change new --slug csv-export` creates `fab/changes/<...>/intake.md`" is inaccurate — the CLI creates the **folder + `.status.yaml`** and starts the intake stage; the **`/fab-new` skill** writes `intake.md` from a template. Reword to: `fab change new --slug` creates the change folder and `.status.yaml`; the agent's `/fab-new` (or first pipeline prompt) generates `intake.md`. (Line 70's "produces an empty intake" should be tightened similarly.)

### G. Framing nits (soft accuracy)

- `getting-started/overview.md:19` — "`hop` is the navigator that ties unrelated repos together." overstates it. hop is a **personal directory/registry** of your git repos (`hop.yaml`) you navigate and batch-operate; it does not "tie repos together" (no linking concept). Reword to "`hop` is a personal directory of your git repos — jump between them and batch-update them."
- `getting-started/overview.md:13` — diagram label `worktree / per change` under wt → wt's unit is a **branch / AI session**, not a fab "change". Change to `worktree / per branch`.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) Record two durable conventions surfaced by this change: (1) **homepage/site version numbers MUST be sourced from `help/*.json` at build time, never hand-typed** (the `<VersionTable>` pattern) — extends the existing mechanical-sync principle from readme/commands to versions; (2) the **canonical tool-naming rule**: where prose names a CLI you type or that the tool prints, use the binary/brew identity (`rk`), reserving `run-kit` for the repo/section reference. Also note the standing accuracy baseline: hand-authored prose MUST match each tool's own repo (commands, flags, stage count).

## Impact

- **Code (site):**
  - NEW: `sites/astro-starlight-terminal1/src/components/VersionTable.astro`
  - EDIT: `sites/astro-starlight-terminal1/src/content/docs/index.mdx` (version dump → component; install output; loop caption)
  - EDIT: `.../getting-started/philosophy.md`, `.../getting-started/overview.md`, `.../getting-started/install.md`
  - EDIT: `.../tools/fab-kit/overview.mdx`
  - EDIT: `.../workflows/daily-flow.md`, `.../workflows/new-change.md`
- **Reused (no change):** `src/lib/repo-root.ts` (`repoRootFromModuleUrl`), `src/lib/schemas.ts` (`HelpDocSchema`, `version` field).
- **Out of scope (do NOT edit — mechanically synced):** all `readme.mdx`, all `commands.mdx`, `reference/command-index.mdx`, and the `help/*.json` data files themselves (those are puller-owned).
- **Dependencies:** none added (Constitution VI). No runtime data fetch (Constitution I — component reads JSON at build time only).
- **Dark mode / a11y:** version block markup unchanged in structure (same `shell-line` spans + theme classes), so existing dark-mode parity holds; verify the component output renders identically in both themes.
- **Playground duplicate:** `sites/_playground/starlight-terminal/` contains identically-named files (per the idea-audit note). Playground is NOT deployed (Constitution III) and is out of scope — do not edit it.

## Open Questions

- None blocking. All scope decisions were confirmed with the user (build component; fix everything). Two micro-decisions were made inline and recorded as assumptions below (keep `wt list` read-only rather than switching the End-of-day step to destructive `wt delete --stale`; keep nav/directory link labels as `run-kit` while changing only CLI-invocation/version tokens to `rk`).

## Clarifications

### Session 2026-06-08 (bulk confirm)

| # | Action | Detail |
|---|--------|--------|
| 6 | Confirmed | — |
| 7 | Confirmed | — |
| 8 | Confirmed | — |
| 9 | Confirmed | — |
| 10 | Confirmed | — |
| 11 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | fab-kit pipeline is 6 stages (intake → apply → review → hydrate → ship → review-PR), no spec stage | Confirmed against fab-kit README ("## The 6 Stages") + loaded constitution/preamble (spec removed 1.10.0) | S:98 R:80 A:95 D:95 |
| 2 | Certain | Homepage versions are stale; canonical values live in `help/*.json` (captured 2026-06-08) | Directly inspected each `help/<tool>.json` `version` field; matches per-tool repo ground truth from the audit | S:98 R:75 A:95 D:90 |
| 3 | Certain | `wt v1.4.2` is fabricated (placeholder from a wt planning doc); real is `v0.0.16` | wt audit traced `1.4.2` to a sample `help/wt.json` placeholder string in `fab/changes/.../intake.md`; tags are all `v0.0.x` | S:95 R:70 A:90 D:90 |
| 4 | Certain | `<VersionTable>` reads `version` from `help/*.json` at build time via existing `repoRootFromModuleUrl` + `HelpDocSchema` | Both helpers exist and are already used by `CommandIndex.astro`; `HelpDocSchema` includes `version: z.string()` | S:90 R:65 A:90 D:85 |
| 5 | Certain | Synced pages (readme/commands/command-index) and `help/*.json` are out of scope | Constitution Tool-Page Depth: mechanically synced, never hand-edited; user explicitly limited scope to hand-authored prose | S:95 R:85 A:95 D:95 |
| 6 | Certain | `run-kit` → `rk` only for CLI-invocation/version tokens; keep `/run-kit` route links + repo URL + nav/section labels | Clarified — user confirmed | S:95 R:75 A:85 D:70 |
| 7 | Certain | Keep End-of-day `wt` step read-only (`wt list` + mention `wt delete --stale`) rather than make it destructive | Clarified — user confirmed | S:95 R:80 A:80 D:65 |
| 8 | Certain | hop sync verb is `hop --all pull`; dirty-repo view is `hop ls --trees` (no `hop status`/`hop pull` subcommands) | Clarified — user confirmed | S:95 R:75 A:90 D:80 |
| 9 | Certain | `idea` has no `#tag` feature; fix the comment + the malformed example backlog line (add date field) | Clarified — user confirmed | S:95 R:75 A:90 D:75 |
| 10 | Certain | shll install hero output reworked to realistic per-tool `==> [N/M] <tool>` shape (rk, no tapping line); install.md "only update tools that have moved" corrected | Clarified — user confirmed | S:95 R:80 A:85 D:75 |
| 11 | Certain | `fab change new` creates folder + `.status.yaml`; `/fab-new` skill writes `intake.md` | Clarified — user confirmed | S:95 R:75 A:90 D:80 |
| 12 | Tentative | Framing rewrites (hop "directory of repos", wt "per branch", rk "worktree + window") preserve the page's voice while correcting | Soft accuracy — multiple valid phrasings; chosen wording mirrors each tool's own README one-liner. Easily tuned in review | S:65 R:80 A:70 D:55 |

12 assumptions (11 certain, 0 confident, 1 tentative, 0 unresolved).
