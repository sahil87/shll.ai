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

## §3 Image rule — all images absolute, everywhere

> **Refined by change `x0br`.** The original §3 ("reference, don't copy") is now stated as its
> logical conclusion: **every** image reference — in `README.md` AND in `docs/site/**` — MUST be an
> **absolute** URL (`https://…`, e.g. `raw.githubusercontent.com/…`). shll.ai vendors **zero** image
> binaries. A relative image path is a closure violation (warned by the §closure lint), not a copy
> instruction.

Screenshots are **referenced by their absolute repo URL — NOT copied** into the shll.ai repo. Alt
text is mandatory and travels inside the markdown (`![alt](url)`); good alt text in the README is
therefore correct on shll.ai automatically (single-source). Freshness is guaranteed by **co-capture**:
the image URL and the surrounding prose are pulled in the **same daily run**, so a repo reorganizing
its images breaks both together and self-heals on the next run.

**Why all-absolute (not just README).** Making every image absolute means the move from GitHub to
shll.ai can never break an image link (there is no relative path to re-anchor), the §closure lint
only has to police markdown *links* (not images), and one uniform rule covers both sources. This
extends the original §3 "reference, don't copy" stance to its conclusion and removes vendoring from
the consumer's responsibilities entirely.

**Accepted known property:** a ≤24h window where the live site may hotlink a since-moved image (a
transient broken image, never a broken build). Build-time vendoring of images is explicitly
**deferred** — it is a consumer-side option that needs no repo-side change, so it can be added later
without touching this contract.

### GIVEN/WHEN/THEN

- **Images are referenced absolutely, alt text travels** — GIVEN a README or `docs/site/` image
  `![CLI dashboard](https://raw.githubusercontent.com/sahil87/idea/main/docs/shot.png)`; WHEN the
  slice/tree is pulled; THEN the image reference (with its alt text) travels into the slice verbatim,
  and the image is NOT copied into shll.ai.
- **A relative image is a closure violation** — GIVEN a `docs/site/` page with a relative image
  `![diagram](./arch.png)`; WHEN the §closure lint runs; THEN it emits a `::warning::` naming the
  file + image (images MUST be absolute), and the page is still committed (report-only).

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
  `help/<slug>.json` commits with an "unverified" warning).
- **Per-tool `docs/site/` tree pipeline** (sibling step, change `x0br`): in the same run, fetch the
  repo **tarball** (`https://codeload.github.com/sahil87/<repo>/tar.gz/<branch>`, main→master fallback)
  and untar **only** the `docs/site/` subtree → run the §closure lint per page (non-fatal `::warning::`
  on a relative-link escape or a relative image — never withholds) → copy each page **verbatim** to
  `content/<slug>/site/<path>.md`, preserving the subtree shape. A repo tarball is one request per
  tool (no contents-API N+1, no rate limit, no token). A tool with no `docs/site/` tree is a clean
  no-op (last-good preserved); per-tool fetch/IO-failure isolation matches the README step.
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
- **`docs/site/` render side** (change `x0br`): a single Astro **dynamic route**
  ([`src/pages/tools/[slug]/[...path].astro`](../../sites/astro-starlight-terminal1/src/pages/tools/%5Bslug%5D/%5B...path%5D.astro))
  walks the committed `content/<slug>/site/**` tree at build time via `getStaticPaths` and renders
  **one page per file** at URL `/tools/<slug>/<path>` (the `docs/site/`/`site/` prefix stripped, the
  subtree shape preserved) — e.g. `content/idea/site/advanced/hooks.md` → `/tools/idea/advanced/hooks`.
  Each page is its **own page**, a sibling of `overview`/`readme`/`commands`. It reuses the SAME
  build-time `@astrojs/markdown-remark` `createMarkdownProcessor` + repo-root cross-boundary read as
  `ReadmeSlice.astro`, applies the §link-resolution site-absolute transform (passing the page's slug +
  mount path so relative targets resolve to `/tools/<slug>/<resolved>`), and is wrapped in
  Starlight's `<StarlightPage>` so it inherits the sidebar, prose styles, and dark-mode parity
  (Constitution I/V/VI: build-time, no client JS, no new dependency). This is the FIRST dynamic route
  in the codebase (all other pages are static MDX stubs) — accepted, as it is the only approach that
  renders a variable, author-controlled page set with no per-page maintenance. **Reserved-slug
  precedence:** a `docs/site/` page MUST NOT be named after a tool's reserved static slug
  (`overview`, `readme`, `commands`, `install`, `workflows`) — those slugs are owned by the
  hand-authored per-tool pages. The dynamic route is higher-priority than Starlight's `[...slug]`
  catch-all, so a collision would shadow the static page (a benign build `[WARN]`); the producer
  avoids it by not reusing a reserved name. Missing tree → no pages emitted, build succeeds
  (degrades cleanly, same discipline as a missing README slice).
- **`docs/site/` sidebar** (change `x0br`): the Starlight sidebar is hand-authored per tool (explicit
  `items:` arrays, NOT `autogenerate`). A build-time helper
  ([`src/lib/docs-site-sidebar.mjs`](../../sites/astro-starlight-terminal1/src/lib/docs-site-sidebar.mjs))
  walks `content/<slug>/site/**` at config-evaluation time and produces a flat list of `{ label, link }`
  entries (label = the page's first H1, link = `/tools/<slug>/<path>`), which `astro.config.mjs`
  **appends** to each tool's hand-authored `items:` array. So the variable docs/site pages appear in
  the sidebar automatically with zero per-page maintenance, beneath the hand-authored
  Overview/Readme/Commands entries; a tool with no tree gets no extra entries.

### GIVEN/WHEN/THEN

- **`docs/site/` tree rendered as separate pages** — GIVEN committed `content/idea/site/install.md`
  and `content/idea/site/advanced/hooks.md`; WHEN the site builds; THEN pages exist at
  `/tools/idea/install` and `/tools/idea/advanced/hooks`, each rendered build-time as static HTML
  inside the Starlight layout, and both appear in the `idea` sidebar group.
- **Missing `docs/site/` tree degrades cleanly** — GIVEN a tool with no committed
  `content/<slug>/site/` tree; WHEN the site builds; THEN no docs/site pages are emitted for it, no
  sidebar entries are added, and the build succeeds.
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

## §9 The `docs/site/` documentation tree — ACTIVE (closed-set model, change `x0br`)

> **Status: implemented.** Activated by change `x0br`. The pull + render path now handles, in
> addition to the README slice, each tool's `docs/site/**/*.md` **documentation tree** — a handful
> of (possibly nested) markdown pages a README links into for depth (install guides, deep-dives,
> format contracts). The workflow fetches the tree (§8 tarball step), the CLI mounts + lints it
> (§closure lint), and a dynamic route renders one page per file (§8 render side). The model below is
> a **closed set**: shll.ai conforms by closure + two tiny link transforms, and the producer repos
> conform per-repo over time (out of scope here — see the out-of-scope boundary).

The README slice remains the **default** source. The `docs/site/` tree is for site-relevant depth
that does NOT belong inline in the README. Maintainer/design notes that must **never** reach the site
go in `docs/internal/` (NOT `docs/specs/` — that name collides with fab's existing meaning of
pre-implementation design intent). The organizing axis is **audience** — user-facing (README slice +
`docs/site/`), GitHub-native (footer chrome, denylisted sections), maintainer-facing
(`docs/internal/`) — **not** "wanted vs. unwanted."

**Mount.** `content/<slug>/site/<path>.md` → URL `/tools/<slug>/<path>` (the `docs/site/` prefix
collapses to the `site/` collector, and `site/` is stripped from the URL; the subtree shape is
preserved). Each file is its own page:

```
docs/site/install.md          → /tools/<slug>/install
docs/site/advanced/hooks.md   → /tools/<slug>/advanced/hooks
```

### §9.1 Closed-set producer contract — the four rules

A tool repo's `docs/site/` tree conforms to these four rules (each repo adopts them in its own later,
per-repo change — out of scope for the change that publishes this contract):

1. **Closure.** `docs/site/` is a **fully self-contained set**: every *relative* link and image inside
   any `docs/site/**/*.md` file MUST resolve to a path **inside** `docs/site/`. No `..` segment may
   escape `docs/site/`.
2. **External links absolute-by-author.** A link (in a README or a `docs/site/` page) to anything
   *outside* the copied set — source files, `docs/specs/`, the tool's other internals — MUST be
   written as an absolute `https://…` URL **by the author**. The author makes the "does this link
   leave the site?" decision explicitly, by hand. This is what lets the consumer be two context-free
   transforms instead of a link classifier.
3. **All images absolute, everywhere** (see §3). Every image in `README.md` and `docs/site/**` MUST be
   absolute; shll.ai vendors zero binaries; a relative image is a closure violation (§closure lint).
4. **README → `docs/site/` links written naturally.** A README link *into* a `docs/site/` page is
   written as the natural repo-relative path `docs/site/<path>.md`; shll.ai rewrites it on render to
   the **site-absolute** path `/tools/<slug>/<path>` (§link resolution).

**Why a closed set (not a machine link-classifier).** An earlier design classified every link at copy
time (rewrite to a GitHub `blob` URL vs. a site slug) using a copied-set manifest. The closed-set rule
**eliminates** the classifier: the author declares site-internal vs. external by writing external
links absolute, and closure guarantees every *relative* link is intra-set, leaving the consumer with
two context-free transforms. Fewer moving parts, no manifest, and the invariant (`docs/site/` is
self-contained) is **lintable** (§closure lint).

### §9.2 Reserved-slug precedence

A `docs/site/` page path MUST NOT collide with a tool's reserved static slugs — `overview`, `readme`,
`commands`, `install`, `workflows` — which are owned by the hand-authored per-tool pages. The dynamic
route is higher-priority than Starlight's `[...slug]` catch-all, so a collision would *shadow* the
static page (a benign build `[WARN]`). The producer avoids it by not reusing a reserved name; the
constraint is recorded so a future conforming repo does not trip it.

**Report-only enforcement.** The docs/site CLI
([`extract-docs-site-cli.mjs`](../../sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs))
checks each page's top mount segment against this reserved set and emits a CI `::warning::` naming the
offending page when one collides — and the page is **still committed** (same report-only posture as the
§closure lint and the §7 divergence reporter; canonical wins, never withhold). So a reserved-slug
collision is visible in the run log without blocking the pull.

### GIVEN/WHEN/THEN

- **Audience axis, not a wanted/unwanted axis** — GIVEN a tool author with a site-only note and a
  maintainer-only note; WHEN they organize their repo; THEN the site-only note goes in `docs/site/*.md`
  (pulled + rendered) and the maintainer note in `docs/internal/` (never pulled), and `docs/specs/` is
  avoided to not collide with fab's meaning.
- **Closure makes the consumer trivial** — GIVEN a `docs/site/` tree that obeys closure + absolute
  external links; WHEN shll.ai pulls it; THEN every relative link is known-intra-set, so the consumer
  needs only the two §link-resolution transforms — no link classifier, no copied-set manifest.

## §link resolution — the consumer's entire rewrite surface (two transforms, change `x0br`)

Two transforms, applied to **link/image URL targets only** — never to prose or code that merely
mentions the literal text, and never to absolute URLs. Both live as pure, exported, tested functions
in [`extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts) (same
single-machine-anchor discipline as `extractReadme`/`findUnknownTokens`).

**The target is rewritten to a SITE-ABSOLUTE path `/tools/<slug>/<resolved-path>`** (reworked by the
`x0br` review). The earlier design rewrote to RELATIVE forms (README `docs/site/<p>.md` → `./<p>`;
docs/site pages → a bare `.md`-strip). That is **wrong** under the site's serving model: each page is
served as a **trailing-slash directory** (`/tools/<slug>/<path>/`, i.e. `<path>/index.html`), and
Starlight's own sibling links are absolute *with* a trailing slash (e.g. `/tools/idea/install/`). A
relative target therefore resolves **one segment too deep** — the README page is served at
`/tools/idea/readme/`, so `./install` resolves to `/tools/idea/readme/install` while the target page
lives at `/tools/idea/install/` (broken); a docs/site page at `/tools/idea/advanced/hooks/` linking a
sibling `./other` resolves to `/tools/idea/advanced/hooks/other` (broken). A site-absolute target is
**serving-model-proof** (immune to `trailingSlash`) and matches Starlight's own absolute links.
Because the resolved URL embeds the slug — and, for docs/site pages, resolves `.`/`..` against the
page's own mount path — both transforms are **slug-aware** (and the docs/site transform is
mount-path-aware). They are no longer slug-agnostic string transforms; that is accepted and intended.

1. **`docs/site/` pages (intra-set links)** — `rewriteDocsSiteLinks(markdown, slug, mountPath)`:
   resolve each **relative** link/image target against the page's OWN directory within the docs/site
   tree (`mountPath` is the page's path under `site/`, no `.md`, e.g. `advanced/hooks`), normalize
   `.`/`..`, strip `.md`, and emit the site-absolute mount URL `/tools/<slug>/<resolved>`. Closure
   (§9.1.1) guarantees relative targets are intra-set. Examples: page `advanced/hooks` linking
   `../install.md` → `/tools/<slug>/install`; linking `./sibling.md` → `/tools/<slug>/advanced/sibling`.
   Applied at render time by the dynamic route (the committed slice stays a verbatim copy of canonical).
2. **README slice (links into `docs/site/`)** — `rewriteReadmeDocsSiteLinks(markdown, slug)`: a relative
   target of the form `docs/site/<p>.md` → the site-absolute mount URL `/tools/<slug>/<p>` (the
   `docs/site/` prefix maps to the tool root `/tools/<slug>/`, `.md` stripped, nested `<p>` subtree
   preserved). Examples: `[guide](docs/site/install.md)` → `[guide](/tools/<slug>/install)`;
   `docs/site/advanced/hooks.md` → `/tools/<slug>/advanced/hooks`. Relative targets NOT under
   `docs/site/` are left untouched (the README's own relative links into non-docs/site files are out of
   scope and self-heal via the absolute-by-author producer rule, §9.1.2).

### The rewrite guard (critical correctness boundary)

Both transforms operate **only** on link/image URL targets — the `(...)` of markdown `[text](target)`
and `![alt](target)`, and `href`/`src` in raw HTML — and (for the README) match `docs/site/` **only as
a path-prefix of a RELATIVE target**. They MUST NOT touch:

- absolute URLs containing the literal substring (e.g.
  `https://github.com/sahil87/idea/blob/main/docs/site/x.md` stays verbatim),
- prose or fenced code that mentions the text `docs/site`,
- the `.md` of anything that is not a relative link target (a `.md` in link TEXT survives).

This is "rewrite the relative-link target," **not** a blind string replace. A `#fragment` / `?query`
suffix on a relative target is preserved verbatim (the rewrite applies to the path part only).

### Known limitations

Two link shapes are **not** rewritten by the current transforms (honestly recorded; the canonical page
still commits + renders, and these are rare in practice — fixing them robustly requires nested-bracket
parsing that risks the guard's precision, so it is deferred, not scoped here):

- **(a) The OUTER target of a linked image** `[![alt](img)](page.md)` is unhandled — the scanner matches
  the inner image (whose target is an absolute image URL per §3, so untouched) but not the outer link's
  `(page.md)`. A docs/site page linked behind a badge keeps its raw relative target. (Plain links and
  plain images are fully handled.)
- **(b) Reference-style link definitions** `[id]: ./x.md` are unhandled — the scanner only sees inline
  `(...)` targets and `href`/`src`, not the `[id]: target` definition line. A reference-style link into
  `docs/site/` is not rewritten.

### GIVEN/WHEN/THEN

- **docs/site intra-set link site-absolute** — GIVEN a `docs/site/` page `advanced/hooks` with
  `[i](../install.md)`; WHEN `rewriteDocsSiteLinks(md, 'idea', 'advanced/hooks')` runs; THEN the target
  becomes `/tools/idea/install` while absolute URLs, prose, and code are untouched.
- **README `docs/site/` link site-absolute** — GIVEN a README slice with `[guide](docs/site/install.md)`;
  WHEN `rewriteReadmeDocsSiteLinks(md, 'idea')` runs; THEN the target becomes `/tools/idea/install`, and a
  nested `docs/site/advanced/hooks.md` becomes `/tools/idea/advanced/hooks`.
- **Rewrite guard holds** — GIVEN a page with an absolute URL containing `docs/site`, prose mentioning
  `docs/site`, and a relative `[x](docs/site/x.md)`; WHEN either transform runs; THEN only the relative
  link target is rewritten; the absolute URL, prose, and any code mention stay verbatim.

## §closure lint — report-only conformance check (change `x0br`)

The puller lints each `docs/site/` page for closure conformance. Any **relative** link/image whose
resolved path climbs **out** of `docs/site/` (a `..` escape), or any **relative image** (images MUST
be absolute, §3), emits a CI `::warning::` naming the offending file + target — and the page is
**still committed** (canonical wins; never withhold). This mirrors the §7 divergence reporter exactly:
a report-only repo-level lint, **not** a publish gate. It turns "self-contained" from a hope into a
checked invariant and tells the tool author precisely which link broke the rule.

It is implemented as a pure, single-sourced detector,
`findClosureViolations(relPath, markdown)` in
[`extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts), shared by the
unit test and the CLI ([`extract-docs-site-cli.mjs`](../../sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs)),
so the tested detection and the CI detection cannot drift. The detector returns each violation with a
`kind` (`escape` | `relative-image`); the CLI consumes a non-empty result as a `::warning::` + exit 0
(writes the page), never exit 1.

### GIVEN/WHEN/THEN

- **A closure-escaping link WARNS but still commits** — GIVEN a `docs/site/install.md` with a relative
  link `[x](../../secret.md)` that resolves above `docs/site/`; WHEN the lint runs; THEN a `::warning::`
  naming the file + link is emitted, the page is STILL committed to `content/<slug>/site/install.md`,
  and the CLI exits 0.
- **A relative image WARNS but still commits** — GIVEN a `docs/site/` page with `![y](./diagram.png)`;
  WHEN the lint runs; THEN a `::warning::` naming the relative image is emitted (images must be
  absolute, §3), and the page is still committed.
- **An intra-set link and an absolute link are clean** — GIVEN a relative `[z](./other.md)` (resolving
  inside `docs/site/`) and an absolute `[a](https://x/y)`; WHEN the lint runs; THEN neither is reported.

## §Extraction reference

The single **machine-anchored** definition of the deduction + strip + verify behavior is:

> [`sites/astro-starlight-terminal1/src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts)
> — `extractReadme(markdown)` (§1 head + §2 tail + §6 strips), `findUnknownTokens(slice, helpDoc)`
> (§7 divergence reporter — detection logic; consumed as a non-fatal `::warning::` by
> `extract-readme-cli.mjs`), and the §9 `docs/site/` consumer functions (SITE-ABSOLUTE,
> slug-aware): `rewriteDocsSiteLinks(markdown, slug, mountPath)` (resolves a docs/site page's relative
> targets against its mount path → `/tools/<slug>/<resolved>`) / `rewriteReadmeDocsSiteLinks(markdown, slug)`
> (a README's `docs/site/<p>.md` → `/tools/<slug>/<p>`) — the two transforms + the shared rewrite guard
> — and `findClosureViolations(relPath, markdown)` (§closure lint — detection logic; consumed as a
> non-fatal `::warning::` by `extract-docs-site-cli.mjs`), all pinned by
> `scripts/extract-readme.test.mjs` (native `node --test`).

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
| 2026-06-07 | Activated `docs/site/` (change `x0br`): §9 flips RESERVED → **ACTIVE** as a **closed-set** model — §9.1 publishes the four producer rules (closure: `docs/site/` is fully self-contained, no `..` escape; external links absolute-by-author; all images absolute everywhere; README→`docs/site/` links written naturally); §9.2 records the reserved-slug precedence (`overview`/`readme`/`commands`/`install`/`workflows`). New **§link resolution**: the consumer's entire rewrite surface is two pure context-free transforms on relative link/image targets only — `rewriteDocsSiteLinks` (`.md`-strip) for docs/site pages, `rewriteReadmeDocsSiteLinks` (`docs/site/`→`./` prefix + `.md`-strip) for the README slice — plus the **rewrite guard** (never touch absolute URLs / prose / code; relative-prefix only; suffix preserved). New **§closure lint**: report-only `findClosureViolations` emits a `::warning::` on a `..`-escape or relative image and STILL commits (mirrors §7). §3 refined: **all images absolute everywhere** (README + `docs/site/`); shll.ai vendors zero binaries; a relative image is a closure violation. §8 extended: a sibling **tarball** fetch (`codeload.github.com/.../tar.gz/<branch>`, untar `docs/site/` subtree, main→master fallback) + multi-page render via the FIRST **dynamic route** (`src/pages/tools/[slug]/[...path].astro`, `getStaticPaths` over `content/<slug>/site/**`, one page per file at `/tools/<slug>/<path>`, rendered through the same `@astrojs/markdown-remark` path as `ReadmeSlice` inside Starlight's `<StarlightPage>`) + a build-time-generated **sidebar** group appended per tool. New consumer functions anchored in §Extraction reference; pinned by `scripts/extract-readme.test.mjs`. Conforming the 7 external repos remains out of scope (forward, per-repo). |
| 2026-06-07 | Reworked (`x0br` review): link resolution switched from relative-prefix rewrites to **SITE-ABSOLUTE** `/tools/<slug>/<path>` to be correct under trailing-slash directory serving (the relative form resolved one segment too deep — a README at `/tools/<slug>/readme/` + `./install` → `/tools/<slug>/readme/install`, but the page is at `/tools/<slug>/install/`). The two transforms are now **slug-aware**: `rewriteDocsSiteLinks(md, slug, mountPath)` resolves a page's relative targets against its mount path (`.`/`..` normalized) → `/tools/<slug>/<resolved>`; `rewriteReadmeDocsSiteLinks(md, slug)` maps `docs/site/<p>.md` → `/tools/<slug>/<p>`. Both consumers re-wired (`ReadmeSlice.astro` passes its `tool`; the dynamic route passes `slug` + `mountPath`). `#fragment`/`?query` preserved. A reserved-slug `::warning::` was added to the docs/site CLI (§9.2). Two honest **Known limitations** recorded under §link resolution: the OUTER target of a linked image `[![alt](img)](page.md)` and reference-style link definitions `[id]: ./x.md` are not rewritten (rare; deferred). |
