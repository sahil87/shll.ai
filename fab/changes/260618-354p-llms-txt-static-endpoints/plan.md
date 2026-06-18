# Plan: Build-time /llms.txt and /llms-full.txt agent-discoverability endpoints

**Change**: 260618-354p-llms-txt-static-endpoints
**Intake**: `intake.md`

## Requirements

<!-- Derived from the intake design. RFC-2119 statements with stable R# IDs.
     Under-specified points are recorded as graded ## Assumptions rows, not markers. -->

### Endpoints: Build-time static text emission

#### R1: Two Astro static endpoints emitting `text/plain`
The site SHALL add two Astro static endpoints — `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts` — under `sites/astro-starlight-terminal1/`, each returning `new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })` and emitted into `dist/llms.txt` / `dist/llms-full.txt` at build. No SSR adapter, no new runtime/build dependency (Constitution I, VI).

- **GIVEN** the site is built with `pnpm build`
- **WHEN** the build completes
- **THEN** `dist/llms.txt` and `dist/llms-full.txt` both exist
- **AND** each carries a `text/plain; charset=utf-8` Content-Type
- **AND** no new dependency is added to `package.json`

#### R2: All emitted URLs absolute, derived from `Astro.site`
Every URL in either file MUST be absolute and built from the endpoint's `site` (`https://shll.ai`), via `new URL('/path', site)`, never a hardcoded literal — mirroring the og:image discipline in `seo-social-meta.md`.

- **GIVEN** either endpoint emits a link
- **WHEN** the URL is constructed
- **THEN** it is built from the endpoint context `site` (not a hardcoded string)
- **AND** the rendered output uses the absolute `https://shll.ai` origin throughout

### Index: `llms.txt` (curated llmstxt.org index)

#### R3: `llms.txt` curated index structure
`llms.txt` SHALL follow the llmstxt.org convention: an H1 title, a one-line blockquote summary, then three bulleted link sections — (1) **Tools**: one bullet per tool linking to `/tools/<tool>/overview/` with a one-line description; (2) **Getting started**: install / overview / philosophy; (3) **Reference**: command-index.

- **GIVEN** the 7 tools (`fab-kit`, `hop`, `idea`, `run-kit`, `shll`, `tu`, `wt`)
- **WHEN** `llms.txt` is generated
- **THEN** it carries an H1, a blockquote summary, and the three sections
- **AND** the Tools section lists all 7 tools, each linking to `/tools/<tool>/overview/`
- **AND** the Getting started section links install/overview/philosophy and Reference links command-index

#### R4: Tool one-liners single-sourced from `help/<tool>.json` `root.short`
Each tool description MUST be derived from `help/<tool>.json` `root.short` (the canonical machine source) via the `HelpDocSchema` + `repo-root.ts` pattern (as in `commands-toc.ts`), NOT `parse-help.ts`. The leading `<bin> — ` prefix MUST be stripped when present (the tool name is already the link text). If `root.short` is missing/empty, fall back to the tool's `overview.mdx` frontmatter `description`; if both are absent, emit a fail-soft noted omission rather than an empty/`undefined` bullet. No fourth hand-copy is introduced (vn39 / Tool-Page-Depth anti-drift).

- **GIVEN** a tool whose `root.short` is `"rk — tmux session manager with web UI"`
- **WHEN** the bullet is rendered
- **THEN** the description reads `tmux session manager with web UI` (prefix stripped)
- **AND GIVEN** a tool with empty `root.short` but a present `overview.mdx` `description`
- **WHEN** the bullet is rendered
- **THEN** the description falls back to the frontmatter `description`
- **AND GIVEN** a tool with neither
- **THEN** a noted omission is emitted and the build does not hard-fail

### Full dump: `llms-full.txt`

#### R5: `llms-full.txt` concatenates synced content plus hand-authored MDX
`llms-full.txt` SHALL concatenate, per tool: (a) the committed README slice at `<repo-root>/content/<tool>/README.md` (read directly — already the deduced slice; do NOT re-run `extractReadme`), and (b) a plain-text rendering of that tool's command tree from `parse-help.ts` over `help/<tool>.json`. It SHALL ALSO include the hand-authored MDX bodies sourced via `getCollection('docs')` — getting-started (`install`/`overview`/`philosophy`), `reference/command-index`, `workflows/*`, and the tool `overview.mdx` entries — with JSX component tags and `import ...` lines stripped/flattened to readable prose for the `text/plain` dump.

- **GIVEN** the 7 tools and the committed README slices + help JSON
- **WHEN** `llms-full.txt` is generated
- **THEN** each tool has a section containing its README slice and a command reference
- **AND** the hand-authored MDX (getting-started, command-index, workflows, tool overviews) is appended with JSX/import lines stripped
- **AND** the file is non-empty for every tool

#### R6: Per-tool fail-soft (no build-stop on a missing slice/JSON)
A tool whose README slice or help JSON is missing MUST degrade to a noted omission and the build MUST continue (mirror help-collection per-tool skip-degrade, NOT VersionTable's build-stop).

- **GIVEN** a tool whose `content/<tool>/README.md` is absent
- **WHEN** `llms-full.txt` is generated
- **THEN** a noted omission is emitted for that tool and the build succeeds

### Non-change

#### R7: `public/robots.txt` left unchanged
`public/robots.txt` MUST NOT be modified. No `llms.txt`/`llms-full.txt` reference is added to it (no agreed mechanism; risks confusing crawlers).

- **GIVEN** the change is applied
- **WHEN** `public/robots.txt` is compared before/after
- **THEN** it is byte-identical

### Design Decisions

1. **Shared helper in `src/lib/`**: extract `src/lib/llms.ts` to single-source the tool list, the `root.short` read (`HelpDocSchema` + `repo-root.ts`), the `<bin> — ` prefix strip, the README-slice read, the command-tree plain-text render, and the MDX tag-strip — so both endpoints and any future consumer single-source the reads. — *Why*: avoids duplicating the cross-boundary reads across two endpoints; mirrors the existing `commands-toc.ts`/`terminal-toolcard.ts` lib-extraction precedent. — *Rejected*: inlining the reads in each `.txt.ts` (duplication, drift risk).
2. **Pure prefix-strip kept testable**: the `<bin> — ` strip reuses the exact `stripToolPrefix(short, tool)` semantics from `terminal-toolcard.ts`. — *Why*: matches established trimming; the binary name comes from the help doc's `tool` field. — *Rejected*: a regex on `<any> — ` (could strip a legitimate em-dash lead).
3. **MDX flattening is pragmatic, not exact**: strip `import ...` lines, drop self-closing and paired JSX component tags (keeping text children), strip frontmatter. — *Why*: intake resolves exact fidelity as an apply detail, not a blocker; output need only be readable prose. — *Rejected*: a full MDX compiler/AST pass (heavier; no page-visible need, Constitution VI).
4. **Read `root.short` via `HelpDocSchema`, not `parse-help.ts`**: `parse-help.ts` parses raw `-h` text; `root.short` lives on the structured `HelpDoc` envelope (Assumption #4 in intake). — *Why*: codebase-verified authoritative reader. — *Rejected*: `parse-help.ts` (wrong layer for `root.short`).

### Non-Goals

- The `pgox` JSON-LD work and the `bees` editorial pass (separate, sequenced backlog items).
- Any change to `robots.txt`.
- Any new content authoring — this change re-emits content that already exists.

## Tasks

### Phase 1: Setup

- [x] T001 Create `src/lib/llms.ts` shared helper exporting: the canonical 7-tool list; `stripToolPrefix(short, tool)` (mirroring `terminal-toolcard.ts`); `toolShort(repoRoot, tool)` reading `help/<tool>.json` via `HelpDocSchema` + `fs` and returning the prefix-stripped `root.short` (or `null` on missing/empty/ENOENT); `readReadmeSlice(repoRoot, tool)` reading `content/<tool>/README.md` (or `null` on ENOENT); `renderCommandTree(node)` producing a plain-text indented command reference from the `HelpDoc` tree; and an MDX-flatten helper `flattenMdx(body)` stripping `import` lines and JSX tags. All reads defensive/fail-soft. <!-- R4 R5 R6 -->

### Phase 2: Core Implementation

- [x] T002 Implement `src/pages/llms.txt.ts` — the curated index endpoint. Use the endpoint context `site`, `repoRootFromModuleUrl(import.meta.url)`, and the `src/lib/llms.ts` helper to build: H1 title + blockquote summary; Tools section (one bullet per tool → `new URL('/tools/<tool>/overview/', site)` with the stripped one-liner, fallback to `overview.mdx` `description` via `getCollection('docs')`, fail-soft omission note if both absent); Getting started section (install/overview/philosophy absolute URLs); Reference section (command-index). Return `text/plain; charset=utf-8`. <!-- R1 R2 R3 R4 R6 -->
- [x] T003 Implement `src/pages/llms-full.txt.ts` — the full-content endpoint. Concatenate per tool: README slice (`readReadmeSlice`, fail-soft omission), `### Commands` plain-text tree (`renderCommandTree` over the validated `HelpDoc`, fail-soft omission). Then append hand-authored MDX via `getCollection('docs')` — getting-started/* , reference/command-index, workflows/*, and tool `overview.mdx` entries — each body passed through `flattenMdx`. Use the endpoint context `site` for any emitted links. Return `text/plain; charset=utf-8`. <!-- R1 R2 R5 R6 -->

### Phase 3: Integration & Edge Cases

- [x] T004 Add a unit test `scripts/llms.test.mjs` (run via `node --test`) covering the pure helpers in `src/lib/llms.ts`: `stripToolPrefix` (prefix present vs. absent), `renderCommandTree` (root + nested), and `flattenMdx` (import-line + JSX-tag removal, text children kept). Use the `scripts/astro-content-alias.mjs` loader hook if any tested symbol transitively imports `astro:content` (mirror `validate-help.mjs`). <!-- R4 R5 -->

### Phase 4: Polish

- [x] T005 Run `pnpm build` in `sites/astro-starlight-terminal1` and verify: both dist files exist + are text/plain; `llms.txt` lists all 7 tools with non-empty descriptions and absolute `https://shll.ai` URLs + getting-started/reference sections; `llms-full.txt` is non-empty for every tool; `public/robots.txt` is byte-unchanged. Run the new + relevant existing `node --test scripts/*.test.mjs`. <!-- R1 R2 R3 R5 R6 R7 -->

## Execution Order

- T001 blocks T002, T003, and T004 (shared helper).
- T002 and T003 are independent of each other once T001 lands.
- T004 depends on T001; T005 (build + verify) runs last.

## Acceptance

### Functional Completeness

- [ ] A-001 R1: Both `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts` exist, return `text/plain; charset=utf-8`, and emit `dist/llms.txt` / `dist/llms-full.txt` at build with zero new dependencies.
- [ ] A-002 R3: `llms.txt` carries an H1, a blockquote summary, a Tools section listing all 7 tools (each → `/tools/<tool>/overview/`), a Getting started section (install/overview/philosophy), and a Reference section (command-index).
- [ ] A-003 R4: Every tool bullet has a non-empty description sourced from `root.short` (prefix-stripped) with `overview.mdx` `description` fallback; no fourth hand-copy is introduced.
- [ ] A-004 R5: `llms-full.txt` contains, per tool, the README slice and a command reference, plus the hand-authored MDX (getting-started, command-index, workflows, tool overviews) with JSX/import lines stripped; non-empty for every tool.

### Behavioral Correctness

- [ ] A-005 R2: All emitted URLs are absolute `https://shll.ai/...`, constructed from the endpoint `site` (no hardcoded origin literal in source).
- [ ] A-006 R4: A `root.short` carrying a `<bin> — ` prefix renders with the prefix stripped; a value without the prefix renders verbatim.

### Edge Cases & Error Handling

- [ ] A-007 R6: A missing README slice or help JSON for a tool degrades to a noted omission and the build succeeds (no hard-fail).

### Removal Verification

- [ ] A-008 R7: `public/robots.txt` is byte-identical before and after the change (no `llms.txt` reference added).

### Code Quality

- [ ] A-009 Pattern consistency: New code follows the `src/lib/` build-time-read conventions (`repoRootFromModuleUrl`, `HelpDocSchema`, defensive fail-soft) of surrounding code (`commands-toc.ts`, `terminal-toolcard.ts`, `[slug]/[...path].astro`).
- [ ] A-010 No unnecessary duplication: The tool list, `root.short` read, prefix strip, README read, command-tree render, and MDX flatten are single-sourced in `src/lib/llms.ts`; the two endpoints do not duplicate them.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Two Astro static endpoints emitting `text/plain`; zero new deps | Constitution I + VI + intake R1 deterministically fix this | S:98 R:80 A:98 D:95 |
| 2 | Certain | All URLs absolute from endpoint `site` (`new URL(path, site)`) | `seo-social-meta.md` og:image precedent + `astro.config.mjs` `site:` | S:95 R:85 A:98 D:95 |
| 3 | Certain | Tool one-liners from `root.short` (fallback `overview.mdx` description); no fourth hand-copy | vn39/Tool-Page-Depth anti-drift; 7 tools confirmed | S:95 R:75 A:95 D:90 |
| 4 | Confident | `root.short` read via `HelpDocSchema` + `repo-root.ts` (as `commands-toc.ts`), not `parse-help.ts` | Codebase-verified: `root.short` is on the structured `HelpDoc` envelope | S:80 R:80 A:90 D:85 |
| 5 | Confident | `llms-full.txt` includes hand-authored MDX (via `getCollection('docs')`) plus synced README + command refs | Intake clarification 2026-06-18 resolved this; coupling now intentional | S:95 R:65 A:60 D:60 |
| 6 | Confident | Shared `src/lib/llms.ts` helper single-sources the reads for both endpoints | Intake Impact section suggests it; mirrors `commands-toc.ts`/`terminal-toolcard.ts` lib-extraction precedent | S:85 R:85 A:85 D:75 |
| 7 | Confident | MDX flatten is a pragmatic tag/import strip, not a full AST/compile pass | Intake resolves exact fidelity as an apply detail, not a blocker (Constitution VI) | S:85 R:80 A:80 D:70 |

7 assumptions (3 certain, 4 confident, 0 tentative).
