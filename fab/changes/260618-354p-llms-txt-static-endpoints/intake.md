# Intake: Build-time /llms.txt and /llms-full.txt agent-discoverability endpoints

**Change**: 260618-354p-llms-txt-static-endpoints
**Created**: 2026-06-18

## Origin

> Backlog `[354p]` (2026-06-18, from the SEO/agent-discoverability discussion): "Generate /llms.txt
> and /llms-full.txt as build-time static files on the live site (sites/astro-starlight-terminal1)
> so the toolkit is discoverable by coding agents — the agent-facing sibling of the kb1r SEO layer
> (see docs/memory/conventions/seo-social-meta.md). MUST be mechanically generated from existing
> content, never hand-authored (Constitution III/VI)."

One-shot invocation via `/fab-new 354p`. The backlog item is exceptionally prescriptive — it names
the exact files to add, the format, the data sources, the rejected alternatives, and explicitly flags
**one** open implementer call (the `llms-full.txt` content boundary). No prior `/fab-discuss` session
in this conversation; all context comes from the backlog body and a codebase verification pass done
during intake. Backlog #1 of a 3-item sequence (`354p` → `pgox` JSON-LD → `bees` editorial); this is
the most mechanical and sequenced first.

**Codebase verification done at intake** (claims in the backlog checked against the live site):
- `astro.config.mjs` carries `site: 'https://shll.ai'` (line 8) — the single origin source, confirmed.
- Exactly **7** tools have `help/<tool>.json` at the repo root: `fab-kit`, `hop`, `idea`, `run-kit`,
  `shll`, `tu`, `wt`.
- `src/pages/` currently holds only `tools/[slug]/[...path].astro` (the dynamic docs/site route) —
  no `*.txt.ts` endpoint exists yet.
- README slices are **already deduced and committed** at `<repo-root>/content/<tool>/README.md` by the
  daily puller — see correction in Affected Memory / Assumption #4 below.

## Why

1. **Problem.** The shll.ai site is rendered for humans (HTML pages, terminal aesthetic, link previews).
   Coding agents that discover the toolkit have no machine-friendly, single-fetch entry point describing
   what the 7 tools are and where their docs live. The `kb1r` SEO layer made the site legible to *search
   crawlers and social scrapers*; there is no equivalent agent-facing layer. `llms.txt` /
   `llms-full.txt` (the llmstxt.org convention) is that sibling: a curated index plus a full-content
   dump, discovered by convention at `/llms.txt` and `/llms-full.txt`.

2. **Consequence of not doing it.** Agents must crawl the HTML site (lossy, navigation-heavy) or clone
   each tool repo to understand the toolkit. The site already holds the mechanically-synced canonical
   content (README slices + command refs); not emitting an agent-readable view of it wastes work already
   done daily.

3. **Why this approach over alternatives.** Two Astro static endpoints (`src/pages/llms.txt.ts`,
   `src/pages/llms-full.txt.ts`) emitting `text/plain` at build time. This is idiomatic Astro
   static-output, runs entirely at build with full access to the repo-root data sources, ships zero
   runtime and zero server (Constitution I — Static-First, Zero Runtime; fits GitHub Pages). It reuses
   the exact data-loading patterns already in `src/lib/` rather than inventing new ones. **Rejected**:
   community integrations like `astro-llms-txt` — a new dependency for ~40–60 lines of endpoint code
   violates Constitution VI (Minimal Dependencies) and would be a *third* sync mechanism competing with
   the existing README and help-JSON pullers.

This is the explicit forcing function for clean structure noted in the backlog. **Honest caveat to
carry into hydrate:** `llms.txt` is a *proposed* convention, not a guaranteed-consumed standard like
`robots.txt`/sitemaps — this is cheap insurance and a structure-forcing function, not a guaranteed
traffic source.

## What Changes

Two new build-time static endpoints under `sites/astro-starlight-terminal1/src/pages/`. Both emit
`Content-Type: text/plain` (Astro endpoint: return `new Response(body, { headers: { 'Content-Type':
'text/plain; charset=utf-8' } })`). Both run at build and are emitted into `dist/llms.txt` and
`dist/llms-full.txt`.

### 1. URL origin — always absolute, never hardcoded

Every URL emitted in either file MUST be absolute and built from `Astro.site` (which is
`'https://shll.ai'`). Mirror the og:image absolute-URL discipline from `seo-social-meta.md`
(`new URL('/path', Astro.site)`). Never hardcode `https://shll.ai`. In an Astro endpoint, `site` is
available via the endpoint context (`({ site }) => …`) or imported from `astro:config/server`/
`astro:config/client` — pick whichever the surrounding lib code already uses; the requirement is "derive
from the single origin source," not the specific import.

### 2. `src/pages/llms.txt.ts` — the curated index

Format per the llmstxt.org convention:

```
# shll — the AI coding toolkit

> {one-line blockquote summary of what shll is}

## Tools

- [fab-kit](https://shll.ai/tools/fab-kit/overview/): {one-line description}
- [hop](https://shll.ai/tools/hop/overview/): {one-line description}
- [idea](https://shll.ai/tools/idea/overview/): {one-line description}
- [run-kit](https://shll.ai/tools/run-kit/overview/): {one-line description}
- [shll](https://shll.ai/tools/shll/overview/): {one-line description}
- [tu](https://shll.ai/tools/tu/overview/): {one-line description}
- [wt](https://shll.ai/tools/wt/overview/): {one-line description}

## Getting started

- [Install](https://shll.ai/getting-started/install/): ...
- [Overview](https://shll.ai/getting-started/overview/): ...
- [Philosophy](https://shll.ai/getting-started/philosophy/): ...

## Reference

- [Command index](https://shll.ai/reference/command-index/): all toolkit commands
```

Sections: **(1) Tools** — one bullet per tool linking to `/tools/<tool>/overview/` (this is the live
URL shape — each tool has an `overview.mdx` at `src/content/docs/tools/<tool>/overview.mdx`) with a
one-line description; **(2) Getting started** — install / overview / philosophy (these three files exist
under `src/content/docs/getting-started/`); **(3) Reference** — command-index
(`src/content/docs/reference/command-index.mdx`).

**Single-source the tool one-liners (CRITICAL anti-drift rule).** Drive each tool description from
`help/<tool>.json` via its `root.short` field — the canonical machine source. The codebase already
holds documented three-way and two-way hand-copies of tool descriptions (`tool-page-rubric.md`); this
change MUST NOT introduce a **fourth** hand-copy. **Derive, never retype.**

- **How to read `root.short` (the verified pattern).** Use the `commands-toc.ts` / `terminal-toolcard.ts`
  pattern, NOT `parse-help.ts`. `parse-help.ts` parses raw `-h`/`--help` *text* blobs (`Node.text`);
  `root.short` lives on the structured `HelpDoc` envelope. The read is: `findRepoRoot` /
  `repoRootFromModuleUrl(import.meta.url)` (from `src/lib/repo-root.ts`, anchored on the `help/` marker)
  → `fs.readFileSync(path.join(repoRoot, 'help', \`${tool}.json\`))` → `HelpDocSchema.parse(JSON.parse(raw))`
  (from `src/lib/schemas.ts`) → `doc.root.short`. The backlog's reference to "parse-help.ts /
  schemas.ts" is imprecise on which lib; the authoritative `root.short` reader is the `HelpDocSchema` +
  `repo-root` pattern. Consider extracting a small shared helper (e.g. `toolShort(tool): string`) in
  `src/lib/` so both endpoints and any future consumer single-source the read.
- **Fallback chain.** If `root.short` is missing/empty for a tool, fall back to that tool's
  `overview.mdx` frontmatter `description`. If both are absent, fail-soft to a noted omission (see
  VERIFY) rather than emitting an empty/`undefined` bullet.
- **Strip the binary-name prefix (Assumption #7, resolved).** `root.short` values often lead with
  `<bin> — ` (e.g. `rk — tmux session manager with web …`). Strip that leading `<bin> — ` so the bullet
  reads as a clean description (the tool name is already the bullet's link text — emitting it twice is
  redundant). Match the existing `terminal-toolcard.ts` trimming. Apply the strip only when the prefix
  is present; emit verbatim otherwise.
  <!-- clarified: strip `<bin> — ` prefix from root.short for clean bullets (user, 2026-06-18) -->

### 3. `src/pages/llms-full.txt.ts` — the full-content dump

Concatenate the mechanically-synced per-tool content already pulled daily:

- **README slices** — already deduced and committed at `<repo-root>/content/<tool>/README.md` (the
  curated slice `ReadmeSlice.astro` renders). Read each via the repo-root pattern. **You do not need to
  re-run `extractReadme()`** — the committed file IS the slice. (`extractReadme()` is the deducer that
  produced it; re-running is harmless but redundant.)
- **Command references** — the structured command listing per tool, produced by `parse-help.ts`'s tree
  output over `help/<tool>.json` (the same data `CommandsToc`/`CommandReference` render). Emit a plain-text
  rendering of the command tree per tool.

Structure suggestion (plain text, agent-readable; exact framing is an apply-stage detail):

```
# shll — full toolkit content

## fab-kit
{README slice for fab-kit}

### Commands
{command reference for fab-kit}

## hop
...
```

**Content boundary — resolved (see Assumption #5).** The backlog *recommended* mechanically-synced
content only and flagged this as its one open call; the user resolved it the other way:
`llms-full.txt` **DOES include the hand-authored MDX** (getting-started: `install` / `overview` /
`philosophy`; `workflows/`; and any other site-authored long-form prose) **in addition to** the
mechanically-synced README slices and command refs.
<!-- clarified: llms-full.txt includes hand-authored MDX too (user, 2026-06-18) — overrides backlog's "synced-only" recommendation -->

Implications the implementer must handle:
- **Source the MDX from the Starlight `docs` content collection**, not by hand-reading files. Use
  `getCollection('docs')` (the collection defined in `src/content.config.ts`) and emit the bodies of
  the relevant entries: `getting-started/*` (`install`, `overview`, `philosophy`),
  `reference/command-index`, `workflows/*`, and the tool `overview.mdx` entries if desired. This keeps
  `llms-full.txt` single-sourced from the same content the HTML pages render — no new hand-copy.
- **MDX is not plain markdown.** Entries may contain JSX component tags (`<GithubButton/>`,
  `<TerminalPrompt/>`, Starlight `<Card>`/`<Tabs>`, etc.) and frontmatter. For a `text/plain` dump,
  emit each entry's raw body and **strip/flatten** the obvious component tags and import lines so the
  output is readable prose, not literal JSX. A pragmatic strip (remove `import ...` lines, drop
  self-closing/paired component tags while keeping their text children) is sufficient; exact fidelity
  is an apply-stage detail, not a blocker. Prefer the rendered/compiled body if Astro exposes it
  cleanly; otherwise a lightweight tag-strip on `entry.body` is acceptable.
- **Coupling is now intentional, not accidental.** `llms-full.txt` is coupled to site-authored prose
  by design — staleness still rides the daily refresh for the synced parts, and the MDX parts change
  only when a human edits them (same cadence as the HTML pages). Note this tradeoff in the hydrate
  memory: the file is no longer "synced-only," so an MDX edit is now also an `llms-full.txt` edit.

**Staleness is not a new risk.** Both sources ride the existing daily `refresh-readme.yml` /
help-refresh cascade that already updates them (see `build-deploy/deployment.md`). No new schedule.

### 4. robots.txt — leave unchanged (explicit non-change)

Files are discovered by convention at `/llms.txt` and `/llms-full.txt`. Do **NOT** add a non-standard
`Sitemap:`-style line (or any reference) to `public/robots.txt` for them — there is no agreed mechanism,
and polluting `robots.txt` risks confusing real crawlers. Leave `robots.txt` exactly as-is. (Starlight's
`robots.txt` already references the real `sitemap-index.xml`; that stays untouched.)

### 5. VERIFY (build + content checks)

Run `pnpm build` in `sites/astro-starlight-terminal1/`, then confirm:
- `dist/llms.txt` and `dist/llms-full.txt` both exist and are `text/plain`.
- `llms.txt` carries **all 7 tools** with **non-empty** descriptions, uses **absolute** `https://shll.ai`
  URLs throughout, and lists the getting-started + reference sections.
- `llms-full.txt` is **non-empty for every tool** — catch a tool whose README slice failed to pull and
  **fail-soft to a noted omission** (mirror the help-collection per-tool skip-degrade, NOT VersionTable's
  build-stop). The build must not hard-fail on one missing slice.
- Both files update automatically on the daily content refresh (they read the same pulled sources).
- `public/robots.txt` is unchanged.

## Affected Memory

- `conventions/seo-social-meta.md`: (modify) This is the agent-facing sibling of the `kb1r` SEO layer
  documented here. Extend it (or add a clearly-delimited section) to record the two `llms.txt` endpoints:
  the absolute-URL-from-`Astro.site` discipline they share with og:image, the single-source-from-
  `help/<tool>.json` `root.short` rule (derive-not-retype, anti-drift), the `llms-full.txt` content
  boundary (synced README slices + command refs **plus** hand-authored MDX via `getCollection('docs')`,
  with JSX/import stripping — see Assumption #5), the robots.txt left-unchanged decision, and the honest
  "proposed convention, not guaranteed-consumed" caveat. **Placement resolved (Assumption #6): extend
  `seo-social-meta.md`** with a clearly-delimited section — NOT a new sibling file — to keep the SEO +
  agent-discoverability story co-located.
  <!-- clarified: memory extends seo-social-meta.md, not a new file (user, 2026-06-18) -->
- `conventions/help-collection.md`: (modify) Add `llms.txt`/`llms-full.txt` as new consumers of
  `help/<tool>.json` (`root.short` for the index; the `parse-help` command tree for the full dump) — this
  file already enumerates the help-JSON rendering consumers.
- `conventions/readme-extraction.md`: (modify) Add `llms-full.txt` as a new consumer of the committed
  `content/<tool>/README.md` slices (alongside `ReadmeSlice.astro` and the `readme-toc.ts` rail).

## Impact

**New files** (under `sites/astro-starlight-terminal1/`):
- `src/pages/llms.txt.ts` — curated-index endpoint.
- `src/pages/llms-full.txt.ts` — full-content endpoint.
- *(Optional)* a small shared helper in `src/lib/` (e.g. `llms.ts` or a `toolShort()` in an existing lib)
  to single-source the `root.short` read and the tool list, so the two endpoints don't duplicate it.

**Reused existing code (no modification needed to consume):**
- `src/lib/repo-root.ts` — `findRepoRoot` / `repoRootFromModuleUrl` (anchored on `help/`).
- `src/lib/schemas.ts` — `HelpDocSchema`, `Node` (validate + type the help JSON).
- `src/lib/parse-help.ts` — structured command tree for the full dump.
- `src/lib/commands-toc.ts` — reference pattern for reading `help/<tool>.json` → `doc.root`.
- `content/<tool>/README.md` (repo root) — the committed README slices for the full dump.
- `astro.config.mjs` `site` — the origin source.

**Dependencies:** none added (Constitution VI). All reads use Node stdlib `fs`/`path` already used by
the lib layer and `astro:content`'s transitive `zod`.

**Constitution touchpoints:** I (Static-First — build-time endpoints, no runtime ✓), III (mechanical
generation, never hand-authored ✓), VI (zero new deps ✓), Tool-Page Depth / `vn39` (single-source from
canonical `help/<tool>.json`, no new hand-copy ✓).

**Out of scope (explicit non-goals):**
- The `pgox` JSON-LD work and the `bees` editorial pass (separate backlog items, sequenced after this).
- Any change to `robots.txt`.
- Any new content authoring — this change only re-emits content that already exists.

## Open Questions

_None._ All forks resolved by the user (2026-06-18): the `llms-full.txt` content boundary (#5, include
hand-authored MDX too), the memory placement (#6, extend `seo-social-meta.md`), and the one-liner format
(#7, strip the `<bin> — ` prefix). No outstanding clarifications.

## Clarifications

### Session 2026-06-18

| Q | Answer |
|---|--------|
| Should `llms-full.txt` include hand-authored MDX, or mechanically-synced content only? (Assumption #5) | Include hand-authored MDX too — emit getting-started/workflows/philosophy/overview MDX (via `getCollection('docs')`) in addition to README slices + command refs. Overrides the backlog's synced-only recommendation; coupling to site-authored prose is now intentional. |
| Where should the hydrate memory live? (Assumption #6) | Extend `conventions/seo-social-meta.md` with a clearly-delimited section — NOT a new sibling file. Keeps the SEO + agent-discoverability story co-located. #6 → Confident. |
| How should tool one-liners render when `root.short` carries a `<bin> — ` prefix? (Assumption #7) | Strip the leading `<bin> — ` prefix (the tool name is already the bullet's link text). Matches `terminal-toolcard.ts` trimming. #7 → Confident. |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Two Astro static endpoints `src/pages/llms.txt.ts` + `src/pages/llms-full.txt.ts` emitting `text/plain` at build; reject `astro-llms-txt` and any new dep | Constitution I (static-first) + VI (min deps) deterministically answer this; backlog prescribes it verbatim | S:98 R:80 A:98 D:95 |
| 2 | Certain | All emitted URLs absolute, built from `Astro.site` (`https://shll.ai`); never hardcoded | `seo-social-meta.md` og:image discipline + `astro.config.mjs` `site:` are an exact precedent; constitution-grade rule | S:95 R:85 A:98 D:95 |
| 3 | Certain | Tool one-liners single-sourced from `help/<tool>.json` `root.short` (fallback: `overview.mdx` frontmatter `description`); no fourth hand-copy | `vn39`/Tool-Page-Depth anti-drift rule + documented existing hand-copies make this mandatory; 7 tools confirmed present | S:95 R:75 A:95 D:90 |
| 4 | Confident | `root.short` read via the `HelpDocSchema` + `repo-root.ts` pattern (as in `commands-toc.ts`), NOT `parse-help.ts` (which parses raw `-h` text) | Codebase verification: `root.short` is on the structured `HelpDoc` envelope; backlog's "parse-help.ts" reference is imprecise on which lib. Easily corrected if apply finds a cleaner read | S:80 R:80 A:90 D:85 |
| 5 | Confident | `llms-full.txt` includes hand-authored MDX (getting-started/workflows/philosophy/overviews, sourced via `getCollection('docs')`) IN ADDITION TO the mechanically-synced README slices + command refs | Clarified — user changed to "include MDX too" (2026-06-18), overriding the backlog's synced-only recommendation. Coupling to site-authored prose now intentional | S:95 R:65 A:60 D:60 |
| 6 | Confident | Memory captured by extending `conventions/seo-social-meta.md` (agent-facing sibling of `kb1r`), NOT a new sibling file | Clarified — user confirmed extending `seo-social-meta.md` (2026-06-18); keeps the SEO + agent-discoverability story co-located. (Grade by recomputed composite 75.0 — Confident, not Certain, since R/A/D unchanged) | S:95 R:80 A:65 D:55 |
| 7 | Confident | One-liner descriptions strip the leading `<bin> — ` prefix from `root.short` (e.g. `rk — tmux session manager…` → `tmux session manager…`), since the tool name is already the bullet's link text | Clarified — user confirmed stripping the prefix (2026-06-18); matches `terminal-toolcard.ts` trimming, non-redundant bullets. (Grade by recomputed composite 79.25 — Confident) | S:95 R:90 A:70 D:55 |

7 assumptions (3 certain, 4 confident, 0 tentative, 0 unresolved).
