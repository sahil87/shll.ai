# Plan: Content / Keyword Depth Pass (Editorial SEO)

**Change**: 260618-bees-content-keyword-seo-pass
**Intake**: `intake.md`

## Requirements

<!-- Derived from the intake design. This is an editorial/content SEO pass on the
     live Astro+Starlight site (`sites/astro-starlight-terminal1/`). All edits are
     confined to site-authored content under `src/content/docs/`. -->

### SEO Content: Meta Descriptions

#### R1: Hand-authored meta descriptions are kept and editorially refined
Every editable content page SHALL retain a non-empty, unique frontmatter `description`. Descriptions MUST NOT be downgraded to `help/<tool>.json` `root.short` (intake Assumption #1, user-resolved). Where a description is already optimal it SHALL be left byte-for-byte; otherwise it MAY be sharpened for keyword coverage, kept ≤ ~155 chars, leading with the highest-value keyword and naming the job.

- **GIVEN** the 7 tool overviews + `index.mdx` + `getting-started/*` + `tools/index.mdx` + `reference/command-index.mdx` + `workflows/*`, each already carrying a unique `description`
- **WHEN** the editorial pass runs
- **THEN** each page still has a non-empty `description`, all descriptions remain unique across the site, and none was replaced by the terser `root.short`

#### R2: Any command/flag named in a refined description passes the vn39 hard rule
Any command or flag token written in a refined (hand-authored) description MUST exist in the corresponding `help/<tool>.json`. Slash-command skills (`/fab-new`, `/fab-fff`, etc.) are Claude Code skills, NOT `fab`-CLI tokens, and are exempt from the help-JSON cross-check (see Assumption #8); file paths (`fab/backlog.md`) are also exempt.

- **GIVEN** a description mentioning a CLI command or flag (e.g. `fab change new`, `shll install`, `wt create`)
- **WHEN** the description is finalized
- **THEN** that token resolves in the relevant `help/<tool>.json` command/flag tree

### SEO Content: Job-Framed Lead Sentences

#### R3: Each tool overview body opens with a job-framed lead
Each `tools/<tool>/overview.mdx` body SHALL open with a "what is `<tool>` / why use it / who it's for" lead that surfaces ranking keywords in the first indexable paragraph, replacing or augmenting the current single terse sentence. The Starlight frontmatter `title:` (bare slug) SHALL NOT change (intake Assumption #5 — it cascades to the sidebar label and the settled `kb1r` `shll | shll` discipline).

- **GIVEN** a tool overview whose only body prose is one terse sentence under `<GithubButton>`
- **WHEN** the pass runs
- **THEN** the body leads with a job-framed paragraph and the frontmatter `title:` is unchanged

#### R4: Homepage and getting-started/overview framing is sharpened conservatively
The homepage `index.mdx` `cat ABOUT.md` prose and `getting-started/overview.md` intro SHALL be sharpened for the "what is shll / why / who it's for" keywords by refining EXISTING copy — not by inventing new claims or adding new sections (intake Tentative Assumption #7). The homepage `head:` frontmatter overrides block (change `kb1r`) and the hero `tagline` MUST NOT be touched.

- **GIVEN** the homepage `cat ABOUT.md` block and the `getting-started/overview.md` intro
- **WHEN** the pass runs
- **THEN** the copy is keyword-sharpened, no new claims/sections are introduced, and the `head:` block + hero tagline are byte-for-byte unchanged

### SEO Content: Internal Linking (the connected graph)

#### R5: Each overview gains a "How it fits" cross-tool linking subsection
Each `tools/<tool>/overview.mdx` SHALL gain a `## How it fits` subsection linking adjacent tools in the `idea → fab-kit → wt → run-kit` workflow chain (plus `tu`/`hop` cross-cutting, `shll` bootstrap), via relative MDX links targeting `/tools/<tool>/overview/` in the established `[wt](../../wt/overview/)` style (intake Assumption #4). The per-page link map is the intake's, adjusted by editorial judgment.

- **GIVEN** a tool overview with zero cross-tool links today
- **WHEN** the pass runs
- **THEN** the overview carries a `## How it fits` subsection with one-line-context relative links to its adjacent tools, each resolving to a real `/tools/<tool>/overview/` page

#### R6: The getting-started/overview ASCII workflow diagram tool names become links
The tool names in the `getting-started/overview.md` ASCII workflow diagram (and the adjacent `tu`/`hop`/`shll` prose) SHALL become relative links to their `/tools/<tool>/overview/` pages, so the diagram is navigable, not just illustrative.

- **GIVEN** the `idea → fab-kit → wt → run-kit` ASCII diagram rendered in a fenced code block
- **WHEN** the pass runs
- **THEN** the four chain tool names (and the cross-cutting `tu`/`hop`/`shll` mentions in surrounding prose) link to their overview pages

### SEO Content: Completeness Gate

#### R7: Title + description completeness is re-verified post-edit
After all edits, every rendered indexable page MUST still carry a non-empty, unique frontmatter `description`, and per-page `<title>`s MUST remain unique. The deliberate `shll | shll` (tools/shll) and the homepage `shll — the AI coding toolkit` override are correct-by-design (`kb1r`) and MUST NOT be "fixed".

- **GIVEN** the completed edits
- **WHEN** the completeness gate runs
- **THEN** no description was emptied or duplicated, titles remain unique, and `pnpm build` succeeds + `validate-help.mjs` passes

### Non-Goals

- No edits to `readme.mdx` (synced README slice), `commands.mdx` (generated), or any `help/<tool>.json` (canonical machine source) — Constitution § Tool-Page Depth.
- No new dependencies, components, build-code, Starlight-config, or runtime changes — content-only MDX/Markdown edits (Constitution I, VI).
- No change to the `pgox` JSON-LD or `354p` llms.txt logic (they re-read the same content; an MDX edit is automatically an `llms-full.txt` content change — the intended coupling).
- No change to the homepage `head:` overrides block, hero `tagline`, the `whoami` author block, or any drift-surface hand-copy semantics (LinkedIn `ahujasahil`, `rk` vs `run-kit`).

### Design Decisions

1. **Cross-tool links use the relative `../../<tool>/overview/` form** — *Why*: matches the existing `[Readme](../readme/)` / `[Commands](../commands/)` style in every overview and the intake's worked example; resolves correctly from `/tools/<tool>/overview/` (`..`→tool dir, `..`→`/tools/`, then `<tool>/overview/`). *Rejected*: root-absolute `/tools/<tool>/overview/` links — would diverge from the established in-overview link idiom.
2. **vn39 scope excludes slash-command skills** — *Why*: `help/<tool>.json` carries only the CLI binary's subcommands/flags; `/fab-new`, `/fab-fff`, `/fab-clarify`, `/git-pr-review` are Claude Code skills and appear in zero help JSON. Memory (`tool-page-rubric.md`, the `jf3q` audit) explicitly records "`fab change new` creates the folder + `.status.yaml` while the `/fab-new` skill writes `intake.md`" as ground truth, and the live `idea/overview.mdx` already ships "feeds /fab-new". So slash commands are a recognized, accurate token category outside the help-JSON cross-check. *Rejected*: treating `/fab-new` as a vn39 violation — contradicts shipped prose and recorded convention. (Recorded as Assumption #8.)

## Tasks

### Phase 1: Tool Overviews (lead reframe + "How it fits" linking + description refine)

<!-- Each overview is an independent file edit — all [P]. Per file: refine the
     frontmatter description if warranted (R1/R2), reframe the body lead (R3),
     add a `## How it fits` subsection (R5). The `## Where to next` block stays. -->

- [x] T001 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/idea/overview.mdx`: job-framed lead + `## How it fits` linking fab-kit, wt, tu; keep/refine description <!-- R1 R3 R5 -->
- [x] T002 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/fab-kit/overview.mdx`: job-framed lead + `## How it fits` linking idea, wt, run-kit; keep/refine description <!-- R1 R3 R5 -->
- [x] T003 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/wt/overview.mdx`: job-framed lead + `## How it fits` linking fab-kit, run-kit; keep/refine description <!-- R1 R3 R5 -->
- [x] T004 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/run-kit/overview.mdx`: job-framed lead + `## How it fits` linking wt, tu; keep/refine description <!-- R1 R3 R5 -->
- [x] T005 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/tu/overview.mdx`: job-framed lead + `## How it fits` (cross-cutting) linking fab-kit, run-kit; keep/refine description <!-- R1 R3 R5 -->
- [x] T006 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/hop/overview.mdx`: job-framed lead + `## How it fits` (cross-cutting nav) linking idea, wt; keep/refine description <!-- R1 R3 R5 -->
- [x] T007 [P] Edit `sites/astro-starlight-terminal1/src/content/docs/tools/shll/overview.mdx`: job-framed lead + `## How it fits` (bootstrap) linking all/the install page; keep/refine description <!-- R1 R3 R5 -->

### Phase 2: Homepage + Getting-Started Framing

- [x] T008 Edit `sites/astro-starlight-terminal1/src/content/docs/getting-started/overview.md`: sharpen "what is shll / who for" intro framing (R4); make the ASCII workflow-diagram tool names + the `tu`/`hop`/`shll` prose mentions into relative links to `/tools/<tool>/overview/` (R6) <!-- R4 R6 -->
- [x] T009 Edit `sites/astro-starlight-terminal1/src/content/docs/index.mdx`: sharpen the `cat ABOUT.md` prose for keywords (R4) — refine existing copy only, do NOT touch the `head:` block, hero `tagline`, or the `whoami`/`ls tools/`/install blocks <!-- R4 -->
- [x] T010 [P] Review `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md` + `philosophy.md` descriptions/headings; refine only if thin (else leave byte-for-byte) — reviewed: both descriptions already optimal + unique, left byte-for-byte per R1 <!-- R1 -->
- [x] T011 [P] Review `sites/astro-starlight-terminal1/src/content/docs/tools/index.mdx` description; refine only if warranted (else leave byte-for-byte) — reviewed: already strong/keyword-rich, left byte-for-byte per R1 <!-- R1 -->

### Phase 3: vn39 Cross-Check + Completeness Gate

- [x] T012 vn39 cross-check: grep every CLI command/flag token in all edited prose against the relevant `help/<tool>.json`; run `node scripts/validate-help.mjs` from the site dir to confirm help JSON validity — all CLI tokens resolve (`rk riff`/`rk serve`, `shll install`/`shll update`); `/fab-new` exempt (skill), file paths/shell builtins exempt; validate-help PASS (7/7) <!-- R2 R7 -->
- [x] T013 Completeness gate: confirm every edited page retains a non-empty, unique frontmatter `description`; confirm titles remain unique; confirm no `readme.mdx`/`commands.mdx`/`help/*.json` was modified (`git diff --name-only`); run `pnpm build` from the site dir and confirm success — all descriptions non-empty/unique (≤145 chars), no off-limits files touched, `pnpm build` succeeded (46 pages) <!-- R7 -->

## Execution Order

- T001–T007 are independent (different files), run in parallel.
- T008–T011 are Phase 2, after the overviews (so cross-tool link targets/framing are consistent); T008/T009 sequential within their files, T010/T011 parallel.
- T012–T013 run last (they validate all prior edits).

## Acceptance

### Functional Completeness

- [ ] A-001 R1: Every edited page retains a non-empty, unique frontmatter `description`; none was downgraded to `help/<tool>.json` `root.short`; already-optimal descriptions are unchanged.
- [ ] A-002 R3: Each of the 7 `tools/<tool>/overview.mdx` bodies opens with a job-framed "what/why/who" lead, and every frontmatter `title:` is unchanged (bare slug).
- [ ] A-003 R4: The homepage `cat ABOUT.md` prose and `getting-started/overview.md` intro are keyword-sharpened from existing copy; no new claims/sections; the homepage `head:` block + hero `tagline` are byte-for-byte unchanged.
- [ ] A-004 R5: Each of the 7 overviews carries a `## How it fits` subsection with relative `../../<tool>/overview/`-style links to its adjacent tools, each resolving to a real overview page.
- [ ] A-005 R6: The `getting-started/overview.md` ASCII-diagram tool names (and the `tu`/`hop`/`shll` prose mentions) are relative links to their overview pages.

### Behavioral Correctness

- [ ] A-006 R7: Post-edit, all page `<title>`s remain unique; the `shll | shll` (tools/shll) and homepage title override are intact (not "fixed").

### Scenario Coverage

- [ ] A-007 R2: Every CLI command/flag token in edited prose resolves in the relevant `help/<tool>.json`; slash-command skills and file paths are correctly exempt; `node scripts/validate-help.mjs` passes (all 7).
- [ ] A-008 R7: `pnpm build` from `sites/astro-starlight-terminal1/` succeeds.

### Edge Cases & Error Handling

- [ ] A-009 R1: No edited page has an empty or duplicate `description` after refinement (the completeness gate catches accidental regressions).

### Removal Verification

- [ ] A-010 R7: No `readme.mdx`, `commands.mdx`, or `help/<tool>.json` file was modified (`git diff --name-only` confirms only site-authored content under `src/content/docs/` changed).

### Code Quality

- [ ] A-011 Pattern consistency: New prose/links follow the existing terminal-theme + relative-link patterns of surrounding content (the `[Readme](../readme/)` link idiom, the thin-overview framing tone).
- [ ] A-012 No unnecessary duplication: No new components or hand-copied depth introduced; existing link idioms reused (no new CSS, no new dependencies).

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Keep & editorially refine hand-authored frontmatter `description`s; do NOT downgrade to `root.short`. | User-resolved at intake (intake Assumption #1); carried into the plan verbatim. | S:95 R:80 A:90 D:95 |
| 2 | Certain | Scope is site-authored content only (7 overviews, index.mdx, getting-started/*, tools/index.mdx, reference/*, workflows/*); NO readme.mdx/commands.mdx/help.json edits. | Dictated by Constitution § Tool-Page Depth (intake Assumption #2). | S:90 R:75 A:100 D:95 |
| 3 | Confident | "How it fits" subsection per overview links adjacent tools via relative `../../<tool>/overview/` links, matching the existing `[Readme](../readme/)` idiom. | Backlog names the chain; the link form is verified correct against the live link style (intake Assumption #4). | S:80 R:80 A:85 D:75 |
| 4 | Confident | Tool-page H1 stays the bare-slug Starlight `title:`; framing is delivered via a job-framed body lead, not by changing `title:`. | Changing `title:` cascades to sidebar + the settled `kb1r` discipline (intake Assumption #5). | S:75 R:75 A:85 D:80 |
| 5 | Tentative | Homepage/overview framing is refined by sharpening EXISTING `ld0j` `cat ABOUT.md` prose, not by adding new sections or claims. | Conservative front-runner among valid editorial depths; preserves the `ld0j` sourced-copy discipline (intake Assumption #7). | S:60 R:80 A:65 D:55 |
| 6 | Certain | The vn39 cross-check excludes slash-command skills (`/fab-new`, `/fab-fff`, etc.) and file paths — they are not CLI tokens in `help/<tool>.json` and are a recognized, accurate token category per shipped prose + memory (`jf3q` audit). | `help/<tool>.json` carries only the binary's subcommands/flags (verified: zero `/fab-*` tokens in any help JSON); memory records `/fab-new` as the skill that writes `intake.md`; live `idea/overview.mdx` already ships "feeds /fab-new". The vn39 rule polices CLI commands/flags, not Claude Code skills. | S:90 R:70 A:95 D:90 |

6 assumptions (3 certain, 2 confident, 1 tentative).
