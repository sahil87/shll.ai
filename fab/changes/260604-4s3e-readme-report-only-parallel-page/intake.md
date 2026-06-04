# Intake: README Gate → Report-Only + Parallel Readme Page

**Change**: 260604-4s3e-readme-report-only-parallel-page
**Created**: 2026-06-04
**Status**: Draft

## Origin

> Discussion (this session, after the `w32m` README-extraction pipeline shipped via PR #33 and the
> first scheduled README refresh ran): the user observed that `content/` on `main` contained only
> `idea` and `wt` slices — 5 of 7 tools were withheld. Investigation of the workflow run
> (`26943488063`) showed the pull **completed successfully** and the vn39 gate **deliberately
> withheld** hop/fab-kit/run-kit/shll (their READMEs cite commands/flags absent from
> `help/<tool>.json`) and tu (no `help/tu.json` to verify against). The user then asked the decisive
> question: *"Should we even have this rule? It's the tool's own README.md — which is the canonical
> source."* Separately, the user asked to revisit injecting the slice into `overview.mdx` vs. a
> parallel `readme` page.

Two design reversals came out of that conversation, both made explicitly with the user:

1. **The blocking gate contradicts "README is canonical."** The whole `w32m` architecture rests on
   *the tool repo's README being the canonical source* (constraint #2 from the original design). A
   gate that **rejects** the canonical source when it diverges from `help-dump` makes `help-dump` the
   de-facto authority — the projection refusing to display the thing it projects. You cannot hold
   both "README is canonical" and "README must pass validation before we trust it." The user chose:
   **README is canonical and rendered verbatim; `help-dump` divergence is detected and REPORTED as a
   non-fatal lint, never a publish gate.**
2. **Injecting the slice into `overview.mdx` collides two authors on one page.** The overview page
   ends up with site-authored framing AND the canonical synced slice with no clear boundary, and both
   "pitch the tool" (the README opens with a tagline + "Why X?", as does a hand-written overview),
   producing a double-pitch and an unclear ownership story. The user chose: **a parallel per-tool
   `readme` page renders the canonical slice; the overview page is thinned back to a directory
   entry.** This matches the existing multi-page Starlight model (overview/commands/workflows) and
   `qemq`'s precedent (the generated command reference got its own `commands` page, not an overview
   injection).

Interaction mode: conversational, multi-turn, grounded in inspecting the live `main` state and the
actual workflow run log. This change **supersedes** `w32m` intake assumption #11 (overview-injection)
and the *blocking* behavior in `w32m`'s vn39 gate (assumptions #9, #13). The README-extraction
contract, pipeline, and render component all exist (merged in PR #33, change `w32m`); this change
**revises their behavior**, it does not build them from scratch.

## Why

**The problem (gate).** The vn39 gate, as shipped in `w32m`, **blocks**: a tool whose README cites a
command/flag absent from `help/<tool>.json` has its entire README withheld and silently sits on the
placeholder. Observed live: 5 of 7 tools invisible after the first refresh. This is architecturally
inconsistent — the site stops reflecting its own declared canonical sources. The detection is
valuable (we *learn* a README cites a non-existent command), but the *action* (censor the whole
slice) is wrong for a canonical-source model.

**The problem (page).** Injecting the slice into `overview.mdx` merges site-authored prose and the
canonical synced slice on one page with no boundary. Under the report-only model (slice rendered
verbatim, canonical), the overview page becomes mostly not-site-authored — a thin hand-written frame
around a large synced block — an awkward ownership story for "the overview page," plus a
double-pitch (overview intro + README tagline both pitch the tool).

**Consequence of inaction.** The site under-represents the toolkit (5/7 tools blank) AND contradicts
its own source-of-truth model. Authors editing an overview can't tell their prose from the synced
content. The trust argument that originally justified the gate (a visitor copying a fabricated
command and getting "command not found") is real but is addressed differently below.

**Why report-not-block over the alternatives** (all three were weighed with the user):
- *Keep blocking* (status quo): rejected — contradicts "README is canonical"; makes `help-dump` the
  real authority; leaves 5/7 tools silently invisible.
- *Remove the gate entirely*: rejected — throws away the useful drift signal AND fully reintroduces
  the `vn39` failure (site can show fabricated commands with zero visibility).
- *Detect + report, never block* (chosen): the README renders verbatim (canonical wins), and the
  `help-dump` mismatch becomes a visible signal (CI `::warning::` / repo-level lint) where the fix
  belongs — the tool repo. *You don't protect a system from its own source of truth; you fix the
  source of truth.* Accepted tradeoff: a genuinely fabricated command can appear on shll.ai for up to
  one refresh cycle (≤24h) until the tool README is corrected — the precise harm `vn39` guarded
  against, now consciously accepted in favor of canonical-source consistency and full coverage.

**Why parallel page + thin overview** (chosen over keep-injected): separates the two authors
cleanly (overview = site-authored framing/nav; readme = the tool's canonical words), matches the
existing multi-page model and `qemq` precedent, and makes the synced content's ownership obvious. The
overview's "where do I click for depth?" concern is solved by the overview prominently linking to the
readme page.

## What Changes

Three coordinated parts, all in ONE change (the user confirmed a single combined change; the gate
flip and the page restructure share files and memory and are both "correct the README-extraction
design after seeing it live"). **False-positive tuning of the detector is explicitly deferred to a
separate follow-up** (see Non-Goals).

### 1. Gate → report-only (workflow + CLI behavior)

**`.github/workflows/scheduled-readme-refresh.yml`**: today, a tool whose `extract-readme-cli`
exits non-zero (gate fail) is added to `failed=()`, skipped, and keeps its last-good slice. Change
to: **always extract and commit the slice**; on `help-dump` divergence, emit a non-fatal
`::warning::` (and continue to commit), NOT a skip. The per-tool *fetch-failure* isolation stays
(a tool whose README genuinely can't be fetched still keeps last-good — that's a real failure, not a
divergence). The `tu` case (no `help/tu.json`): under report-only, **still commit tu's README**
(canonical) and emit a `::warning::` that it is unverifiable, rather than refusing to commit.

**`sites/astro-starlight-terminal1/scripts/extract-readme-cli.mjs`**: today, `findUnknownTokens`
non-empty → print error → **exit 1** (fails the pull). Change to: write the slice and **exit 0**;
print the divergence as a `::warning::`/stderr notice. The slice is always produced. Distinguish:
- divergence (unknown tokens) → warn, still write, exit 0;
- genuinely unreadable/missing input README → that remains an error path (nothing to render);
- missing `help/<slug>.json` → cannot verify → warn "unverified", still write the slice, exit 0
  (canonical wins; verification is best-effort).

`findUnknownTokens` and its unit tests are **KEPT** — the detector is still valuable as a reporter;
only the *consequence* of a non-empty result changes (warn, don't fail). Update the tests that
asserted the *failing/exit-1* behavior to assert *warn-and-still-write* instead (per Test Integrity,
tests follow the revised spec).

### 2. Parallel `readme` page (render restructure)

- **New per-tool `readme.mdx`** at `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/readme.mdx`
  (all 7 tools) — frontmatter `title: Readme` + a `description`, imports `ReadmeSlice.astro`, renders
  `<ReadmeSlice tool="<slug>" />`. This is where the canonical slice now lives. (`.mdx` because it
  imports a component, like `commands.mdx`.) Sidebar label **"Readme"**, slug `/tools/<tool>/readme`
  (confirmed via `/fab-clarify` — chosen over "Docs"/"Guide" as the most honest about the source).
  <!-- clarified: page label/title/slug = "Readme" -->
- **Move `<ReadmeSlice>` OUT of `overview.mdx`** for all 7 tools (it was injected there by `w32m`).
- **`astro.config.mjs`**: add a `Readme` sidebar entry per tool, parallel to the existing `Commands`
  entry. (Do NOT disturb `qemq`'s `Reference` group / `command-index`.)
- `ReadmeSlice.astro` itself needs no behavior change (it already reads `content/<tool>/README.md`
  via the `help/`-anchored ascend and renders markdown) — only its *placement* moves from overview to
  the readme page. The `help/`-anchored `findRepoRoot` fix from PR #33's review stays.

### 3. Thin overview (content restructure)

- **`overview.mdx` (all 7 tools)** shrinks to a genuine directory entry: `<GithubButton>` + a 1–2
  sentence framing of what the tool is + prominent nav links to the readme / commands / workflows
  pages. It stops carrying long-form depth.
- **Existing hand-written overview depth** (e.g. `fab-kit`'s large overview, `idea`'s) migrates to
  the **tool's canonical README** — its single proper home — from which it flows back onto the site
  via the readme page automatically (confirmed via `/fab-clarify`; NOT kept as interim site-authored
  content on the readme page). Because the tool READMEs live in *other* repos, the actual prose-move
  is a **follow-up in those repos (out of THIS repo's scope)**; interim, each tool's readme page
  shows whatever its current README already contains. Within this repo, thinning the overview means
  *removing* the depth from `overview.mdx`, not relocating it onto the site. The principle: depth
  lives on `readme` (sourced from the canonical README), framing lives on `overview`.
  <!-- clarified: overview depth's canonical home is the tool README (flows back via readme page); not interim site prose. Tool-repo prose-move is a follow-up. -->

### 4. Contract / constitution / memory reframe

- **`docs/specs/readme-extraction-contract.md`**: flip §7 (the gate section) from "site prose MUST
  NOT reference commands/flags absent from `help/<tool>.json` → fail the pull / keep last-good" to
  "**the README is canonical and rendered verbatim; `help-dump` divergence is detected and surfaced
  as a non-fatal repo-level lint, never a publish gate.**" Update any other section that asserts the
  blocking behavior (the §8 pull model's per-tool gate-fail handling; the Install-section language in
  §2/§7 that leaned on the gate as the "sole install-accuracy guard" — it's now a reporter, not a
  guard). Add the parallel-readme-page + thin-overview render model (supersedes the overview-injection
  text). Changelog row.
- **`fab/project/constitution.md`**: if the Tool-Page Depth constraint (added v2.1.0 in `w32m`)
  encodes the blocking/validation stance, reframe it to the canonical-verbatim + report model. Adjust
  the page-model wording (parallel readme page, thin overview) if the constraint references it. Bump
  **v2.1.0 → v2.1.1 (PATCH)** (confirmed via `/fab-clarify` — the deep-synced-content principle is
  unchanged; only gate behavior + page placement change). Changelog entry.
  <!-- clarified: constitution bump = patch v2.1.1 -->
- **Memory**: `docs/memory/conventions/readme-extraction.md` (the gate is now report-only; the
  render is a parallel readme page, not overview injection); `docs/memory/conventions/tool-page-rubric.md`
  (overview is thin again — but for a different reason than the original "short pages" stance: depth
  moved to the readme page, not to GitHub); `docs/memory/conventions/help-collection.md` (the vn39
  rule's framing — it still applies to *hand-written* site prose as a hard rule, but for *pulled
  README prose* it is now report-only; make this distinction explicit so the two consumers aren't
  conflated). Update indexes + Last Updated.

## Affected Memory

- `conventions/readme-extraction`: (modify) gate is report-only (warn, never block); render moved
  from overview-injection to a parallel per-tool `readme` page; overview thinned. The `findUnknownTokens`
  detector is retained as a reporter.
- `conventions/tool-page-rubric`: (modify) overview is a thin directory entry again (framing + nav);
  the pulled-README depth lives on a parallel `readme` page (a new generated/synced page type,
  sibling to the generated `commands` page). Distinguish from the original "short pages, link to
  GitHub" stance — depth is now ON the site, on the readme page.
- `conventions/help-collection`: (modify) clarify the vn39 rule now has TWO modes: a **hard rule** for
  hand-written site prose (unchanged — must not cite absent commands), and a **report-only lint** for
  pulled README prose (canonical, rendered verbatim, divergence warned). Don't conflate the consumers.
- `build-deploy/deployment`: (modify, if needed) the README-refresh pull now always commits (no
  gate-skip); note the behavior change.

## Impact

- **Workflow**: `.github/workflows/scheduled-readme-refresh.yml` (gate-fail handling → warn-and-commit).
- **CLI**: `sites/astro-starlight-terminal1/scripts/extract-readme-cli.mjs` (exit 0 + warn on
  divergence; always write slice).
- **Tests**: `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` — the cases asserting
  the *blocking/exit-1* consequence change to assert *warn-and-write*; the detector's
  true-positive/false-positive *detection* cases stay (detection logic is unchanged).
- **Render / IA**: new `readme.mdx` × 7, `<ReadmeSlice>` removed from `overview.mdx` × 7, `overview.mdx`
  thinned × 7, `astro.config.mjs` sidebar (`Readme` entry × 7). `ReadmeSlice.astro` unchanged in
  behavior.
- **Spec**: `docs/specs/readme-extraction-contract.md` (§7 + §8 + §2 reframe; render model; changelog).
- **Constitution**: `fab/project/constitution.md` (Tool-Page Depth wording + version bump v2.1.0 →
  v2.1.1 patch + changelog).
- **Memory**: the four files above + indexes.
- **Live effect**: after this ships and the next refresh runs, all 7 tools (that have a fetchable
  README) get a committed slice and render on their `readme` page — including hop/fab-kit/run-kit/shll,
  whose READMEs currently fail the *blocking* gate. Their `help-dump` divergences will appear as CI
  warnings instead. `tu` renders its README (unverified-warning) once it has a fetchable README.

## Open Questions

All three intake open questions were resolved via `/fab-clarify` (2026-06-04) — see `## Clarifications`:

- ~~Constitution version bump?~~ → **PATCH v2.1.0 → v2.1.1** (principle unchanged; only behavior + placement).
- ~~Existing overview prose migration?~~ → into the **tool's canonical README** (flows back via the
  readme page; tool-repo prose-move is a follow-up); NOT interim site content.
- ~~`readme` page label?~~ → **"Readme"** (title + sidebar label; slug `/tools/<tool>/readme`).

No open questions remain.

## Clarifications

### Session 2026-06-04

| # | Question | Answer |
|---|----------|--------|
| 10 | Constitution version bump | **PATCH v2.1.0 → v2.1.1** — the deep-synced-content principle is unchanged; only the gate behavior (block→report) and page placement (overview→readme page) change. |
| 11 | Where does existing overview depth go? | **Into the tool's canonical README** (its single home; flows back to the site via the readme page). The actual prose-move happens in the tool repos (follow-up, out of this repo's scope); interim the readme page shows the current README. NOT kept as interim site-authored content. |
| 12 | `readme` page label / title / slug | **"Readme"** — title + sidebar label; slug `/tools/<tool>/readme`. Most honest about the source vs. "Docs"/"Guide". |

## Assumptions

<!-- STATE TRANSFER: decisions reached this session, encoded for the plan-generation agent. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Gate flips from BLOCKING to REPORT-ONLY: README is canonical, rendered verbatim; `help-dump` divergence is a non-fatal warning, never a publish gate | Discussed — the user identified that a blocking gate contradicts "README is canonical" (the architecture's constraint #2); chose detect-and-report over keep-blocking and remove-entirely | S:95 R:65 A:90 D:90 |
| 2 | Certain | The pulled slice renders on a NEW parallel per-tool `readme.mdx` page, NOT injected into `overview.mdx` | Discussed — the user chose the parallel page to separate site-authored framing from the canonical slice; matches the multi-page model + `qemq`'s dedicated-commands-page precedent | S:95 R:60 A:85 D:90 |
| 3 | Certain | `overview.mdx` is thinned back to a directory entry (GithubButton + 1–2 sentence framing + nav links to readme/commands/workflows) | Discussed — the user chose "thin overview"; depth lives on the readme page, framing on overview | S:90 R:55 A:80 D:80 |
| 4 | Certain | This supersedes `w32m` intake assumption #11 (overview-injection) and the BLOCKING behavior of `w32m` assumptions #9/#13 (the gate); it revises shipped behavior, does not rebuild from scratch | Discussed — the README-extraction contract/pipeline/component already exist (merged PR #33); this change edits their behavior | S:95 R:70 A:90 D:90 |
| 5 | Certain | `findUnknownTokens` detector + its detection tests are KEPT; only the consequence of a non-empty result changes (warn + still write + exit 0, not fail). Tests asserting the exit-1/blocking consequence update to assert warn-and-write (Test Integrity) | Discussed — detection is valuable as a reporter; per Test Integrity tests follow the revised spec | S:90 R:65 A:85 D:80 |
| 6 | Certain | Single combined change (gate flip + page restructure + thin overview together), NOT split | Discussed — the user confirmed one combined change; the parts share files/memory and are both "correct the README-extraction design after going live" | S:95 R:60 A:80 D:85 |
| 7 | Certain | False-positive tuning of the detector (Cobra `completion`/`help`, the `h ou<TAB>` completion-demo idiom, per-subcommand flag scoping) is OUT of scope — a separate follow-up | Discussed — the user scoped this change as "report-only flip, false-positive tuning deferred"; a noisy-but-non-fatal warning is tolerable until tuned | S:90 R:60 A:80 D:80 |
| 8 | Certain | `tu` (no `help/tu.json`) under report-only: still commit its README (canonical) with an "unverified" warning, rather than refusing to commit | Discussed — report-only means canonical wins even when verification can't run; consistent with assumption #1 | S:85 R:60 A:80 D:80 |
| 9 | Confident | The vn39 rule remains a HARD rule for hand-written site prose, but becomes report-only ONLY for pulled README prose; memory must keep the two consumers distinct | Strong codebase signal — `vn39`/`help-collection` established the hard rule for hand-written content; this change only relaxes the *pulled-prose* path. Not separately debated but follows from #1 | S:75 R:60 A:85 D:75 |
| 10 | Certain | Constitution version bump is a PATCH (v2.1.0 → v2.1.1) — wording/behavior correction, principle unchanged | Clarified — user confirmed patch: the deep-synced-content principle is unchanged; only the gate behavior (block→report) and page placement (overview→readme page) change | S:95 R:60 A:60 D:55 |
| 11 | Certain | Existing hand-written overview depth (fab-kit, idea) migrates INTO the tool's canonical README — it flows back to the site via the readme page; NOT kept as interim site-authored content | Clarified — user chose the canonical README as the single home; interim readme-page prose is whatever the current README has until the tool repos absorb the depth (tool-repo edits are a follow-up, out of THIS repo's scope) | S:95 R:55 A:60 D:50 |
| 12 | Certain | `readme` page sidebar label + title is "Readme"; slug `/tools/<tool>/readme` | Clarified — user chose "Readme": most honest about the source (it is the tool's README rendered), sets the right expectation vs. "Docs"/"Guide" | S:95 R:75 A:60 D:55 |

12 assumptions (12 certain, 0 confident, 0 tentative, 0 unresolved).
