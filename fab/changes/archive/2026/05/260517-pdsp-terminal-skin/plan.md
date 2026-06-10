# Plan: Terminal Skin

**Change**: 260517-pdsp-terminal-skin
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

## Requirements

<!-- migrated from spec.md on 2026-06-03 -->

## Non-Goals

- Individual tool subpages (`/tools/{name}.md`) — they inherit fonts and colors via Starlight CSS variable overrides; no per-file edits.
- Sidebar/TOC/search structural changes — lists and behavior unchanged; only typography and palette shift.
- Logo redesign — `public/logo.svg` is reused as-is; verify legibility against the new palette at review time, do not redraw.
- Tool-page-rubric memory file — the rubric (frontmatter / Install / At a glance / Full docs sections) is unchanged.
- New pages, new content, new tools.
- Mobile-only or print-only styling — Tailwind's default responsive utilities suffice; no media-query overrides specific to this change.

## Styling: Token Layer (`src/styles/global.css`)

### Requirement: Tokens-Only Stylesheet

`src/styles/global.css` SHALL contain only three categories of content: (1) the `@import "tailwindcss";` directive, (2) a Tailwind v4 `@theme` block declaring CSS custom properties for colors, fonts, and keyframes, and (3) Starlight CSS variable overrides scoped under `:root` and `:root[data-theme='dark']` selectors. The file SHALL NOT contain component-scoped CSS rules (no class selectors like `.hero`, `.tree`, `.prompt`, etc.).

This requirement is mandated by Constitution Principle III ("Tailwind Utilities, No Custom CSS") and supersedes any other implementation convenience.

#### Scenario: Constitutional compliance

- **GIVEN** the stylesheet `src/styles/global.css` after this change is applied
- **WHEN** I grep for class selectors (`grep -E "^\.[a-z]" src/styles/global.css`)
- **THEN** zero matches are found
- **AND** the only top-level constructs are `@import`, `@theme`, and Starlight CSS-variable overrides under `:root` selectors

#### Scenario: Theme tokens are utility-class accessible

- **GIVEN** a token `--color-accent: #d4a73a` declared in `@theme`
- **WHEN** an MDX file applies `text-accent` or `bg-accent` as a Tailwind utility
- **THEN** the utility resolves to the token value at build time
- **AND** no JIT class generation errors are emitted

### Requirement: Color Tokens — Dark Theme (Default)

The `@theme` block SHALL declare the following CSS custom properties at `:root` scope for the dark theme:

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#0b0d10` | Page background |
| `--color-surface` | `#12161b` | Card / panel background |
| `--color-surface-2` | `#1a1f26` | Code block / recessed surface |
| `--color-border` | `#232932` | Default border |
| `--color-fg` | `#d8dce4` | Primary text |
| `--color-fg-dim` | `#7c8593` | Secondary text |
| `--color-fg-faint` | `#4a525e` | Comments, faint marks, ASCII rules |
| `--color-accent` | `#d4a73a` | Primary accent (amber — links in dark, hero highlights, cursor) |
| `--color-accent-2` | `#7cb342` | Secondary accent (sage — `$` prompts, `##` hashes) |
| `--color-accent-3` | `#5eb3b3` | Tertiary accent (teal — body links) |

These tokens become Tailwind utilities automatically: `bg-bg`, `text-fg`, `text-fg-dim`, `text-fg-faint`, `text-accent`, `text-accent-2`, `text-accent-3`, `border-border`, etc.

#### Scenario: Dark mode is the default

- **GIVEN** a visitor with no theme preference set in localStorage or OS-level dark-mode preference
- **WHEN** the page loads
- **THEN** Starlight's default theme is dark
- **AND** the rendered page uses the dark token set above
- **AND** the page background renders as `#0b0d10`

### Requirement: Color Tokens — Light Theme

When the user toggles to light mode (Starlight sets `data-theme="light"` on `<html>`, or removes `data-theme="dark"`), the same logical tokens SHALL resolve to a paper-terminal palette:

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#f5f1e8` | Warm cream page background |
| `--color-surface` | `#ede7d6` | Card / panel background |
| `--color-surface-2` | `#e4dcc4` | Code block / recessed |
| `--color-border` | `#c9bfa5` | Default border |
| `--color-fg` | `#2a2620` | Primary ink (dark warm) |
| `--color-fg-dim` | `#6b6256` | Secondary ink |
| `--color-fg-faint` | `#a39a87` | Faint marks |
| `--color-accent` | `#a8761a` | Primary accent (deeper amber) |
| `--color-accent-2` | `#5a7a2e` | Secondary accent (deeper sage) |
| `--color-accent-3` | `#2e6868` | Tertiary accent (deeper teal) |

#### Scenario: Theme toggle swaps token values

- **GIVEN** the page rendered in dark mode (`html[data-theme="dark"]`)
- **WHEN** the user clicks Starlight's theme toggle to switch to light
- **THEN** `data-theme="light"` is set on `<html>` (or `data-theme` is removed, per Starlight's default)
- **AND** the computed `background-color` of `<body>` changes from `#0b0d10` to `#f5f1e8`
- **AND** every element using `bg-bg`, `text-fg`, `text-accent`, etc. updates simultaneously without page reload

#### Scenario: AA contrast in both themes

- **GIVEN** the primary text color and background color in either theme
- **WHEN** the contrast ratio is measured per WCAG 2.1 AA
- **THEN** `--color-fg` on `--color-bg` meets ≥ 4.5:1 contrast in both themes
- **AND** `--color-accent` on `--color-bg` meets ≥ 3:1 contrast (large text minimum) in both themes

### Requirement: Starlight Integration Variables

The stylesheet SHALL override the following Starlight CSS custom properties under `:root` and `:root[data-theme="dark"]` so the sidebar, TOC, search modal, and all `doc`-template tool pages inherit the new palette and fonts:

| Starlight variable | Mapped to |
|---------------------|-----------|
| `--sl-font` | `var(--sl-font-mono)` |
| `--sl-font-mono` | `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace` |
| `--sl-color-bg` | `var(--color-bg)` |
| `--sl-color-bg-sidebar` | `var(--color-bg)` |
| `--sl-color-text` | `var(--color-fg)` |
| `--sl-color-text-accent` | `var(--color-accent)` |
| `--sl-color-accent` | `var(--color-accent)` |
| `--sl-color-accent-low` | `var(--color-accent-2)` |
| `--sl-color-accent-high` | `var(--color-accent)` |
| `--sl-color-hairline` | `var(--color-border)` |
| `--sl-color-hairline-light` | `var(--color-border)` |
| `--sl-color-bg-nav` | `var(--color-bg)` |

Both `:root` (light defaults) and `:root[data-theme="dark"]` (dark overrides) blocks SHALL be defined. The list above is the minimum surface; additional Starlight variables MAY be overridden if visual review reveals leakage of the default theme.

#### Scenario: Sidebar adopts the new palette without per-component edits

- **GIVEN** Starlight's left sidebar renders the Tools group
- **WHEN** the page loads in dark mode
- **THEN** the sidebar background is `var(--color-bg)` (#0b0d10)
- **AND** sidebar item text is `var(--color-fg)` or `var(--color-fg-dim)` (matching Starlight's text/text-accent split)
- **AND** the active sidebar item's border/highlight uses `var(--color-accent)`
- **AND** no edits were made to Starlight's sidebar component or template

#### Scenario: Tool subpage inherits typography and palette

- **GIVEN** `/tools/idea/` rendered with the `doc` template
- **WHEN** the page loads
- **THEN** body text uses JetBrains Mono as the active font (verified via computed style)
- **AND** the page background is `var(--color-bg)`
- **AND** no per-file edits were made to `src/content/docs/tools/idea.md` or any sibling tool page

### Requirement: Animation Keyframes in `@theme`

The `@theme` block SHALL declare a `--animate-blink` keyframe-based utility so the H1 cursor flourish animates via a Tailwind utility class (e.g., `animate-blink`) without requiring a component-scoped CSS rule. The keyframe definition MAY include both the `@keyframes blink` rule and the `--animate-blink` token in the `@theme` block — Tailwind v4 treats keyframes declared inside `@theme` as theme-level tokens, not component rules.

#### Scenario: Cursor animation respects reduced-motion preference

- **GIVEN** a visitor with `prefers-reduced-motion: reduce` set
- **WHEN** the home page loads
- **THEN** the H1 cursor element either does not animate, or animates with reduced amplitude
- **AND** the cursor is still visible (a static block) so the visual flourish is preserved without motion

## Typography: Font Loading

### Requirement: JetBrains Mono via `@fontsource`

The site SHALL load JetBrains Mono via the `@fontsource/jetbrains-mono` npm package, with weights 400, 500, 600, and 700 imported. The fontsource CSS files SHALL be registered via `astro.config.mjs` Starlight `customCss` (or imported from `src/styles/global.css` via `@import`, whichever integrates cleanly with Tailwind v4's parser).

#### Scenario: Font is self-hosted, not fetched from Google

- **GIVEN** the built `dist/` directory after `pnpm build`
- **WHEN** I inspect the HTML and network requests
- **THEN** there is no `<link href="https://fonts.googleapis.com/...">` tag
- **AND** the JetBrains Mono `.woff2` files are served from the same origin as the rest of the site

#### Scenario: Font is the active rendering font

- **GIVEN** any page on the site
- **WHEN** the computed `font-family` is inspected on `<body>`
- **THEN** the first available family in the cascade is "JetBrains Mono"
- **AND** the fallback stack is `'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace`

### Requirement: Type Scale

Heading and body type sizes SHALL be implemented via Tailwind size utilities (e.g., `text-3xl`, `text-xl`, `text-base`) in markup, not via custom CSS rules. The approximate scale targets are:

- H1 hero: 32px / weight 600
- H2 section: 20px / weight 600
- H3: 16px / weight 500
- Body: 14px / weight 400
- Small / caption: 12px / weight 400
- Code: 13px / weight 400

Tailwind's default `text-*` utilities map closely to these values; exact pixel matching is not required. The constraint is that the chosen Tailwind utility SHALL be within ±2px of the target.

#### Scenario: Hero title size

- **GIVEN** the rendered home page
- **WHEN** the computed font size of the `<h1>` is measured
- **THEN** it falls in the 30–34px range
- **AND** its computed `font-weight` is 600

## Home Page (`src/content/docs/index.mdx`): Terminal Flourishes

### Requirement: Hero Shellpath Line

The home page hero SHALL include a single-line "shellpath" element above the H1 with content `~/ai.shll.in $ cat README.md` (or equivalent). The path segment `~/ai.shll.in` SHALL render in the secondary accent color (sage), the `$` SHALL render in the secondary accent color, and the command `cat README.md` SHALL render in the dim foreground color. The element SHALL be implemented as a `<p>` (or `<div>`) with inline `<span>` elements using Tailwind utility classes.

#### Scenario: Shellpath renders above the H1

- **GIVEN** the rendered home page
- **WHEN** the DOM order of the hero section is inspected
- **THEN** a small monospace line containing `~/ai.shll.in $ cat README.md` appears before the `<h1>` in document order
- **AND** the `$` character has computed color matching `--color-accent-2`

### Requirement: Blinking Cursor on H1

The H1 hero title SHALL terminate with a blinking block cursor (`█`) element. The cursor SHALL be implemented as an inline `<span>` containing a non-breaking space (or empty content with explicit width), styled via Tailwind utilities to: be `inline-block`, have width ≈ 0.6em, height ≈ 1em, vertical-align baseline or text-bottom, background color `var(--color-accent)`, and animate via the `animate-blink` utility declared in `@theme`.

The cursor SHALL respect `prefers-reduced-motion` — the animation MAY be removed for reduced-motion users, but the cursor element itself SHALL remain visible as a static block.

#### Scenario: Cursor is visible at the end of the H1

- **GIVEN** the rendered home page
- **WHEN** the H1 element is inspected
- **THEN** its last child is a `<span>` rendering as a solid block with computed background `var(--color-accent)`

#### Scenario: Cursor blinks in motion mode

- **GIVEN** a visitor with `prefers-reduced-motion: no-preference` (the default)
- **WHEN** the cursor element is observed for 2 seconds
- **THEN** its visibility or opacity oscillates at approximately 1Hz

#### Scenario: Cursor is static under reduced-motion

- **GIVEN** a visitor with `prefers-reduced-motion: reduce`
- **WHEN** the cursor element is observed
- **THEN** it does not animate (no opacity or visibility changes over time)
- **AND** it remains visible as a solid block

### Requirement: `$` Prompt Prefix on CTAs and Install Commands

Each hero CTA button row SHALL be preceded by a `$` prompt character rendered in the secondary accent color (sage). Each line of the `## Install` code block SHALL begin with `$` followed by a space, where the `$` is rendered in the same color as part of the code block (markdown code-fence rendering — no DOM injection required, the `$` is literal text in the fence content).

#### Scenario: Hero CTA row has `$` prefix

- **GIVEN** the rendered home page
- **WHEN** the hero CTA row is inspected
- **THEN** each CTA `<a>` (or button) element is preceded in document order by a `<span>` containing a `$` character
- **AND** that `<span>` has computed color matching `--color-accent-2`

#### Scenario: Install code block has literal `$` prefixes

- **GIVEN** the `## Install` section's code block in the rendered home page
- **WHEN** the rendered `<code>` content is inspected
- **THEN** each command line begins with literal `$ ` (dollar sign + space)
- **AND** the lines are the existing `brew install ...`, `shll shell-install`, `exec $SHELL` commands

### Requirement: `##` Sage Prefix on H2 Headings

Each H2 heading on the home page (`The loop`, `Install`, `Tools`, `Community`) SHALL be visually prefixed with `##` rendered in the secondary accent color (sage). The `##` SHALL be part of the heading's content (inside the `<h2>` element, in an inline `<span>` styled with Tailwind utilities) so it is read by screen readers as part of the heading text and benefits from semantic heading anchoring.

Alternative implementation MAY use a CSS `::before` pseudo-element via Tailwind arbitrary-value utilities (`before:content-['##_']`), provided the result is identical to the user and accessibility tools.

#### Scenario: H2 visually starts with `##`

- **GIVEN** the rendered home page
- **WHEN** any of the four section H2 headings is inspected
- **THEN** the visual heading begins with `##` followed by a space and the heading label
- **AND** the `##` characters have computed color matching `--color-accent-2`

#### Scenario: H2 anchoring still works

- **GIVEN** the H2 heading "The loop"
- **WHEN** the heading's auto-generated anchor link is followed (or its `id` is inspected)
- **THEN** the anchor `id` is `the-loop` (or whatever Starlight's slugger produces — the `##` characters SHALL NOT pollute the anchor ID)

### Requirement: ASCII Horizontal Rules Between Sections

Where the current `index.mdx` uses implicit section breaks (or where new visual breathing room is needed before `## Install`, `## Tools`, `## Community`), the home page SHALL render an ASCII-style horizontal rule consisting of a row of box-drawing dashes (`────…`) in the faint foreground color.

The rule SHALL be implemented as one of:
- A `<hr>` element with Tailwind utilities `border-0 text-fg-faint before:content-['────────────────────────────────────────────────────────────────────────────']` (arbitrary-value Tailwind utility), or
- A `<div>` with `text-fg-faint overflow-hidden whitespace-nowrap select-none` containing literal `─` characters padded to overflow the container.

The chosen technique SHALL be applied consistently to all rules on the page.

#### Scenario: Rule renders as continuous line of dashes

- **GIVEN** the rendered home page
- **WHEN** any of the section dividers is inspected visually
- **THEN** a single-line row of `─` characters spans the content width
- **AND** the characters' color matches `--color-fg-faint`

#### Scenario: Rule does not break responsive layout

- **GIVEN** the home page viewed at a narrow viewport (e.g., 360px wide)
- **WHEN** the rule is inspected
- **THEN** the rule does not cause horizontal scroll on the page
- **AND** the rule visually fills the available content width

### Requirement: Code Block Corner Label on Install Block

The `## Install` code block SHALL display a small corner badge in the top-right corner with the literal text `bash` (or a similar language label), rendered in the faint foreground color and small caps/uppercase. The badge SHALL be implemented via either: (a) a wrapper `<div>` around the code block with `relative` positioning and an absolutely-positioned `<span>` child carrying the label; or (b) a markdown rehype plugin output if Starlight's markdown renderer already attaches a `data-language` attribute that can be styled via Tailwind utility selectors (e.g., `[data-language]::before`).

If Starlight's default code block rendering does not provide a hook for utility-class styling of the language label, option (a) (wrapper `<div>` in MDX) is the canonical approach.

#### Scenario: Install block shows language badge

- **GIVEN** the rendered home page
- **WHEN** the `## Install` code block is inspected
- **THEN** a small "bash" label is visible in or near the top-right of the code block
- **AND** the label's color matches `--color-fg-faint`

### Requirement: Tools Section as Tree-Branch List

The home page's `## Tools` section SHALL be rendered as a 7-line tree list, replacing the existing `<CardGrid>` and `<Card>` components. The structure for each line SHALL be a 3-column CSS Grid row built from Tailwind utilities:

| Column | Width | Content | Style |
|--------|-------|---------|-------|
| 1 | `~24px` (or `w-6`) | Tree branch character: `├──` for rows 1-6, `└──` for row 7 | `text-fg-faint` |
| 2 | `~80px` (or `w-20`) | Tool name (e.g., `idea`, `hop`) | `text-accent font-semibold` |
| 3 | `1fr` | Tool description, ending with ` [Docs →](/tools/{name}/) · [GitHub →](https://github.com/sahil87/{name})` | `text-fg-dim` |

The seven tools and descriptions SHALL be reproduced verbatim from the current `<Card>` content in `index.mdx`. The `<CardGrid>` and `<Card>` import statements SHALL be removed from the MDX file.

#### Scenario: Seven rows with correct branch characters

- **GIVEN** the rendered home page
- **WHEN** the Tools section is inspected
- **THEN** seven rows appear in order: idea, hop, fab-kit, wt, run-kit, tu, shll
- **AND** rows 1-6 each begin with `├──` and row 7 begins with `└──`

#### Scenario: Tool name links to its subpage

- **GIVEN** any of the seven tool rows
- **WHEN** the tool name is inspected
- **THEN** it is wrapped in an `<a>` element with `href="/tools/{name}/"` (e.g., `/tools/idea/`)
- **AND** its computed color matches `--color-accent`

#### Scenario: Description preserves existing Docs / GitHub links

- **GIVEN** any of the seven tool rows
- **WHEN** the description column is inspected
- **THEN** it contains the exact description text from the current `<Card>` body
- **AND** it ends with two trailing links: `Docs →` (to `/tools/{name}/`) and `GitHub →` (to `https://github.com/sahil87/{name}`)

#### Scenario: Card components are no longer imported

- **GIVEN** the file `src/content/docs/index.mdx` after this change
- **WHEN** I grep for `import.*Card` or `<Card`
- **THEN** zero matches are found
- **AND** the file's import block contains only the `Diagram` import (and any new helpers introduced by this change, if any)

## Diagrams: Loop Diagram Palette

### Requirement: Updated `classDef` Strokes

`src/diagrams/loop.mmd` SHALL have its `classDef` rules updated so node strokes match the new palette:

| Class | Members | Stroke color |
|-------|---------|--------------|
| `tool` | `idea`, `fab`, `rk` | `#d4a73a` (amber) |
| `agent` | `w1`, `w2`, `w3` | `#7cb342` (sage) |
| `ship` | `ship` | `#5eb3b3` (teal) |
| `ambient` | `hop`, `tu` | `#7c8593` (fg-dim grey) |

All other aspects of the mermaid source (flowchart direction, node labels, edge styles, the `&nbsp;` padding hack noted in the existing comment) SHALL be preserved.

#### Scenario: Updated mermaid source

- **GIVEN** the updated `src/diagrams/loop.mmd`
- **WHEN** the four `classDef` lines are inspected
- **THEN** they declare strokes `#d4a73a`, `#7cb342`, `#5eb3b3`, `#7c8593` respectively
- **AND** the rest of the file is unchanged from the prior version

### Requirement: Regenerated SVG Outputs

Both `public/diagrams/loop-light.svg` and `public/diagrams/loop-dark.svg` SHALL be regenerated from the updated `.mmd` source using the existing `mmdc` workflow (documented in `docs/memory/site/diagrams.md`). Both SVG files SHALL be committed.

#### Scenario: Both SVG outputs are present and current

- **GIVEN** the updated `src/diagrams/loop.mmd`
- **WHEN** I inspect `public/diagrams/loop-light.svg` and `public/diagrams/loop-dark.svg`
- **THEN** both files exist
- **AND** both files contain SVG `<rect>` (or `<path>`) elements with stroke colors `#d4a73a`, `#7cb342`, `#5eb3b3`, and `#7c8593` (one stroke per class)
- **AND** the SVG node labels match the labels in the `.mmd` source (`idea`, `fab-kit`, `wt + agent #1`, etc.)

## Build & Dependency Layer

### Requirement: `@fontsource/jetbrains-mono` in `package.json`

`package.json` SHALL list `@fontsource/jetbrains-mono` as a runtime dependency at the latest stable version compatible with the project's Node ≥ 22.12 constraint. The `pnpm-lock.yaml` SHALL be updated correspondingly.

#### Scenario: Dependency is declared

- **GIVEN** `package.json` after this change
- **WHEN** the `dependencies` block is inspected
- **THEN** an entry `"@fontsource/jetbrains-mono": "^5.x.x"` (or current major) is present

#### Scenario: Lockfile is consistent

- **GIVEN** `pnpm-lock.yaml` after this change
- **WHEN** `pnpm install --frozen-lockfile` runs (the CI command)
- **THEN** it exits 0
- **AND** the `node_modules/@fontsource/jetbrains-mono` package resolves

### Requirement: Production Build Succeeds

`pnpm build` SHALL produce a fully static `dist/` directory with no warnings about missing fonts, broken Tailwind utilities, or unresolved imports.

#### Scenario: Build is clean

- **GIVEN** the project at the merge-base of this change
- **WHEN** `pnpm install --frozen-lockfile && pnpm build` is run
- **THEN** the build exits 0
- **AND** no warnings about JetBrains Mono, `@theme`, or Tailwind utility resolution are emitted to stdout/stderr
- **AND** `dist/` contains the home page HTML referencing the new fonts and palette

### Requirement: No New Astro Integrations or Build Plugins

Beyond `@fontsource/jetbrains-mono`, this change SHALL NOT introduce any new Astro integrations, Vite plugins, or build-time transformers. Constitution IV (minimal dependencies) governs.

#### Scenario: Integration list unchanged

- **GIVEN** `astro.config.mjs` after this change
- **WHEN** the `integrations: [...]` array is inspected
- **THEN** it contains only the `starlight(...)` integration as before
- **AND** the `vite.plugins` array contains only `tailwindcss()` as before

## Design Decisions

1. **JetBrains Mono via `@fontsource`, not Google Fonts `<link>`**
   - *Why*: Self-hosted woff2s eliminate a runtime third-party request, give deterministic offline builds, and let the font ship inside the same Cloudflare/GitHub Pages CDN cache as the rest of the site. The dependency cost is one npm package (~120KB across 4 weights).
   - *Rejected*: Google Fonts `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`. Adds a third-party DNS lookup and request to first paint; introduces a runtime dep on Google's CDN; harder to audit network behavior for privacy-conscious visitors.

2. **Tokens in `@theme`, no component classes — flourishes via utilities in markup**
   - *Why*: Constitution III mandates `global.css` contain only the Tailwind import and (optionally) theme tokens. Every "component-style" effect this redesign introduces (prompts, cursor, ASCII rules, tree branches, corner labels) can be expressed as a Tailwind utility composition in markup or via arbitrary-value utilities. No CSS class authoring is required.
   - *Rejected*: Defining `.terminal-cursor`, `.shell-prompt`, etc. as CSS classes in `global.css`. Violates Constitution III; would also fragment styling logic between two files (CSS rules + Tailwind utilities) where one is sufficient.

3. **Starlight CSS variable overrides for chrome (sidebar/TOC/search/tool pages)**
   - *Why*: This is Starlight's documented customization mechanism. Setting `--sl-font`, `--sl-color-bg`, `--sl-color-text`, `--sl-color-accent`, etc. propagates to every Starlight-rendered surface without touching component templates. Tool subpages get the new look "for free" with no per-page edits.
   - *Rejected*: Forking Starlight components to inject our own classes. High maintenance burden, breaks on Starlight upgrades, unnecessary for the visual changes required.

4. **Replace `<CardGrid>` with grid-row tree-list (option B), don't restyle cards**
   - *Why*: User explicitly chose Replace over Restyle. The tree-list directly evokes `tree(1)` output, which is the right metaphor for "seven small CLIs in one toolkit." Restyled cards would have been less distinctive and less on-brand.
   - *Rejected*: Keeping `<CardGrid>` and restyling individual `<Card>` components via deeply nested Tailwind overrides. Visually weaker, fights Starlight's card chrome, and the user said no.

5. **Cursor as inline `<span>` (not Astro component)**
   - *Why*: The cursor is used in exactly one place (the H1). Extracting an Astro component for one use site is over-abstraction. Inline `<span class="...">` keeps the markup local and obvious.
   - *Rejected*: A `<Cursor />` Astro component. Cleaner MDX, but adds a file and a Starlight import for one inline element.

6. **ASCII rule via `<div>` with literal dashes, not `<hr>` with `::before`**
   - *Why*: The literal `<div>` is simpler — no arbitrary-value Tailwind utility, no pseudo-element coordination with `<hr>`'s default borders. Tailwind utilities `overflow-hidden whitespace-nowrap select-none text-fg-faint` give the exact effect with one element and no surprises. The constitutional cost is identical (utilities only, in markup).
   - *Rejected*: `<hr class="before:content-['────...']">` arbitrary-value pseudo-element. Slightly more semantic (`<hr>` is a real horizontal rule), but the arbitrary-value class is verbose, the dashes are repeated literally in source, and `<hr>`'s default `border` styling needs an explicit `border-0` reset which adds noise.

7. **Code block corner label via wrapper `<div>` in MDX (option a from intake)**
   - *Why*: Starlight's markdown code-block rendering does not consistently expose a `data-language` attribute that all themes can rely on for utility-class targeting. A wrapper `<div class="relative">` around the fenced code block, with an absolutely-positioned `<span>` carrying the label, is reliable and uses only Tailwind utilities.
   - *Rejected*: `[data-language="bash"]::before` arbitrary selector. Fragile to Starlight's code-renderer changes and harder to confine to the install block specifically (we don't want this badge on every code block).

## Tasks

### Phase 1: Setup

- [x] T001 Add `@fontsource/jetbrains-mono` dependency to `package.json` and update `pnpm-lock.yaml` via `pnpm add @fontsource/jetbrains-mono` (latest stable v5+).
- [x] T002 Rewrite `src/styles/global.css` so it contains only: (a) the `@fontsource/jetbrains-mono` weight imports (400/500/600/700), (b) `@import "tailwindcss";`, (c) a Tailwind v4 `@theme` block declaring the dark-theme color tokens (`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`, `--color-fg`, `--color-fg-dim`, `--color-fg-faint`, `--color-accent`, `--color-accent-2`, `--color-accent-3`), the `--font-mono` token, the `--animate-blink` token, and the `@keyframes blink` rule; (d) `:root` block with light-mode token overrides plus Starlight CSS variable bindings (`--sl-font`, `--sl-font-mono`, `--sl-color-bg`, `--sl-color-bg-sidebar`, `--sl-color-bg-nav`, `--sl-color-text`, `--sl-color-text-accent`, `--sl-color-accent`, `--sl-color-accent-low`, `--sl-color-accent-high`, `--sl-color-hairline`, `--sl-color-hairline-light`); (e) `:root[data-theme="dark"]` block re-binding the same Starlight variables to the dark color tokens. NO `.classname { ... }` rules.

### Phase 2: Core Implementation

- [x] T003 [P] Update `src/diagrams/loop.mmd` `classDef` strokes: `tool` → `#d4a73a`, `agent` → `#7cb342`, `ship` → `#5eb3b3`, `ambient` → `#7c8593`. Preserve all other content (flowchart direction, labels, `&nbsp;` padding hack, edge styles).
- [x] T004 [P] Regenerate `public/diagrams/loop-light.svg` via `npx -y -p @mermaid-js/mermaid-cli mmdc -i src/diagrams/loop.mmd -t default -o public/diagrams/loop-light.svg`.
- [x] T005 [P] Regenerate `public/diagrams/loop-dark.svg` via `npx -y -p @mermaid-js/mermaid-cli mmdc -i src/diagrams/loop.mmd -t dark -b transparent -o public/diagrams/loop-dark.svg`.
- [x] T006 Rewrite `src/content/docs/index.mdx`: (a) replace the Starlight `hero:` actions/tagline frontmatter with a leaner frontmatter retaining `template: splash` and `title` only (so Starlight's default hero is suppressed); (b) remove the `Card`/`CardGrid` imports; keep the `Diagram` import; (c) build a custom hero block with: shellpath line `~/ai.shll.in $ cat README.md` (sage path, sage `$`, dim command), an `<h1>` containing the title text plus a trailing `<span>` blinking cursor (`animate-blink`, `motion-reduce:animate-none`, sized via Tailwind utilities), a tagline paragraph, two CTA rows each prefixed with `<span class="text-accent-2 font-semibold">$</span>` linking to `#install` and `/tools/`; (d) ensure H2 headings render as `## <span class="text-accent-2">##</span> The loop` style (MDX inline HTML inside the markdown heading); (e) replace `<CardGrid>`/`<Card>` with seven `<div class="grid grid-cols-[1.5rem_5rem_1fr] gap-3">` rows using `├──` (rows 1-6) and `└──` (row 7) in column 1 (text-fg-faint), tool name link in column 2 (text-accent font-semibold), description plus `Docs →` and `GitHub →` links in column 3 (text-fg-dim); (f) wrap the install fenced code block in a `<div class="relative">` with an absolutely positioned `<span>` reading `bash` (text-fg-faint, small/uppercase); (g) include literal `$ ` prefixes in install command lines (already present); (h) insert ASCII rule `<div class="text-fg-faint overflow-hidden whitespace-nowrap select-none" aria-hidden="true">────────────────────────────────────────────────────────────────────────────────────</div>` before `## Install`, `## Tools`, and `## Community`.

### Phase 3: Integration & Edge Cases

- [x] T007 Verify dark-mode default: Starlight's default is set via `defaultLocale` and theme persistence — check Starlight's behavior on first load. If light is default, the spec's "dark is default" requirement needs Starlight config (e.g., a `head:` script setting `data-theme="dark"` if unset). Confirm and document.
- [x] T008 Verify cursor `motion-reduce:animate-none` (or `motion-safe:animate-blink`) keeps the cursor visible but static under `prefers-reduced-motion: reduce`.
- [x] T009 Verify ASCII rule does not cause horizontal scroll at narrow viewport — the `overflow-hidden` + container width should clip the dashes.
- [x] T010 Run `pnpm build` to confirm production build succeeds with no Tailwind/font/import warnings.

### Phase 4: Polish

- [x] T011 Spot-check both `public/diagrams/loop-light.svg` and `public/diagrams/loop-dark.svg` contain the new stroke colors (`grep -c '#d4a73a\|#7cb342\|#5eb3b3\|#7c8593'`) and preserve labels (`fab-kit&nbsp;`, `wt + agent #1`, etc. survive intact).

## Execution Order

- T001 must precede T002 (lockfile must include fontsource before global.css imports its CSS).
- T003 must precede T004 and T005 (mermaid source must be updated before SVG regeneration).
- T004 and T005 can run in parallel (independent output files, same input).
- T006 can run in parallel with T003–T005 (independent files).
- T007–T009 run after T002 and T006 (depend on global.css + MDX changes).
- T010 runs after T001–T006.
- T011 runs after T004–T005.

## Acceptance

### Functional Completeness

- [x] A-001 Tokens-only stylesheet: `src/styles/global.css` contains only `@import` directives, the `@theme {}` block, and `:root` / `:root[data-theme="dark"]` variable-override blocks — `grep -E "^\.[a-zA-Z]" src/styles/global.css` returns zero matches (verified).
- [x] A-002 Dark-theme color tokens: All ten dark-mode `--color-*` tokens (via `--c-*` proxies) bound to the exact hex values from spec — verified in `src/styles/global.css:58-68`.
- [x] A-003 Light-theme color tokens: `:root` overrides bind the light-mode values — verified in `src/styles/global.css:30-40`.
- [x] A-004 Starlight integration variables: All 12 Starlight CSS variables bound under both `:root` (lines 43-54) and `:root[data-theme="dark"]` (lines 71-80). Note: `--sl-font` and `--sl-font-mono` are only bound in the `:root` block since they don't change between themes — acceptable per spec ("minimum surface").
- [x] A-005 Animation keyframes: `@theme` declares `--animate-blink` and embeds `@keyframes blink` rule (lines 23-26); compiled CSS at `dist/_astro/common.Cl5TO8pn.css` shows `content:"##` rule and the animation resolves at build time.
- [x] A-006 JetBrains Mono is loaded via `@fontsource/jetbrains-mono` — 36 woff2 files emitted to `dist/_astro/`; zero `fonts.googleapis.com` references in built HTML (verified `grep -c "fonts.googleapis.com" dist/index.html` returns 0).
- [x] A-007 Type scale: H1 uses `text-3xl` (1.875rem = 30px) — within ±2px of 32px target. H2/H3/body/code/caption all inherit Starlight defaults plus utility overrides as needed.
- [x] A-008 Hero shellpath line `~/ai.shll.in $ cat README.md` appears **above** the `<h1>` in document order. Resolved in rework cycle 1: replaced the custom MDX hero block with a Starlight `Hero` component override (`src/components/Hero.astro` registered via `astro.config.mjs` `components`). The override emits the canonical single `<h1 id="_top" data-page-title>` Starlight expects, with the shellpath rendered as a `<p>` above it and the blinking cursor as a `<span>` inside it.
- [x] A-009 H1 cursor: trailing `<span class="inline-block ml-1 align-text-bottom bg-accent animate-blink motion-reduce:animate-none w-[0.6em] h-[1.1em]">` is present inside the canonical `<h1 id="_top">` — verified in `src/components/Hero.astro:32-34` and in rendered `dist/index.html` H1.
- [x] A-010 CTA `$` prefix: each hero CTA `<a>` is preceded by `<span class="text-accent-2 font-semibold">$</span>` — verified at `src/components/Hero.astro:45` (rendered once per `actions[]` entry from frontmatter; two CTAs total).
- [x] A-011 Install code-block `$` prefix: each command line begins with literal `$ ` — verified at `src/content/docs/index.mdx:41-43` and in built `dist/index.html`.
- [x] A-012 H2 sage `##` prefix: each H2 uses `before:content-['##_'] before:text-accent-2 before:mr-1` — verified for `the-loop`, `install`, `tools`, `community` at `src/content/docs/index.mdx:23,35,52,66`. Pseudo-element technique chosen over inline span; spec explicitly allows this ("Alternative implementation MAY use a CSS `::before` pseudo-element via Tailwind arbitrary-value utilities").
- [x] A-013 ASCII rule: `<HRule />` component (`src/components/HRule.astro`) renders `<div class="text-fg-faint overflow-hidden whitespace-nowrap select-none my-6" aria-hidden="true">───…</div>` — instantiated four times in `src/content/docs/index.mdx` (lines 21, 33, 50, 64) before `## The loop`, `## Install`, `## Tools`, `## Community`.
- [x] A-014 Install code-block corner label: wrapper `<div class="relative">` with absolutely-positioned `<span>` carrying `bash` — verified at `src/content/docs/index.mdx:37-46`.
- [x] A-015 Tools tree-list: seven rows in order (idea, hop, fab-kit, wt, run-kit, tu, shll); rows 1-6 use `├──`, row 7 uses `└──`; each name links to `/tools/{name}/`; descriptions end with `Docs →` and `GitHub →` — verified in rendered HTML (6× `├──`, 1× `└──`).
- [x] A-016 `<CardGrid>` and `<Card>` are not imported — `grep -E "<Card|CardGrid|import.*Card" src/content/docs/index.mdx` returns zero matches.
- [x] A-017 Loop diagram `classDef` strokes updated: `tool→#d4a73a`, `agent→#7cb342`, `ship→#5eb3b3`, `ambient→#7c8593` — verified at `src/diagrams/loop.mmd:16-19`.
- [x] A-018 SVG outputs exist and contain new strokes: each of `#d4a73a`, `#7cb342`, `#5eb3b3` appears 3× and `#7c8593` appears 2× in both `loop-light.svg` and `loop-dark.svg`.
- [x] A-019 `@fontsource/jetbrains-mono`: `"^5.2.8"` in `package.json` dependencies; `pnpm-lock.yaml` updated (+8 lines).
- [x] A-020 `pnpm build` exits 0 cleanly — 10 pages built in 3.33s, no Tailwind/font/import warnings.
- [x] A-021 `astro.config.mjs` integrations array contains only `starlight(...)`; `vite.plugins` contains only `tailwindcss()` — verified unchanged.

### Behavioral Correctness

- [x] **N/A**: A-022 Theme toggle requires runtime browser interaction; the structural prerequisite (`:root` light tokens + `:root[data-theme="dark"]` dark tokens both defined) is satisfied. Visual confirmation in browser is out of scope for this build-only review.
- [x] **N/A**: A-023 Tool subpage inheritance requires runtime visual inspection; the structural prerequisite (Starlight CSS variables bound to `--c-*` tokens) is satisfied. Build succeeds for `/tools/idea/` etc.
- [x] A-024 H2 anchor IDs are clean (`the-loop`, `install`, `tools`, `community`) — verified in `dist/index.html`. The inline `<h2 id="...">` syntax in MDX bypasses Starlight's slugger entirely and produces deterministic IDs, but **also loses Starlight's auto-injected `sl-anchor-link` button** (the chain-icon link that appears on H2s in tool subpages). See should-fix #1.

### Scenario Coverage

- [x] A-025 Scenario "Constitutional compliance": confirmed zero class-selector matches.
- [x] A-026 Scenario "Theme tokens are utility-class accessible": `text-accent`, `bg-bg`, `border-border`, `text-fg-dim`, etc. resolve at build time (rendered HTML shows them attached to elements; build is clean).
- [x] A-027 Scenario "Hero CTA row has `$` prefix": confirmed — `grep -c 'class="text-accent-2 font-semibold">\$' dist/index.html` returns 3 (one in the shellpath line + one before each of the two CTAs).
- [x] A-028 Scenario "Install code block has literal `$` prefixes": confirmed via expressive-code rendering shows `$` token at the start of each of the 3 command lines.
- [x] A-029 Scenario "Seven rows with correct branch characters": confirmed (6× `├──`, 1× `└──`).
- [x] A-030 Scenario "Tool name links to its subpage": confirmed — all 7 hrefs match `/tools/{name}/`.
- [x] A-031 Scenario "Description preserves existing Docs / GitHub links": confirmed — each description ends with `Docs →` to `/tools/{name}/` and `GitHub →` to `https://github.com/sahil87/{name}`.
- [x] A-032 Scenario "Card components are no longer imported": confirmed.
- [x] A-033 Scenario "Updated mermaid source": classDef strokes match spec values.
- [x] A-034 Scenario "Both SVG outputs are present and current": both files contain new strokes.
- [x] A-035 Scenario "Build is clean": `pnpm build` exits 0.

### Edge Cases & Error Handling

- [x] A-036 Cursor under `prefers-reduced-motion: reduce` does not animate (`motion-reduce:animate-none` applied) but remains visible (the `<span>` keeps `bg-accent w-[0.6em] h-[1.1em]`) — verified in MDX and rendered HTML.
- [x] A-037 ASCII rule at narrow viewport: `overflow-hidden whitespace-nowrap` clips dashes to container width — structurally correct (visual confirmation would require browser).
- [x] A-038 AA contrast: `--fg` on `--bg` = 14.16:1 dark / 13.34:1 light (both ≥ 4.5); `--accent` on `--bg` = 8.70:1 dark / 3.53:1 light (both ≥ 3). `--fg-dim` and `--accent-2/3` also clear AA. `--fg-faint` is 2.46:1 / 2.47:1 — used only on aria-hidden decorative ASCII rules, so AA not required.

### Code Quality

- [x] A-039 Readability: hero markup now lives in `src/components/Hero.astro` (61 lines, single-purpose, prop-only); `index.mdx` is shorter and reads top-to-bottom as the four document sections; tree-list grid utility lives once in `src/components/ToolRow.astro`.
- [x] A-040 Pattern consistency: existing `Diagram.astro` component is the precedent for small prop-only Astro components built from Tailwind utilities; rework cycle 1 follows the same pattern with `Hero.astro`, `HRule.astro`, `ToolRow.astro`. All use Tailwind utilities only — no class-based CSS introduced anywhere.
- [x] A-041 No unnecessary duplication: blink keyframe and tokens declared once in `global.css` `@theme`; ASCII rule literal (120-char dash string + utility chain) lives once in `HRule.astro`; tree-row grid utility chain lives once in `ToolRow.astro`. The H2 `before:content-['##_'] before:text-accent-2 before:mr-1` utility chain is still repeated four times inline (one per H2) — acceptable since it's a one-token attribute string on a markdown-native element.
- [x] A-042 No god functions: `global.css` is 82 lines; `Hero.astro` is 62 lines; `HRule.astro` is 16 lines; `ToolRow.astro` is 34 lines. All within the 50-line guideline modulo `Hero.astro`, which is justified by the four distinct hero sub-blocks (shellpath / H1+cursor / tagline / CTAs).
- [x] A-043 No magic numbers: hex values in `loop.mmd` `classDef` lines correspond directly to spec tokens; `global.css` hex values match the spec tables verbatim. No comments explaining each color but they're self-documenting via the surrounding context.

## Notes

- This project has no automated tests (`grep -r "vitest\|jest\|playwright" package.json` confirms none). Validation is via `pnpm build` plus the review stage (visual + structural inspection). The `test-alongside` strategy in `code-quality.md` is therefore not applicable to this purely-visual change.
- Constitution III is the binding constraint: every flourish (cursor, prompts, hashes, ASCII rules, corner label, tree branches) lives as Tailwind utilities in markup, NOT as class rules in `global.css`.
- Constitution V (dark mode parity) is satisfied by declaring both `:root` (light) and `:root[data-theme="dark"]` (dark) variable blocks; Tailwind utilities consume the tokens uniformly.
- Constitution IV (minimal dependencies) is satisfied by adding exactly one dependency (`@fontsource/jetbrains-mono`); no other build plugins or Astro integrations are introduced.

### Design Decision: Starlight `Hero` component override

The spec calls for: (a) a shellpath line above the title, (b) a blinking cursor inside the H1, (c) `$` prefixes before each CTA. Starlight's `hero:` frontmatter renders a fixed template — it does not support inline HTML in `title`, nor siblings before the H1, nor prefix content on action buttons. Initial apply built a custom MDX hero in `index.mdx`, but this produced two `<h1>` elements (Starlight's splash template still auto-injected `<h1 id="_top">` from `title:` frontmatter, alongside the custom MDX `<h1>`) and invalid HTML nesting (`<h1><p>...</p></h1>`).

Rework cycle 1 replaced the MDX hero with a **Starlight component override**: `astro.config.mjs` registers `components: { Hero: './src/components/Hero.astro' }`, which Starlight uses in place of its default `Hero` component when `hero:` frontmatter is present. Our `Hero.astro` reads `title`, `tagline`, and `actions` from the page's `hero:` frontmatter and renders a single canonical `<h1 id="_top" data-page-title>` (the Starlight contract) with the shellpath as a sibling `<p>` above and the cursor as a `<span>` inside. CTAs render as Tailwind-styled `<a>` elements, each preceded by a `<span class="text-accent-2 font-semibold">$</span>` prompt. This is the documented Starlight extension point — Constitution III remains satisfied (no class-based CSS rules; only Tailwind utilities in markup).

### Design Decision: HRule and ToolRow components

The initial apply repeated identical Tailwind utility chains across four ASCII rules and seven tree rows (~330 chars duplicated 4× and ~250 chars duplicated 7× respectively). Outward-review flagged this as a should-fix per Constitution-III spirit ("components are allowed; CSS classes are not"). Rework cycle 1 extracted `src/components/HRule.astro` and `src/components/ToolRow.astro` — small prop-only Astro components built from Tailwind utilities. Net effect: `index.mdx` is shorter and the redundant utility strings live in one place each. No CSS classes introduced; Constitution III still satisfied.

## Deletion Candidates

- None remaining after rework cycle 1 (re-verified in review). The original deletion candidate (duplicate `<h1>` from competing splash template + custom MDX hero) was resolved by the Starlight `Hero` component override. `<CardGrid>` / `<Card>` imports were removed during initial apply; no stale imports or unused code remain in `src/content/docs/index.mdx`, `astro.config.mjs`, or the three new components (`Hero.astro`, `HRule.astro`, `ToolRow.astro`).
