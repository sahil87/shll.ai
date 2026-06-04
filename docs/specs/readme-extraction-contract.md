# Spec: README-extraction contract

**Status**: Active
**Created**: 2026-06-04 (change `w32m`)
**Extraction anchor**: [`sites/astro-starlight-terminal1/src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts)
**Consumed by**: [`docs/memory/conventions/readme-extraction.md`](../memory/conventions/readme-extraction.md) *(created at hydrate)*
**Sibling contract**: [`help-dump-contract.md`](./help-dump-contract.md)

## Overview

This is the single forward contract for how each shll toolkit CLI's `README.md` MUST be
structured so that shll.ai can pull a **deduced, curated slice** of it and render that slice
on the tool's page. It is the README-prose counterpart to [`help-dump-contract.md`](./help-dump-contract.md)
(which governs the machine-generated command reference). The two are intentionally symmetric:
a **producer contract** in `docs/specs/` + a **consumer** (a scheduled pull workflow + a
build-time render component).

**The asymmetry with `help-dump` (state it plainly).** `help-dump` asks each tool to *emit a new
artifact* (a JSON envelope). This contract mostly **constrains an artifact tools already have** —
the README. It is therefore partly *"keep this structure"* rather than *"emit this."* The
practical consequence: there is no new subcommand to write and no new file to ship from the tool
side — a tool author's obligation is to keep the README's top structure conformant and to commit
rendered images for any diagram destined for the site.

**Anti-drift framing.** The tool repo is **canonical**; shll.ai never hand-copies README prose.
A scheduled job pulls the curated slice on a daily cadence and commits it to the repo root, so the
site's per-tool prose is fresh *by construction* — the precise drift `vn39` had to clean up
(fabricated commands/flags **hand-copied** onto the site) cannot recur, because nothing is
hand-copied. The README is **canonical and rendered verbatim**; the `help/<tool>.json` cross-check
(§7) is a **non-fatal divergence reporter**, not a publish gate — it surfaces a command/flag mismatch
as a repo-level lint (a CI `::warning::`) so the fix lands where it belongs (the tool's README),
without ever withholding the canonical slice.

**Why structural deduction (not skip-markers).** Every toolkit README shares the same top
structure (H1 → toolkit blockquote → badges → content). The site slice is therefore **deduced
mechanically** from that structure (§1 head, §2 tail) with no per-README marker discipline that
could rot. Markers rot; structure does not.

> **Out-of-scope boundary.** Conforming the 7 *external* tool repos' READMEs to this contract is a
> forward, per-repo, gradual activity (exactly like the help producers) — **NOT** part of the change
> that publishes this contract. shll.ai's pull + render wiring is complete for all 7 slugs and
> degrades to a neutral placeholder for any tool whose README is not yet conformant (or whose first
> pull has not yet succeeded).

## §1 Head rule — where the site slice begins

The site slice begins **after** the leading GitHub chrome. The puller skips, from the top of the
README, a contiguous run of:

1. the single leading **H1** (`# tool-name`),
2. a single leading **`> blockquote`** (the `> Part of @sahil87's toolkit …` line, including any
   wrapped continuation lines of that same blockquote), and
3. any contiguous run of **image / badge lines**: markdown images (`![alt](url)`), linked badges
   (`[![alt](img)](href)`), and HTML image wrappers (`<p align=…><img …></p>`, bare `<img …>`).

Blank lines interleaved with the above are part of the skipped head. Deduction **stops skipping at
the first non-blank line that is none of the above** — that line is the first line of the slice.

Example (from `idea`'s README):

```markdown
# idea                          ← H1 (skipped)
> Part of @sahil87's toolkit…   ← toolkit blockquote (skipped)
[release] [downloads] [stars]   ← badge row (skipped)
                                ← ← ← SITE CONTENT STARTS HERE
Capture and manage ideas…       ← tagline paragraph (first pulled line)
## Why idea?                    ← first real section (pulled)
```

### GIVEN/WHEN/THEN

- **Chrome is skipped, slice begins at first prose** — GIVEN a README beginning with an H1, a
  toolkit blockquote, and a contiguous badge row; WHEN the puller computes the head boundary; THEN
  the H1, blockquote, and badge row are skipped and the slice begins at the first non-chrome line
  (the tagline paragraph).
- **No-chrome README passes through** — GIVEN a README whose first non-blank line is already prose
  (no H1/blockquote/badges); WHEN the head boundary is computed; THEN nothing is skipped and the
  slice begins at the top.

## §2 Tail rule — where the site slice ends

Pulling MUST stop before the GitHub-native footer chrome. The slice ends **immediately before the
first occurrence (after the head) of a denylisted section heading**. Matching is on the **heading
text** — case-insensitive, `##` or `###`, independent of position; the first denylisted heading
encountered terminates the slice.

**Final denylist:** `Contributing`, `Development`, `Building`, `License`, `Acknowledgements`.

`Changelog`, `Roadmap`, and `FAQ` are **deliberately NOT denylisted** — they are user-relevant and
belong on the site. A README with no denylisted heading yields a slice running to end-of-file.

### `Install` / `Installation` is INCLUDED (pulled), NOT excluded

A tool's own README install section legitimately carries tool-specific detail the common `shll`
quick-start skips, and that detail belongs on the site. Including it does **not** conflict with
`vn39`: `vn39`'s actual rule is *"site prose MUST NOT reference commands/flags absent from
`help/<tool>.json`"* — not *"Install sections are forbidden."* A pulled install section ships
**verbatim** (the README is canonical); if its commands diverge from `help/<tool>.json`, the §7
**reporter** surfaces a `::warning::` so the tool README can be corrected — the slice is not
withheld (report-only, §7).

**Coexistence model.** The global `getting-started/install` quick-start stays canonical for
"install the whole toolkit"; each tool's pulled Install section is canonical for "install just this
tool + its specifics." Both ship, framed differently — accepted as legitimate (not drift), since
both can be simultaneously correct.

### GIVEN/WHEN/THEN

- **Slice ends at first denylisted heading** — GIVEN a body containing `## Usage`, `## Install`,
  `## Contributing`, `## License`; WHEN the tail boundary is computed; THEN the slice includes
  `## Usage` and `## Install` and ends just before `## Contributing`.
- **Install is kept; Changelog/Roadmap/FAQ are kept** — GIVEN a body with `## Install`,
  `## Changelog`, `## Roadmap`, `## FAQ`; WHEN the tail boundary is computed; THEN none of those four
  terminate the slice.
- **No denylisted heading → slice to EOF** — GIVEN a body with no denylisted heading; WHEN the tail
  boundary is computed; THEN the slice runs to end-of-file.

## §3 Image rule

Screenshots are **referenced by their repo URL — NOT copied** into the shll.ai repo. Alt text is
mandatory and travels inside the markdown (`![alt](url)`); good alt text in the README is therefore
correct on shll.ai automatically (single-source). Freshness is guaranteed by **co-capture**: the
image URL and the surrounding prose are pulled in the **same daily run**, so a repo reorganizing its
images breaks both together and self-heals on the next run.

**Accepted known property:** a ≤24h window where the live site may hotlink a since-moved image (a
transient broken image, never a broken build). Build-time vendoring of images is explicitly
**deferred** — it is a consumer-side option that needs no repo-side change, so it can be added later
without touching this contract.

### GIVEN/WHEN/THEN

- **Images are referenced, alt text travels** — GIVEN a README image `![CLI dashboard](docs/shot.png)`;
  WHEN the slice is pulled; THEN the image reference (with its alt text) travels into the slice
  verbatim, and the image is NOT copied into shll.ai.

## §4 Dark-theme guidance (two parties)

Dark-mode guidance is split by the party responsible for it.

**Producer (tool author).** Prefer **theme-agnostic** screenshots — CLI shots read on any
background and are expected to cover ~90% of cases. For genuine light/dark diagram pairs, use the
standard `<picture><source media="(prefers-color-scheme: …)">` with a fallback `<img>`. Do **NOT**
use the GitHub-proprietary `#gh-dark-mode-only` / `#gh-light-mode-only` URL-fragment trick — it
renders wrong-theme duplicates off GitHub and **WILL be stripped by the puller** (§6).

**Consumer (shll.ai render).** The live site's dark mode is Starlight's `data-theme` toggle, **NOT**
`prefers-color-scheme` (`astro.config.mjs` uses `expressiveCode themes: ['github-dark','github-light']`
plus Starlight's theme attribute). So a pulled `prefers-color-scheme` `<picture>` tracks the **OS**,
not the site toggle — a mismatch on manual flip. The site **accepts OS-tracked images for
theme-agnostic shots**; mapping `<picture>` sources to `data-theme` is a documented consumer-side
**escape hatch, deferred** until a real diagram needs it.

### GIVEN/WHEN/THEN

- **Producer avoids the gh-only trick** — GIVEN a tool author with a light/dark diagram pair; WHEN
  they author it per this contract; THEN they use `<picture><source media=…>` (not `#gh-*-mode-only`),
  because the puller strips the gh-only fragment.

## §5 Mermaid (Option A — strip; require rendered images)

Astro Starlight does **not** render mermaid out of the box (no mermaid/rehype-mermaid dependency in
the live site's `package.json`; Starlight passes ```` ```mermaid ```` fences to the code highlighter,
so they render as syntax-highlighted *text*, not diagrams). Rather than add a heavyweight build-time
browser dependency (`rehype-mermaid` + Playwright — Constitution VI tension) or ship client-side
mermaid JS (Constitution I violation), this contract **MANDATES**:

- Diagrams destined for shll.ai MUST be committed as **rendered images** (SVG preferred, for
  dark-theme control).
- Inline ```` ```mermaid ```` fences are **NOT rendered** on shll.ai and **WILL be stripped on
  pull** (§6).

Tools keep mermaid in their README for GitHub's native rendering if they wish; they additionally
commit a rendered SVG for the site. (GitHub Actions can render mermaid→SVG trivially.)

### GIVEN/WHEN/THEN

- **Inline mermaid is stripped; rendered image survives** — GIVEN a README section with a
  ```` ```mermaid ```` fence followed by a committed `![architecture](docs/arch.svg)`; WHEN the slice
  is pulled; THEN the mermaid fence is stripped and the rendered-image reference is preserved.

## §6 What the puller strips on pull

After computing the head (§1) and tail (§2) boundaries, the puller applies these strips to the
slice, in addition to the boundary cuts:

1. **Mermaid fences** (§5): every ```` ```mermaid ```` … ```` ``` ```` block is removed. Non-mermaid
   fenced code blocks are left intact.
2. **GitHub theme-only images** (§4): any image whose URL carries `#gh-dark-mode-only` or
   `#gh-light-mode-only` is removed. Plain images (no theme fragment) are preserved.

These strips are pure text transforms with no per-tool special-casing.

### GIVEN/WHEN/THEN

- **Strips are mechanical and total** — GIVEN any pulled slice; WHEN the strips run; THEN mermaid
  fences and `#gh-*-mode-only` images are removed while ordinary prose, code fences, and plain images
  survive, and the transform never errors.

## §7 Divergence reporter — the `vn39` integration, REPORT-ONLY (change `4s3e`)

Pulled README prose WILL contain command/flag examples. The `vn39` binding rule
polices **hand-written** site prose: **"site prose MUST NOT reference commands/flags absent from
`help/<tool>.json`."** For the **canonical, mechanically-synced README slice**, that cross-check is
applied as a **non-fatal reporter, not a publish gate**.

**The README is canonical and rendered verbatim; divergence is a repo-level lint, never a publish
gate.** A blocking gate would contradict the architecture's foundation (the tool repo's README is
canonical — constraint #2): rejecting the canonical source when it diverges from `help-dump` makes
`help-dump` the de-facto authority and silently withholds the very thing the site projects. So when a
tool's pulled slice (including its Install section) references a command path or flag **absent from
`help/<tool>.json`**, the reporter emits a `::warning::` (a repo-level lint surfaced in the CI run
log) and **the canonical slice is still committed and rendered**. The fix belongs in the **tool's
README**, never a silent exclusion on the shll.ai side — *you do not protect a system from its own
source of truth; you fix the source of truth.* The detection of `shll shell-install`-style fabricated
commands is retained as a useful drift signal; only the consequence changed (warn, don't withhold).

**Accepted tradeoff.** A genuinely fabricated command can appear on shll.ai for up to one refresh
cycle (≤24h) until the tool README is corrected — the precise harm `vn39` guarded against, now
consciously accepted in favor of canonical-source consistency and full tool coverage. The reporter is
**not** an install-accuracy *guard* (it no longer blocks); it is an install-accuracy *reporter*.

**Two consumers, do not conflate.** The `vn39` rule remains a **hard rule for hand-written site
prose** (which MUST NOT cite absent commands). It is **report-only** ONLY for the canonical pulled
README slice.

The reporter is implemented as a **pure, single-sourced verifier** shared by the extraction module's
unit test and the workflow — `findUnknownTokens(slice, helpDoc)` in
[`src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts) — so
the tested detection and the CI detection cannot drift. The detector's logic is **unchanged**;
`extract-readme-cli.mjs` consumes a non-empty result as a `::warning::` + exit 0 (writes the slice),
not exit 1. (False-positive tuning of the detector — Cobra `completion`/`help`, the `h ou<TAB>`
completion-demo idiom, per-subcommand flag scoping — is a separate follow-up; a noisy-but-non-fatal
warning is tolerable until tuned.) Command/flag truth comes from the same `help/<tool>.json` tree
(command **paths**) and the build-time `parseHelp` decomposition (**flags**) the command reference
already trusts.

### GIVEN/WHEN/THEN

- **A fabricated command WARNS but still commits** — GIVEN a pulled `shll` slice whose Install
  section references `shll shell-install` (absent from `help/shll.json`); WHEN the reporter
  cross-checks the slice; THEN a `::warning::` naming `shll shell-install` is emitted, the slice is
  STILL written to `content/shll/README.md`, and the CLI exits 0.
- **A clean slice is silent** — GIVEN a slice whose every command path and flag exists in
  `help/<tool>.json`; WHEN the reporter runs; THEN no warning is emitted and the slice is committed.
- **Missing `help/<tool>.json` → unverified warning, still commit** — GIVEN a slug with no
  `help/<tool>.json` (e.g. `tu`); WHEN the CLI runs against a readable README; THEN an "unverified"
  `::warning::` is emitted, the canonical slice is STILL written, and the CLI exits 0.

## §8 Pull model — the consumer (sibling of the help refresh)

shll.ai pulls README slices via a scheduled refresh job, a **sibling** of
[`scheduled-help-refresh.yml`](../../.github/workflows/scheduled-help-refresh.yml) — kept distinct
because it is a different data kind (markdown slices, not the JSON command tree) with a different
verifier (§7 command/flag cross-check, a report-only reporter — not Zod-schema validation).

- **Triggers:** a daily `schedule` cron + `workflow_dispatch` (on-demand after a README change).
- **Per-tool pipeline** (looped over all 7 tools): fetch the repo's `README.md` → apply §1 head +
  §2 tail deduction → §6 strips → §7 divergence reporter (non-fatal) → **always commit** the slice to
  `content/<slug>/README.md` (a divergence emits a `::warning::` but is committed; a missing
  `help/<slug>.json` commits with an "unverified" warning). (The `docs/site/*.md` source of §9 is
  reserved/future and is **not** part of this pipeline today — only `README.md` is fetched and rendered.)
- **Repo-root data location:** the extracted slice is committed to a `content/<slug>/` directory at
  the **repo root** (sibling to `help/`, `sites/`, `fab/`, `docs/`). Same rationale as `help/`:
  project-level data that **survives a live-site swap** (Constitution II + III), kept distinct from
  `help/` so README data and help data do not overload one directory.
- **Direct commit to `main`, always (warn-not-skip on divergence)**, off the deploy path, with
  **per-tool _fetch-failure_ isolation** (a tool whose README genuinely cannot be fetched/read keeps
  its last-good slice; others proceed) — mirroring the help-refresh job's isolation, but note the
  isolation now applies ONLY to fetch/read failures, NOT to divergence (which always commits with a
  warning). When it commits to `main`, the **existing** `deploy.yml` ships the change
  (Constitution IV); no deploy trigger is added here. A flaky **fetch** therefore breaks the REFRESH
  for that tool (not the deploy — the site keeps the last-good slice); a **divergence** does not break
  anything, it commits + warns.
- **Render side:** a build-time Starlight component
  ([`ReadmeSlice.astro`](../../sites/astro-starlight-terminal1/src/components/ReadmeSlice.astro))
  reads `content/<slug>/README.md` via the ascend-to-root `import.meta.url` `fs` read (the pattern
  proven by `CommandReference.astro` — NOT a fixed depth, NOT `process.cwd()`, NOT `import.meta.glob`),
  renders the markdown to static HTML at build time via `@astrojs/markdown-remark` — a build-time
  dependency already pulled transitively by `astro` core + `@astrojs/starlight`, declared explicitly
  in the site `package.json` (pinned to the version astro core uses) so the bare import resolves under
  strict pnpm; this makes an existing dep importable, adding no new runtime dependency and no new
  transitive weight (Constitution VI). The component renders on a **parallel per-tool `readme` page**
  (`src/content/docs/tools/<slug>/readme.mdx`, slug `/tools/<slug>/readme`, sidebar label "Readme") —
  a sibling of the generated `commands` page — **NOT** injected into `overview.mdx`. Each tool's
  `overview.mdx` is a thin directory entry (GithubButton + 1–2 sentence framing + nav links to the
  readme / commands / install / workflows pages); the canonical depth lives on the readme page.
  Missing slice → neutral placeholder (build succeeds); present-but-unreadable slice → build fails (a
  committed defect must not deploy).

### GIVEN/WHEN/THEN

- **Slice committed to the repo-root collector, off the deploy path** — GIVEN the scheduled
  readme-refresh on its daily cron; WHEN it pulls a fetchable `run-kit` README (divergent or clean);
  THEN `content/run-kit/README.md` is direct-committed to `main` (a divergence carries a
  `::warning::`), and the existing `deploy.yml` ships it — no deploy logic lives in the refresh job.
- **Fetch-failure isolation (divergence is NOT a failure)** — GIVEN one tool whose README genuinely
  cannot be fetched; WHEN the run proceeds; THEN that tool keeps its last-good
  `content/<slug>/README.md` and the others still refresh. A tool whose README merely *diverges* is
  NOT isolated — its canonical slice is committed with a `::warning::`.
- **Rendered on the parallel readme page** — GIVEN a committed `content/<slug>/README.md`; WHEN the
  site builds; THEN `ReadmeSlice` renders it on `/tools/<slug>/readme`, while the tool's `overview`
  page stays a thin directory entry that links to it.

## §9 The `docs/site/` escape hatch — RESERVED / NOT YET IMPLEMENTED

> **Status: reserved future extension.** The pull + render path shipped in change `w32m` handles
> **only** the README slice (`README.md` → `content/<slug>/README.md`). The workflow
> (`scheduled-readme-refresh.yml`), the CLI (`extract-readme-cli.mjs`), and the renderer
> (`ReadmeSlice.astro`) have **no `docs/site/` fetch or render path**. This section records the
> *intended* design so a later change can implement it without re-litigating the model — it does
> **not** describe current behavior.

The README slice is the **default** (and, today, the only) source. The reserved extension: for
site-only additions that should NOT live in the README, a tool repo MAY add `docs/site/*.md`, which
a future puller would also pull and render. Maintainer/design notes that must **never** reach the
site go in `docs/internal/` (NOT `docs/specs/` — that name collides with fab's existing meaning of
pre-implementation design intent).

The intended organizing axis is **audience** — user-facing (README slice + the future `docs/site/`),
GitHub-native (footer chrome, denylisted sections), maintainer-facing (`docs/internal/`) — **not**
"wanted vs. unwanted."

### GIVEN/WHEN/THEN

- **Audience axis, not a wanted/unwanted axis (intended model)** — GIVEN a tool author with a
  site-only note and a maintainer-only note; WHEN `docs/site/` ingestion is eventually implemented;
  THEN the site-only note would go in `docs/site/*.md` (pulled) and the maintainer note in
  `docs/internal/` (never pulled), and `docs/specs/` is avoided to not collide with fab's meaning.
  Until then, only the README slice is pulled.

## §Extraction reference

The single **machine-anchored** definition of the deduction + strip + verify behavior is:

> [`sites/astro-starlight-terminal1/src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts)
> — `extractReadme(markdown)` (§1 head + §2 tail + §6 strips) and `findUnknownTokens(slice, helpDoc)`
> (§7 divergence reporter — detection logic; consumed as a non-fatal `::warning::` by
> `extract-readme-cli.mjs`), pinned by `scripts/extract-readme.test.mjs` (native `node --test`).

- `extract-readme.ts` is the **authority for the mechanical behavior**. The prose above MUST agree
  with it; on any discrepancy the prose is reconciled to match the code (the code is what the workflow
  and the component actually run).
- It is **pure and dependency-free** (Constitution VI) and runs at **build time** (Constitution I) —
  the same shape `parse-help.ts` established for the command reference (`qemq`).

### GIVEN/WHEN/THEN

- **Code is the single anchor for the mechanics** — GIVEN a discrepancy between this prose and
  `extract-readme.ts`; WHEN resolving which is authoritative for the mechanical deduction; THEN
  `extract-readme.ts` is the anchor and the prose is reconciled to it.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-04 | Created (change `w32m`): forward contract for README extraction. §1 head rule (skip H1 + toolkit blockquote + contiguous badge/image lines), §2 tail rule (final denylist `Contributing`/`Development`/`Building`/`License`/`Acknowledgements`; `Install` INCLUDED; `Changelog`/`Roadmap`/`FAQ` kept), §3 image rule (reference-not-copy, alt-text-travels, co-capture, ≤24h transient-404 accepted, vendoring deferred), §4 dark-theme producer/consumer stanzas (`data-theme` not `prefers-color-scheme`; `<picture>` mapping deferred), §5 mermaid Option A (strip inline, require rendered SVG), §6 strips (mermaid fences + `#gh-*-mode-only` images), §7 the `vn39` validation gate (sole install guard; `shll shell-install` failure mode; single-sourced `findUnknownTokens` verifier), §8 pull model (sibling of `scheduled-help-refresh.yml`, `content/<slug>/` repo-root collector, direct-commit-gated-on-validation, off-deploy, per-tool isolation, `ReadmeSlice.astro` build-time render injected into overviews), §9 `docs/site/` escape hatch (audience axis) marked RESERVED / not yet implemented — only `README.md` is pulled today. §Extraction reference anchors `src/lib/extract-readme.ts`. Symmetric with `help-dump-contract.md`. |
| 2026-06-04 | Reframed (change `4s3e`): the §7 `vn39` cross-check flips from a **blocking publish gate** to a **non-fatal divergence reporter** — the tool README is canonical and rendered verbatim; divergence emits a CI `::warning::` and the slice is still committed (`extract-readme-cli.mjs` → warn + write + exit 0, not exit 1; missing `help/<slug>.json` → "unverified" warning + still write). The `vn39` rule stays a hard rule only for *hand-written* site prose. §8 pull model: **always commit, warn-not-skip** on divergence; per-tool isolation now applies ONLY to genuine fetch/read failures (which keep last-good), not to divergence. Install language (§2/§7): the reporter is an accuracy *reporter*, not the *sole guard*. Render model: the slice now renders on a **parallel per-tool `readme` page** (`/tools/<slug>/readme`, sidebar "Readme", sibling of `commands`), NOT injected into `overview.mdx`; each `overview.mdx` is thinned to a directory entry (GithubButton + framing + nav links). `findUnknownTokens` detection logic is unchanged; false-positive tuning deferred to a follow-up. Anti-drift intro reconciled. |
