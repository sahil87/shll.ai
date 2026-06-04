# Intake: README-Extraction Contract & Daily README-Pull Pipeline

**Change**: 260604-w32m-readme-extraction-contract
**Created**: 2026-06-04
**Status**: Draft

## Origin

> Discussion (this session, via `/fab-discuss` → free-form design conversation): The tool
> GitHub READMEs carry far more depth than shll.ai shows — fab-kit has reasoning/workflow/
> philosophy, run-kit has screenshots, hop has reference diagrams. These tools have no other
> dedicated website. The user asked how to think about duplication between GitHub READMEs and
> `shll.ai/<tool>`, which is canonical, and what the convention *should* be (explicitly setting
> aside the current constitution stance).

The conversation converged on four hard constraints stated by the user:

1. **Depth on the site** — anyone visiting shll.ai must get a *deep* understanding of each tool
   *on the site*, not by clicking out to GitHub.
2. **Authoring stays in the tool repo** — that is where keeping docs fresh is natural; the tool
   repo is therefore the canonical source, not shll.ai.
3. **Curated subset, not the whole README** — not all documentation is copied to the site.
4. **What is copied stays fresh** — no manual re-paste, no drift.

These four constraints uniquely select one architecture: **the tool repo is canonical; shll.ai
pulls a deduced, curated slice on a schedule and renders it** — the exact pull-side architecture
already proven by `help-dump` (`docs/specs/help-dump-contract.md` + `scheduled-help-refresh.yml`).
This change generalizes that pattern from "command reference" to "authored README prose."

Interaction mode: conversational, multi-turn. All key decisions below were made explicitly with
the user during the discussion and are encoded as Certain/Confident assumptions.

## Why

**The problem.** The live Starlight site (`sites/astro-starlight-terminal1`) has uneven, shallow
per-tool coverage: `fab-kit` has overview/install/commands/workflows, but `run-kit` and `hop`
have only `overview.mdx` + the generated `commands.mdx`. Meanwhile each tool's README is the
richest, most-maintained artifact it has. A visitor to `shll.ai/run-kit` cannot learn the tool
deeply without leaving for GitHub — which defeats the purpose of having per-tool pages for tools
that have no other website.

**The consequence of inaction.** Either (a) the site stays a thin directory and fails constraint 1
(depth), or (b) someone hand-copies README prose onto the site and it rots — the precise drift
`vn39` had to clean up (fabricated commands/flags). Neither is acceptable.

**Why this approach over alternatives.** Three families were considered:
- *README-canonical, site links out* (current constitution): rejected — fails the depth constraint;
  "go read the README" is the experience we are eliminating.
- *Site-canonical, README is a stub*: rejected — inverts the toolkit ethos (developers expect docs
  in the README) and couples each tool's docs to this repo's deploy.
- *Single-sourced, mechanically synced* (chosen): the only family that escapes the duplication
  tradeoff. It reuses the proven `help-dump` pull architecture (scheduled job off the deploy path,
  data at repo root surviving a live-site swap, missing→placeholder / invalid→build-fail discipline,
  the `vn39` "site prose must not contradict source of truth" gate).

Within the synced family, **structural deduction from the canonical README** (not skip-markers, not
a separate site-doc set) was chosen because the user observed every toolkit README shares the same
top structure (H1 → toolkit blockquote → badges → content), so the site slice can be *deduced*
mechanically with no marker discipline to rot.

## What Changes

This change ships **end-to-end in a single change** (confirmed via `/fab-clarify` — NOT the
contract-first-then-consumer split that `help-dump` used). Four deliverables land together: (1) a
**published contract** in `docs/specs/` defining how tool READMEs must be structured and how shll.ai
extracts the site slice; (2) the **pull workflow** for all 7 tools; (3) the **render component**
wired into all tool overviews; (4) a **constitution amendment** (v2.0.0 → v2.1.0) revising the
tool-page stance. The model is intentionally symmetric with the existing `help-dump-contract.md`
(producer contract) + `scheduled-help-refresh.yml` (consumer).
<!-- clarified: scope = full end-to-end (all 7 tools, contract + workflow + render + constitution), one change, no follow-up -->

> **Out-of-scope boundary (unchanged):** conforming the 7 *external* tool repos' READMEs to the
> contract is a forward, per-repo, gradual activity (like the help producers) — NOT part of this
> change. "All 7 tools" above refers to this repo's pull + render wiring being complete for all 7
> slugs, degrading to the missing→placeholder state for any tool whose README isn't yet conformant.

### 1. The README-extraction contract (`docs/specs/readme-extraction-contract.md`)

A new forward contract, sibling to `help-dump-contract.md`. Unlike `help-dump` (which asks each
tool to *emit a new artifact*), this contract mostly *constrains an artifact tools already have* —
the README. It states this asymmetry explicitly: it is partly "keep this structure" rather than
"emit this."

**Head rule (where the site slice begins).** The site content begins *after* the leading chrome:
skip the H1 (tool name), the toolkit blockquote (`> Part of @sahil87's toolkit …`), and the
contiguous badge line(s) (`[![…]](…)` / `![…](…)` rows). Site content = the first prose paragraph
onward. Example structure (from `idea`'s README):

```markdown
# idea                          ← H1 (skipped)
> Part of @sahil87's toolkit…   ← toolkit blockquote (skipped)
[release] [downloads] [stars]   ← badge row (skipped)
                                ← ← ← SITE CONTENT STARTS HERE
Capture and manage ideas…       ← tagline paragraph (first pulled line)
## Why idea?                    ← first real section (pulled)
```

The contract MUST define precisely what counts as skippable head chrome: the single leading H1, a
single leading `> blockquote`, and any contiguous run of markdown/HTML image-or-badge lines
(`![…](…)`, `[![…](…)](…)`, `<p align=…><img …></p>`). Deduction stops skipping at the first line
that is none of these.

**Tail rule (where the site slice ends).** Pulling must stop before GitHub-native footer chrome. The
slice ends at the first occurrence of a denylisted section heading. **Final denylist** (confirmed
via `/fab-clarify`): `Contributing`, `Development`, `Building`, `License`, `Acknowledgements`.
`Changelog`, `Roadmap`, and `FAQ` are **deliberately NOT denylisted**.

**`Install` / `Installation` is INCLUDED (pulled), NOT excluded** (revised via `/fab-clarify`). A
tool's own README install section legitimately carries tool-specific detail the common `shll`
quick-start skips, and that detail belongs on the site. This does **not** conflict with `vn39`:
`vn39`'s actual rule is "site prose MUST NOT reference commands/flags absent from `help/<tool>.json`"
— not "Install sections are forbidden." A pulled install section is fine *as long as its commands are
real*, which the validation gate (below) enforces. **Coexistence model:** the global
`getting-started/install` quick-start stays canonical for "install the whole toolkit"; each tool's
pulled Install section is canonical for "install just this tool + its specifics." Both ship, framed
differently — accepted as legitimate (not drift), since both can be simultaneously correct.
<!-- clarified: Install INCLUDED (pulled), not denylisted; vn39 gate (not exclusion) guards its accuracy; global quick-start + per-tool install coexist, framed differently -->

Matching is on the section *heading text* (case-insensitive, `##`/`###`), independent of position;
the first denylisted heading encountered (after the head chrome) terminates the slice.

**Image rule.** Screenshots are referenced by their repo URL — NOT copied into the shll.ai repo.
Alt text is mandatory and travels inside the markdown (`![alt](url)`); good alt text in the README
is therefore correct on shll.ai automatically (single-source). Freshness is guaranteed by
*co-capture*: the image URL and the surrounding prose are pulled in the **same daily run**, so a
repo reorganizing images breaks both together and self-heals on the next run. Accepted known
property: a ≤24h window where the live site may hotlink a since-moved image (transient broken
image, never a broken build). Build-time vendoring of images is explicitly deferred (kept as a
consumer-side option that needs no repo-side change).

**Dark-theme stanzas (two parties).** The contract carries dark-mode guidance split by party:
- *Producer (tool author):* prefer theme-agnostic screenshots (CLI shots read on any background —
  expected to cover ~90% of cases). For genuine light/dark diagram pairs, use standard
  `<picture><source media="(prefers-color-scheme: …)">` with a fallback `<img>`. Do NOT use the
  GitHub-proprietary `#gh-dark-mode-only` / `#gh-light-mode-only` URL-fragment trick — it renders
  wrong-theme duplicates off GitHub and will be stripped by the puller.
- *Consumer (shll.ai render):* the live site's dark mode is Starlight's `data-theme` toggle, NOT
  `prefers-color-scheme` (confirmed: `astro.config.mjs` uses `expressiveCode themes:
  ['github-dark','github-light']` + Starlight's theme attribute). So a pulled `prefers-color-scheme`
  `<picture>` tracks the OS, not the site toggle — a mismatch on manual flip. The site accepts
  OS-tracked images for theme-agnostic shots; mapping `<picture>` sources to `data-theme` is a
  documented consumer-side escape hatch, deferred until a real diagram needs it.

**Mermaid decision (Option A — strip, require rendered images).** Astro Starlight does NOT render
mermaid out of the box (confirmed: no mermaid/rehype-mermaid dependency in
`sites/astro-starlight-terminal1/package.json`; Starlight passes ` ```mermaid ` fences to the code
highlighter, so they render as syntax-highlighted *text*, not diagrams). Rather than add a
heavyweight build-time browser dependency (`rehype-mermaid` + Playwright — Constitution VI tension)
or ship client-side mermaid JS (Constitution I violation), the contract MANDATES: diagrams destined
for shll.ai MUST be committed as rendered images (SVG preferred, for dark-theme control); inline
` ```mermaid ` fences are NOT rendered on shll.ai and WILL be stripped on pull. Tools keep mermaid
in their README for GitHub's native rendering if they wish; they additionally commit a rendered SVG
for the site. (GitHub Actions can render mermaid→SVG trivially.)

**`docs/site/` escape hatch.** The README slice is the default source. For site-only additions that
should NOT live in the README, a tool repo MAY add `docs/site/*.md`, which the puller also pulls.
Maintainer/design notes that must never reach the site go in `docs/internal/` (NOT `docs/specs/` —
that name collides with fab's existing meaning of pre-implementation design intent). The axis is
**audience** (user-facing / GitHub-native / maintainer-facing), not "wanted vs. unwanted."

**Validation gate (the `vn39` integration — load-bearing).** Pulled README prose WILL contain
command/flag examples — exactly what the `vn39` binding rule polices ("site prose MUST NOT reference
commands/flags absent from `help/<tool>.json`"). The pull job MUST run pulled prose through the same
grep-zero / per-command cross-check gate BEFORE commit, or it auto-imports the very drift `vn39`
banned. This is the single most important integration point.

**This gate is now the SOLE guard on install accuracy** (since `Install` is pulled, not excluded —
see Tail rule). The exact failure mode `vn39` cleaned up (`shll shell-install`, a non-existent alias
that lived in install instructions) MUST be caught here: if a tool's pulled Install section references
a command/flag absent from `help/<tool>.json`, the gate fails the pull **for that tool**, which keeps
its last-good slice (per-tool failure isolation) and surfaces the defect — the fix belongs in the
tool's README, never a silent exclusion on the shll.ai side. The plan MUST treat install-section
command verification as a first-class gate case, not an afterthought.

### 2. The pull + render pipeline (consumer)

- **Pull job:** extend `scheduled-help-refresh.yml` (or add a sibling workflow on the same daily
  cron + `workflow_dispatch`) to, per tool: fetch the repo's `README.md` (and any `docs/site/*.md`),
  apply head/tail deduction + mermaid-strip + `#gh-*-mode-only`-strip, run the `vn39` validation
  gate, and on success commit the extracted slice to a repo-root location (a new `content/<tool>/`
  directory, sibling to `help/`, so it survives a live-site swap — same rationale as `help/`).
  Direct-commit-to-`main`-gated-on-validation, off the deploy path, with per-tool failure isolation
  (a failing tool keeps its last-good slice; others proceed) — mirroring the `help-dump` job exactly.
- **Render side:** a Starlight component (sibling to `CommandReference.astro`) reads the pulled
  slice at build time via the ascend-to-root `fs` read (the `import.meta.url` pattern proven in
  `help-collection.md` — NOT a fixed relative depth, NOT `process.cwd()`, NOT `import.meta.glob`),
  and **injects it into each tool's existing `overview.mdx`** (confirmed via `/fab-clarify` — NOT a
  new dedicated page), with missing→placeholder / present-but-invalid→build-fail behavior. The
  overview page thus becomes: `<GithubButton>` + the injected pulled slice + any existing
  hand-written overview prose. Sidebar in `astro.config.mjs` is unchanged for placement (no new
  page) but is reviewed for correctness — note `astro.config.mjs` now also carries a `Reference`
  sidebar group from `qemq` (see "Post-rebase context" below); the plan edits the CURRENT config.
  <!-- clarified: render target = overview.mdx injection; data dir = content/<tool>/ sibling to help/ -->
- **Parse/extraction precedent (`qemq`, #30, 2026-06-04 — now on `main`):** the deduction + strip
  logic (head/tail boundary detection, mermaid-fence strip, `#gh-*-mode-only` strip, denylist match)
  SHALL follow the pattern `qemq` established for `src/lib/parse-help.ts`: a **pure, dependency-free,
  build-time** text transform (Constitution I + VI) **pinned by a native `node --test`**
  (`scripts/*.test.mjs`, type-stripping — the same toolchain as `validate-help.mjs`/`parse-help.test.mjs`).
  `qemq` proved this exact shape for decomposing captured `-h` text; README extraction is the same
  class of problem (parse pulled text at build time, no new dependency) and SHALL reuse the precedent
  rather than invent a parallel one. The verbatim source remains the authoritative fallback, mirroring
  `qemq`'s "show raw" stance. The slice is markdown, so it renders through the existing MDX/markdown
  path — no new renderer dependency.
- **Repo-root data location:** the extracted slice is committed to a **new `content/<tool>/`
  directory at the repo root** (sibling to `help/`, `sites/`, `fab/`, `docs/`) — confirmed via
  `/fab-clarify`. Same rationale as `help/`: project-level data that survives a live-site swap
  (Constitution II + III), kept distinct from `help/` so the two data kinds don't overload one dir.

### 3. Constitution amendment (confirmed)

The current constitution's tool-page stance ("Short pages, not deep docs"; "Screenshots: link to
GitHub") is in tension with constraint 1 (depth on the site). This change **amends the constitution**
(confirmed via `/fab-clarify`): bump `fab/project/constitution.md` **v2.0.0 → v2.1.0** with a
changelog entry, formally revising the tool-page stance to permit deep, mechanically-synced README
prose + referenced screenshots + rendered diagrams on the site. The anti-drift *value* behind the
old stance is preserved and made explicit in the amendment — content is still single-sourced and
mechanically synced, never hand-copied.
<!-- clarified: tool-page stance change requires a constitution amendment (v2.0.0 → v2.1.0 + changelog), not just a memory update -->

Note: the existing constitution principles (I static-first, II site-isolation, III one-live-site,
IV deploy-via-CI, V dark-mode, VI minimal-deps) are NOT relaxed — the amendment targets the
*tool-page depth* stance specifically. The pipeline is designed to honor all six (static build,
repo-root data surviving swaps, off-deploy-path pull, no new runtime dep, dark-mode parity).

## Affected Memory

> **Post-rebase note (read first):** the branch was rebased onto `origin/main` after intake creation,
> picking up `qemq` (#30) and the `#29` context fix. The two memory files below were **edited by
> `qemq` on 2026-06-04** (they gained the structured-render + cross-tool-index sections). Hydrate
> MUST edit the **current, post-`qemq`** versions, not the versions present at intake creation.

- `conventions/tool-page-rubric`: (modify) The rubric's "SHALL NOT contain … Screenshots /
  Architecture diagrams" and "Short pages, not deep docs" rules are revised — the site now hosts
  deep, pulled README prose + referenced screenshots + rendered diagrams. Add the README-slice as a
  permitted (because generated/synced, not hand-written) content source, parallel to the existing
  generated-Command-reference exception (and to `qemq`'s enriched/structured command-reference render).
- `conventions/help-collection`: (modify) Cross-link the new README-pull as a sibling of the
  help-pull; note the shared daily job / repo-root-data / off-deploy-path / `vn39`-gate patterns are
  now reused by a second consumer. Also cross-reference `qemq`'s build-time `parseHelp` pattern as the
  precedent the README deduction logic follows (pure, dependency-free, native-test-pinned build-time
  parse).
- `conventions/readme-extraction` (or similar): (new) The consume/pull-side memory for README
  extraction — deduction rules as implemented, the `content/<tool>/` collector, the render component,
  the daily pull job — mirroring how `help-collection.md` documents the help consume side. Created at
  hydrate.
- `build-deploy/deployment`: (modify) Note the second inbound scheduled pull path (README pull)
  alongside the existing help-refresh pull path.

## Impact

- **New spec:** `docs/specs/readme-extraction-contract.md` (+ `docs/specs/index.md` row). This is
  the primary deliverable.
- **Tool repos (7, external to this repo):** must conform their READMEs to the head/tail structure
  and the mermaid-as-SVG rule. This is a *forward* contract — adoption is per-repo and gradual, like
  `help-dump`. The contract describes the requirement; actual per-repo conformance is out of scope
  for this change (tracked separately, like the help producers were).
- **CI:** `.github/workflows/` — extend `scheduled-help-refresh.yml` or add a sibling pull workflow.
- **Live Starlight site** (`sites/astro-starlight-terminal1`): new render component + page wiring +
  `astro.config.mjs` sidebar; reuses the ascend-to-root read + schema-validate + missing/invalid
  discipline from `CommandReference.astro`. No new runtime dependency intended.
- **Constitution** (`fab/project/constitution.md`): **amendment confirmed** — v2.0.0 → v2.1.0 +
  changelog, revising the tool-page-depth stance (the six core principles are not relaxed).
- **Phasing:** **none** — this change ships everything end-to-end (contract + memory + pull workflow
  for all 7 tools + render injection into all overviews + constitution amendment + `vn39` gate in
  CI). No follow-up change. (This differs from `help-dump`, which split contract `xiis` from
  consumer `js1s`; the user chose a single end-to-end change here.)

### Post-rebase context (`#29`, `qemq`/`#30` — verified non-conflicting)

This branch was rebased onto `origin/main` (HEAD `26023f5`) before planning. Two upstream commits
landed; both were reviewed and **neither contradicts this intake**:

- **`#29` (`docs(context)`):** corrected `context.md` to confirm **`astro-starlight-terminal1` is the
  live site** (the other variant is "not deployed"). This *validates* every `sites/astro-starlight-terminal1/...`
  path this intake already uses — no change required.
- **`qemq` / `#30` (enriched command reference):** a **consume-side, display-only** enrichment of the
  command reference. It (a) added `src/lib/parse-help.ts` + `scripts/parse-help.test.mjs` (build-time,
  dependency-free, native-test-pinned — now cited as our extraction precedent, see §2 Render side);
  (b) rewrote `CommandReference.astro` to a structured per-node view; (c) added a **cross-tool command
  index** at `/reference/command-index` under a **new `Reference` sidebar group** in `astro.config.mjs`;
  (d) edited `tool-page-rubric.md` + `help-collection.md` (now post-`qemq` — see Affected Memory).
  Critically, `qemq` left the **forward contract and `schemas.ts` untouched** (purely consume-side).
  - **Non-conflict with our render target:** our slice injects into `overview.mdx`; `qemq`'s new page
    is `/reference/command-index` — different page, different component, no collision. The plan edits
    the **current** `astro.config.mjs` (which now has the `Reference` group) and must not clobber it.
  - **New IA axis (awareness, not a decision change):** `qemq` introduced a cross-tool `Reference`
    surface. This does NOT reopen the overview-injection decision (assumption #11), but the plan
    should be aware the site's information architecture now has a tool-axis (per-tool pages) AND a
    cross-tool-axis (`/reference/`); README prose stays on the per-tool axis (overview), as decided.

## Open Questions

All five intake open questions were resolved via `/fab-clarify` (2026-06-04) — see `## Clarifications`:

- ~~Scope: contract-only vs. end-to-end?~~ → **end-to-end, single change** (all 7 tools).
- ~~Final tail-rule denylist?~~ → **Contributing / Development / Building / License /
  Acknowledgements**. **Install is INCLUDED (pulled)** — accuracy guarded by the `vn39` validation
  gate, not by exclusion; coexists with the global quick-start. Changelog/Roadmap/FAQ allowed.
- ~~Constitution amendment vs. memory update?~~ → **amend** (v2.0.0 → v2.1.0 + changelog).
- ~~Render placement?~~ → **inject into existing `overview.mdx`** (no dedicated page).
- ~~Repo-root data location?~~ → **new `content/<tool>/`** (sibling to `help/`).

No open questions remain.

## Clarifications

### Session 2026-06-04

| # | Question | Answer |
|---|----------|--------|
| 12 | Scope of this change | Everything end-to-end: contract + memory + pull workflow (all 7 tools) + render component (all wired) + `astro.config.mjs` sidebar + `vn39` gate. No follow-up. |
| 13 | Final tail-rule denylist | Contributing, Development, Building, License, Acknowledgements. Changelog/Roadmap/FAQ NOT denylisted. |
| 13b | Is Install pulled or excluded? | **Pulled (included)** — reversed from the initial exclusion. Per-tool install sections carry legit extra detail; `vn39` is satisfied by the validation gate (commands must be real), not by excluding the section. Global quick-start ("whole toolkit") + per-tool install ("this tool's specifics") coexist, framed differently. |
| 14 | Constitution amendment needed? | Yes — amend `constitution.md` v2.0.0 → v2.1.0 + changelog, revising the tool-page-depth stance. Six core principles unchanged. |
| 11 | Render placement | Inject the pulled slice into the existing `overview.mdx` (not a new dedicated page). |
| 10 | Repo-root data location | New `content/<tool>/` dir (sibling to `help/`). |

## Assumptions

<!-- STATE TRANSFER: decisions reached during the discussion, encoded for the plan-generation agent. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Tool repo is the canonical source; shll.ai pulls a curated slice (single-source + mechanical sync) | Discussed — uniquely forced by the user's 4 constraints (depth on site, authoring in repo, curated subset, stay fresh); other families explicitly rejected | S:95 R:80 A:90 D:95 |
| 2 | Certain | Reuse the `help-dump` pull architecture (daily job off deploy path, repo-root data surviving live-site swap, missing→placeholder/invalid→build-fail, `vn39` gate) | Discussed — proven sibling pattern already in repo (`scheduled-help-refresh.yml`, `help-collection.md`); not inventing a new mechanism | S:95 R:75 A:90 D:90 |
| 3 | Certain | Structural deduction (skip H1 + toolkit blockquote + badges; stop at denylisted sections) — NOT skip-markers | Discussed — user observed all toolkit READMEs share the top structure; markers rot, structure does not. Head shown via `idea` README example | S:90 R:70 A:85 D:85 |
| 4 | Certain | Mermaid: Option A — strip inline mermaid, require rendered SVG | Discussed + verified: no mermaid dep in Starlight `package.json`; native render is text-not-diagram. Build-time browser dep (VI) and client JS (I) both rejected | S:90 R:65 A:90 D:90 |
| 5 | Certain | Screenshots referenced by repo URL (not copied), co-captured daily with prose; alt text authored in README travels with markdown | Discussed — user's argument: if the image moves, the prose moves too, and the daily job re-syncs both; ≤24h transient-404 window accepted | S:90 R:75 A:85 D:90 |
| 6 | Certain | Dark-theme guidance is split producer/consumer; prefer theme-agnostic shots; strip `#gh-*-mode-only`; `data-theme`-aware `<picture>` mapping deferred | Discussed + verified site uses `data-theme` toggle not `prefers-color-scheme`; alt-text solved at source, dark-mode is a render-surface concern | S:85 R:70 A:85 D:85 |
| 7 | Certain | Publish a README-extraction contract in `docs/specs/`, symmetric with `help-dump-contract.md` | Discussed — user explicitly proposed shll.ai house a README contract for tools to follow, just like the help-dump contract | S:95 R:80 A:90 D:95 |
| 8 | Confident | `docs/site/` = site-only additions (pulled); `docs/internal/` = maintainer notes (never pulled); axis is audience | Discussed — user proposed `docs/site/`; the `docs/specs/`-vs-`docs/internal/` naming correction (avoid colliding with fab's `specs` meaning) was agreed | S:80 R:65 A:80 D:75 |
| 9 | Certain | `vn39` command/flag validation gate MUST run on pulled prose before commit; it is the SOLE guard on pulled-install accuracy | Clarified — with Install now pulled (not excluded), the gate is what enforces `vn39` for install commands; a tool whose install section cites a fabricated command fails the pull for that tool (keeps last-good), fix belongs in the tool README | S:90 R:60 A:90 D:85 |
| 10 | Certain | Repo-root collector is a new `content/<tool>/` dir (sibling to `help/`) | Clarified — user confirmed; survives a live-site swap, same rationale as `help/`, keeps README data distinct from help data | S:95 R:55 A:60 D:55 |
| 11 | Certain | Render the pulled slice by injecting it INTO the existing `overview.mdx` (not a new dedicated page) | Clarified — user chose overview injection: depth is sought first on overview; fewer pages. Overview now = GithubButton + pulled slice + existing prose | S:95 R:60 A:55 D:50 |
| 12 | Certain | Scope = everything end-to-end in THIS change: contract + memory + pull workflow (all 7 tools) + render component (all wired) + `astro.config.mjs` sidebar + `vn39` validation gate | Clarified — user chose full end-to-end (not the contract-first split `help-dump` used). One change, largest blast radius, no follow-up | S:95 R:55 A:60 D:50 |
| 13 | Certain | Tail-rule denylist = `Contributing`, `Development`, `Building`, `License`, `Acknowledgements`. `Install`/`Installation` is INCLUDED (pulled); `Changelog`/`Roadmap`/`FAQ` are NOT denylisted | Clarified — user reversed the Install exclusion: per-tool install sections carry legit extra detail; `vn39` is satisfied by the validation gate (real commands), not by excluding the section. Global quick-start + per-tool install coexist, framed differently | S:95 R:65 A:65 D:55 |
| 14 | Certain | Revising the tool-page rubric REQUIRES a constitution amendment (v2.0.0 → v2.1.0) + changelog entry, alongside the memory update | Clarified — user chose to amend: the "site is a thin directory / no screenshots" stance is treated as a first-class principle worth formal governance | S:95 R:45 A:55 D:50 |

14 assumptions (13 certain, 1 confident, 0 tentative, 0 unresolved).
