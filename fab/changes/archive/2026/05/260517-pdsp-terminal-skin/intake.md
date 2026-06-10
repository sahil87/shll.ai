# Intake: Terminal Skin

**Change**: 260517-pdsp-terminal-skin
**Created**: 2026-05-17
**Status**: Draft

## Origin

> Restyle ai.shll.in with a terminal-inspired visual identity. Replace the generic Starlight default look (Inter font, indigo accent) with monospace typography everywhere (JetBrains Mono), a phosphor-amber + sage + teal palette, and subtle terminal flourishes. Keep Starlight's structural chrome (sidebar, TOC, search, social links). Dark mode is primary (warm near-black bg, off-white text, amber accent); light mode is "paper terminal" (warm cream bg, dark warm ink, deeper accents for AA contrast).

This change followed a `/fab-discuss` exploration in which the user asked whether the site could be given a stronger presence via a distinctive style. Three options were considered: (1) typography-only (mono headings/code, keep Starlight palette), (2) terminal-skinned (mono everywhere + phosphor palette + subtle flourishes, keep Starlight chrome), (3) full terminal pastiche (window chrome, typed-out hero, terminal-as-page).

The user selected **Option 2** after reviewing a high-fidelity HTML mockup at `~/.agent/diagrams/ai-shll-in-terminal-skin.html`. Three follow-up decisions were taken:

1. **Keep the blinking H1 cursor** (user picked "Keep" over the agent's "Skip" recommendation — committing to the terminal feel rather than hedging).
2. **Replace `<CardGrid>` with a tree-branch list** on the home Tools section (rather than restyle the cards).
3. **Regenerate the loop SVGs now** with the new palette, in this same change.

The mockup is the visual source of truth for this change — every flourish, color, and font choice was reviewed there before approval.

## Why

The current site uses Starlight's stock theme: Inter sans-serif, indigo accent, generic developer-tool dark mode. It is competent but indistinguishable from hundreds of other Astro/Starlight sites. For a toolkit whose entire personality is "seven small Go CLIs you operate from the terminal," the visual identity should reinforce that — not fight it with a generic SaaS look.

**What happens if we don't fix it.** The site keeps doing its job (links to GitHub work, install commands are copy-pasteable), but it leaves identity on the table. Visitors arrive from terminal-heavy contexts (the Discord, Twitter posts, the tool READMEs) and land on a page that looks like every other docs site. The dissonance is mild but persistent.

**Why terminal-skinned, not full pastiche.** Full terminal pastiche (window chrome, fake prompts as nav, typed-out copy) is striking on first visit and irritating on the second. It also breaks down on the tool subpages — those need to read as documentation, not as a TTY. Terminal-skinned threads the needle: strong presence on the home page, while Starlight's load-bearing chrome (sidebar, TOC, search) keeps working unchanged, and tool pages inherit the new fonts + palette without any per-page rework.

**Why now.** The site has been polished recently (icon swaps, diagram fixes, MIT license, robots.txt — see commits `dcd5c30`, `0cc1855`, `d132bb1`, `59f15aa`, `fd69a63`). The content shape is stable. This is the right moment to invest in the visual layer; doing it earlier would have risked re-painting against shifting content.

## What Changes

### 1. Typography — JetBrains Mono everywhere

Switch from Starlight's default sans-serif (resolves to system-ui / Inter-equivalent) to a monospace family used for all roles: headings, body, nav, code. No sans/mono split — the commitment is the point.

- **Primary**: JetBrains Mono via Google Fonts (free, ~weights 400/500/600/700 loaded).
- **Fallback stack**: `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace`
- **Loading mechanism**: `@fontsource/jetbrains-mono` (self-hosted via npm package, avoids Google Fonts network dependency at runtime). Falls back to Google Fonts `<link>` only if fontsource is rejected during planning.

Type scale (from the mockup):
- H1 (hero): 32px / 600
- H2 (section): 20px / 600
- H3: 16px / 500
- Body: 14px / 400
- Small/caption: 12px / 400
- Code: 13px / 400

### 2. Color tokens — phosphor-amber palette

All colors flow from CSS custom properties declared in `@theme` inside `src/styles/global.css`. Tailwind v4 picks these up as utility colors (e.g., `bg-bg`, `text-accent`, `border-border`). Two themes:

**Dark (primary)** — warm near-black, off-white text, amber as primary accent:
```
--bg         #0b0d10
--surface    #12161b
--surface-2  #1a1f26   (code blocks, recessed)
--border     #232932
--fg         #d8dce4
--fg-dim     #7c8593
--fg-faint   #4a525e
--accent     #d4a73a   (amber, primary)
--accent-2   #7cb342   (sage, $ prompts and ## hashes)
--accent-3   #5eb3b3   (teal, links)
```

**Light (paper terminal)** — warm cream paper, dark warm ink, deeper accents for AA contrast:
```
--bg         #f5f1e8
--surface    #ede7d6
--surface-2  #e4dcc4
--border     #c9bfa5
--fg         #2a2620
--fg-dim     #6b6256
--fg-faint   #a39a87
--accent     #a8761a
--accent-2   #5a7a2e
--accent-3   #2e6868
```

These are wired to Starlight via its CSS variable override path — `--sl-font`, `--sl-color-text`, `--sl-color-bg`, `--sl-color-accent`, etc. — so the sidebar, TOC, search, and tool subpages all pick up the new look without per-component edits. This is the official Starlight customization path.

### 3. Terminal flourishes (home page only)

Seven specific flourishes, all confirmed by the user. None of these is a CSS class in `global.css` — every one is expressed via Tailwind utilities in markup (or, where useful, via a small Astro component composed of utility classes):

1. **Hero shellpath line** above the H1: `~/ai.shll.in $ cat README.md`
   - The path `~/ai.shll.in` in `text-accent-2` (sage), the `$` in `text-accent-2`, the command `cat README.md` in `text-fg-dim`.
   - One short line, small caps, sits above the title.

2. **Blinking cursor (`█`)** at the end of the H1.
   - Implemented as a `<span>` with Tailwind utilities: inline-block, width ~0.6em, accent-colored background, an `animate-blink` utility wired via a Tailwind `@keyframes` declaration in `@theme` (still token-layer, not component CSS).

3. **`$` prompt prefix** before each hero CTA button and each install command line.
   - Inline `<span class="text-accent-2 font-semibold">$</span>` before each `<a>` or command line.

4. **Section headers prefixed with `##`** in sage.
   - The `##` is part of the heading text, styled with a `text-accent-2` span. Reads like a markdown source heading without losing the semantic `<h2>`.

5. **ASCII horizontal rules** between sections.
   - A `<hr>` element styled with `border-0`, `text-fg-faint`, and a `before:content-['──…']` or similar Tailwind arbitrary-value rule. Alternative: a `<div>` with `text-fg-faint` containing the actual dashes. Final choice deferred to spec.

6. **Code-block-style callouts** with a corner label.
   - The install block (already a code block) gets a small corner badge ("bash") via Tailwind absolute positioning. Existing fenced code blocks elsewhere are not modified.

7. **Tools section: `<CardGrid>` → tree list**.
   - Replace the seven `<Card>` components with a 7-line tree:
     ```
     ├── idea     Plain-Markdown backlog (fab/backlog.md) — worktree-aware, queryable from the CLI, feeds /fab-new.
     ├── hop      Fuzzy-nav, batch-git, and run-anything-inside-any-repo from one hop.yaml config.
     ├── fab-kit  7-stage pipeline that forces AI agents to plan before they code.
     ├── wt       Opinionated git worktree wrapper — one worktree per change, zero conflicts.
     ├── run-kit  Browser dashboard for tmux + Claude Code workspaces. Mobile-friendly via Tailscale.
     ├── tu       Token/cost tracker for Claude Code, Codex, OpenCode. Multi-machine sync, live watch.
     └── shll     Meta-CLI — shll install / update / shell-install to wire and maintain the whole toolkit.
     ```
   - Each line is a CSS Grid row (24px branch column / 80px name column / 1fr description column) built from Tailwind utilities.
   - Each tool name links to its `/tools/{name}/` page; each description ends with `Docs →` and `GitHub →` links matching the existing pattern.
   - The `<CardGrid>` and `<Card>` imports are removed from the MDX file.

### 4. Loop diagram — regenerate with new palette

`src/diagrams/loop.mmd` currently uses tailwind-blue/emerald/orange/purple for node strokes. Update the `classDef` strokes to the new palette:
- `tool` class → stroke `#d4a73a` (amber)
- `agent` class → stroke `#7cb342` (sage)
- `ship` class → stroke `#5eb3b3` (teal)
- `ambient` class → keep a muted `#7c8593` (fg-dim)

Regenerate both outputs via the existing `mmdc` workflow documented in `docs/memory/site/diagrams.md`:

```sh
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i src/diagrams/loop.mmd -t default \
  -o public/diagrams/loop-light.svg
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i src/diagrams/loop.mmd -t dark -b transparent \
  -o public/diagrams/loop-dark.svg
```

Commit all three files (`.mmd` source + two `.svg` outputs).

### 5. Out of scope (explicitly)

- **Tool detail pages** (`/tools/idea/` etc.) — they inherit fonts + colors via Starlight CSS variable overrides. No per-page edits. The "At a glance" code blocks and bullet lists keep their existing structure.
- **`docs/memory/conventions/tool-page-rubric.md`** — describes individual tool page shape, which is unchanged. Not affected by this redesign.
- **Sidebar / TOC structural changes** — the lists themselves stay; only their typography and colors shift.
- **New pages, new content, new tools** — none.
- **Logo redesign** — keep `public/logo.svg`; verify it reads against the new palette during review, but no redraw planned.

## Affected Memory

- `site/styling`: (modify) Update token list, document the Starlight CSS variable override approach, document the `@theme` block contents, note JetBrains Mono as the primary font and the load mechanism, note that all "component-style" effects live as utility-class compositions in markup, not as CSS classes.
- `site/site-architecture`: (modify) Note that the home page's Tools section uses a custom tree-list layout (Tailwind grid rows) rather than `<CardGrid>`/`<Card>`, while individual tool pages remain unchanged.
- `site/diagrams`: (modify) Update the `classDef` palette reference to the new tokens. The regeneration workflow itself is unchanged.

Memory files not affected:
- `conventions/tool-page-rubric` — individual tool page shape is unchanged.
- `site/astro-config` — sidebar/social/customCss config is unchanged; only the CSS file's contents change.
- `build-deploy/deployment` — no change to build or deploy.

## Impact

**Files modified:**
- `src/styles/global.css` — gains a `@theme` block with all tokens + Starlight CSS variable overrides. Stays a "tokens only" file per Constitution III; no component-scoped rules.
- `src/content/docs/index.mdx` — restructures hero (shellpath + cursor), removes `<CardGrid>`/`<Card>` imports and usage, adds tree-list markup, adds `$` prompts on CTAs and install lines, adds `##` prefix spans on H2s, swaps `<hr>` for the ASCII-rule pattern.
- `src/diagrams/loop.mmd` — updates `classDef` stroke colors.
- `public/diagrams/loop-light.svg`, `public/diagrams/loop-dark.svg` — regenerated outputs.
- `package.json` — adds `@fontsource/jetbrains-mono` dependency.
- `astro.config.mjs` — adds the fontsource `@import` to `customCss` (or imports the package CSS via `head` `<link>` if simpler).

**Files NOT modified:**
- `src/content/docs/tools/*.md` (all 8 files including index) — inherit via Starlight CSS variables.
- `src/components/Diagram.astro` — unchanged.
- `astro.config.mjs` sidebar/social/title — unchanged.

**Dependencies added:** one — `@fontsource/jetbrains-mono` (~30KB woff2 per weight × 4 weights = ~120KB total, but only loaded weights actually used at runtime). Justification per Constitution IV: typography IS the redesign; without a font swap, no other change matters. Self-hosted via fontsource avoids the Google Fonts third-party-request cost at runtime.

**Build/deploy:** No CI changes. The deploy workflow runs `pnpm install --frozen-lockfile && pnpm build` — adding the fontsource package picks it up automatically.

**Accessibility:** Per Constitution V (dark-mode parity) — every color has a light + dark variant. WCAG AA contrast verified at spec time for `--fg` on `--bg` and `--accent` on `--bg` in both themes. The blinking cursor uses `prefers-reduced-motion` to disable the animation when requested (handled via Tailwind's `motion-safe:animate-blink` utility).

## Open Questions

- **Font load mechanism** — `@fontsource/jetbrains-mono` (self-hosted, adds package) vs Google Fonts `<link>` (zero package, runtime network dep). Both work; tradeoff is dependency vs runtime fetch. Plan to pick `@fontsource/jetbrains-mono` for offline build determinism, but spec should confirm.
- **ASCII rule rendering technique** — Tailwind `before:content-['──…']` arbitrary value vs a `<div>` containing literal dashes vs a `<hr>` with `text-decoration-style: dashed`. The mockup uses literal dashes in a `::before` pseudo-element. Spec should pick one and document.
- **Cursor element type** — `<span>` with Tailwind `animate-blink` (defined via `@keyframes` in `@theme`) is the planned approach. Alternative: a small `<Cursor>` Astro component for cleaner MDX. Defer to spec.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Approach is Option 2 "terminal-skinned" (mono everywhere + palette + flourishes, keep Starlight chrome). Not full pastiche. | Discussed — user picked Option 2 over Options 1 and 3 after reviewing the comparison. | S:95 R:80 A:90 D:95 |
| 2 | Certain | Primary font is JetBrains Mono. | Discussed — user reviewed alternatives (IBM Plex Mono, Geist Mono, Berkeley Mono) and JBM was the recommendation; Berkeley ruled out for $200+ license per Constitution IV. | S:95 R:85 A:90 D:90 |
| 3 | Certain | Exact dark + light token hex values. | Discussed — user reviewed the swatch palette in the mockup and approved. | S:95 R:75 A:90 D:95 |
| 4 | Certain | Blinking cursor on H1 is KEPT. | Discussed — user explicitly picked "Keep" over the agent's "Skip" recommendation. | S:95 R:90 A:85 D:95 |
| 5 | Certain | Tools section: `<CardGrid>` is REPLACED with a tree-branch list (not restyled cards). | Discussed — user explicitly picked "Replace" over "Restyle". | S:95 R:60 A:90 D:95 |
| 6 | Certain | Loop diagram is regenerated NOW with the new palette (not deferred to a follow-up). | Discussed — user explicitly picked "Regenerate now". | S:95 R:80 A:90 D:95 |
| 7 | Certain | Constitution III is respected: `global.css` contains only `@import` + `@theme` tokens + Starlight CSS variable overrides. Zero component-scoped CSS rules. | Already documented in `docs/memory/site/styling.md` (line 12, theme tokens explicitly allowed). User flagged this constraint in the original prompt. | S:95 R:90 A:95 D:95 |
| 8 | Certain | Tool subpages (`/tools/*.md`) are NOT individually edited — they inherit via Starlight CSS variable overrides. | This is the documented Starlight customization mechanism; verified against `docs/memory/site/styling.md`. User flagged this as out-of-scope in the original prompt. | S:95 R:80 A:95 D:95 |
| 9 | Certain | `docs/memory/conventions/tool-page-rubric.md` is NOT modified. | Rubric describes individual tool page structure (frontmatter, Install, At a glance, Full docs sections) which is unchanged. User's intake mentioned "review" but on inspection no spec-level change is needed. | S:90 R:85 A:95 D:90 |
| 10 | Confident | Font load mechanism is `@fontsource/jetbrains-mono` (self-hosted via npm package). | Mockup discussion noted both options; user expressed no preference. Self-hosting wins for build determinism and avoids a runtime third-party request. Easily reversible to Google Fonts `<link>` if pnpm size budget complains. | S:60 R:85 A:80 D:75 |
| 11 | Confident | The `$` prompt and `##` hash prefixes are inline `<span>` elements with Tailwind utility classes (not separate Astro components). | Composition stays in the MDX file where the content lives. Components would over-abstract single-character spans. | S:60 R:90 A:85 D:80 |
| 12 | Confident | The tree-list is implemented as CSS Grid rows (3-column: branch / name / desc), built from Tailwind utilities directly in MDX. | Matches the mockup. Direct Tailwind keeps the markup readable and avoids a new component for one-time use. | S:70 R:85 A:90 D:80 |
| 13 | Confident | Mermaid `classDef` colors map: tool→amber, agent→sage, ship→teal, ambient→fg-dim. | Mockup shows this mapping in the loop diagram preview. Confirmed visual coherence with the rest of the palette. | S:75 R:90 A:85 D:80 |
| 14 | Confident | Blinking cursor respects `prefers-reduced-motion` via Tailwind's `motion-safe:` variant. | Accessibility good practice, costs nothing. The cursor is an aesthetic choice and the page works without animation. | S:70 R:95 A:95 D:90 |
| 15 | Tentative | ASCII rule technique is `<hr>` with `before:content-['────…']` CSS pseudo-element via Tailwind arbitrary value. | Three viable options (pseudo-element, literal `<div>`, decorated `<hr>`). Pseudo-element wins on semantics (real `<hr>`) + DRY (one declaration). Easy to swap during spec/apply if any rendering issue surfaces. | S:55 R:90 A:75 D:60 |
| 16 | Tentative | Code-block corner label ("bash" badge top-right of install block) is achieved via Tailwind absolute positioning around the existing Astro markdown fenced code block. | Starlight's markdown code rendering is the constraint — if it wraps with extra divs that interfere with positioning, the alternative is a manual `<div class="relative">` wrapper around a `<pre>`. Easy to verify and adjust during apply. | S:55 R:80 A:70 D:65 |

16 assumptions (9 certain, 5 confident, 2 tentative, 0 unresolved).
