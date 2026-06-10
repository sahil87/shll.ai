# Spec: Terminal Skin

**Change**: 260517-pdsp-terminal-skin
**Created**: 2026-05-17
**Affected memory**: `docs/memory/site/styling.md`, `docs/memory/site/site-architecture.md`, `docs/memory/site/diagrams.md`

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

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Approach is Option 2 "terminal-skinned" — mono everywhere + amber/sage/teal palette + terminal flourishes, with Starlight chrome preserved. | Confirmed from intake #1 — user explicitly chose Option 2 over Options 1 and 3 after reviewing the mockup comparison. | S:95 R:80 A:90 D:95 |
| 2 | Certain | Primary font is JetBrains Mono, loaded via `@fontsource/jetbrains-mono` (weights 400/500/600/700). | Confirmed from intake #2 + #10. Tentative status on load mechanism is upgraded to Certain in this spec — see Design Decision #1. | S:90 R:85 A:90 D:90 |
| 3 | Certain | Exact dark + light token hex values per the Color Tokens tables. | Confirmed from intake #3 — user reviewed swatches in the mockup. | S:95 R:75 A:90 D:95 |
| 4 | Certain | Blinking cursor on H1 is KEPT (not skipped). | Confirmed from intake #4 — explicit user pick. Reduced-motion behavior added in this spec. | S:95 R:90 A:85 D:95 |
| 5 | Certain | `<CardGrid>` is REPLACED by a tree-branch grid list (not restyled cards). | Confirmed from intake #5 — explicit user pick. Spec defines the exact 3-column grid and links/colors. | S:95 R:60 A:90 D:95 |
| 6 | Certain | Loop diagram is regenerated NOW with the new palette (not deferred). | Confirmed from intake #6 — explicit user pick. Specific `classDef` color mapping locked in. | S:95 R:80 A:90 D:95 |
| 7 | Certain | Constitution III is respected: `global.css` contains only `@import` + `@theme` tokens + Starlight CSS variable overrides under `:root` selectors. Zero component-scoped CSS rules. | Confirmed from intake #7. Codified as the first formal requirement of this spec ("Tokens-Only Stylesheet"). | S:95 R:90 A:95 D:95 |
| 8 | Certain | Tool subpages are NOT individually edited — they inherit via Starlight CSS variable overrides. | Confirmed from intake #8. Codified as a scenario under "Starlight Integration Variables". | S:95 R:80 A:95 D:95 |
| 9 | Certain | `docs/memory/conventions/tool-page-rubric.md` is NOT modified. | Confirmed from intake #9 — rubric describes individual page shape, which is unchanged. Memory deltas restricted to `site/styling`, `site/site-architecture`, `site/diagrams`. | S:90 R:85 A:95 D:90 |
| 10 | Certain | The `$` prompt and `##` hash are inline `<span>` elements (or arbitrary-value `before:content-['##_']` utility) — not separate Astro components. | Confirmed from intake #11. Design Decision #5 codifies the reasoning. | S:75 R:90 A:85 D:80 |
| 11 | Certain | Tree-list is implemented as CSS Grid rows (3-column: branch / name / desc), built from Tailwind utilities directly in MDX. | Confirmed from intake #12. Spec defines exact column widths and roles. | S:80 R:85 A:90 D:85 |
| 12 | Certain | Mermaid `classDef` colors map: tool→amber, agent→sage, ship→teal, ambient→fg-dim grey. | Confirmed from intake #13. Spec codifies the exact mapping in the diagram requirement. | S:80 R:90 A:85 D:85 |
| 13 | Certain | Cursor respects `prefers-reduced-motion` (animation suppressed, cursor remains visible as static block). | Confirmed from intake #14 + scenario in this spec. | S:75 R:95 A:95 D:90 |
| 14 | Certain | ASCII rule is implemented as a `<div>` with literal `─` characters and Tailwind utilities `overflow-hidden whitespace-nowrap select-none text-fg-faint`. | Upgraded from intake #15 Tentative → Certain via Design Decision #6. The `<div>` form is simpler than the pseudo-element alternative; constitutional cost is identical. | S:75 R:90 A:85 D:80 |
| 15 | Certain | Code-block corner label is implemented as a wrapper `<div class="relative">` around the fenced code block with an absolutely-positioned `<span>`. | Upgraded from intake #16 Tentative → Certain via Design Decision #7. Wrapper approach is more reliable than relying on a `data-language` attribute that Starlight may not expose. | S:70 R:80 A:85 D:80 |
| 16 | Certain | Light-mode tokens use `:root` defaults; dark-mode overrides use `:root[data-theme="dark"]` — matching Starlight's default theme-toggle attribute. | Verified against `docs/memory/site/styling.md` (Starlight's dark-mode toggle sets `data-theme="dark"` on `<html>`). | S:90 R:90 A:95 D:90 |
| 17 | Certain | AA contrast is verified at review time for `--fg`/`--bg` and `--accent`/`--bg` in both themes. | Color values chosen specifically with AA in mind; ratios will be confirmed during review against scenario "AA contrast in both themes". | S:80 R:85 A:90 D:85 |
| 18 | Confident | Starlight CSS variable surface list (12 variables) is sufficient — full surface coverage is verified empirically during apply by visually checking every Starlight surface in both themes. | The 12 variables cover bg, text, accent, hairline, font-family for both light and dark. If additional variables leak default values during apply, they can be added without spec churn. | S:65 R:90 A:80 D:75 |
| 19 | Confident | Type scale uses Tailwind default `text-*` utilities mapped within ±2px of the target pixel sizes (e.g., `text-3xl` for H1, `text-xl` for H2, `text-base` for body). | Tailwind's defaults are close enough to the targets that pixel-perfect matching isn't required. Confirmed via mockup review. | S:65 R:90 A:85 D:80 |
| 20 | Confident | Animation keyframes (`@keyframes blink`) declared inside `@theme` are accepted by Tailwind v4's parser as theme-level constructs. | Tailwind v4 docs cover the `--animate-*` token pattern; the actual `@keyframes` rule sits adjacent in `@theme`. If parsing rejects this layout during apply, a CSS-layer fallback is available — but constitutional cost shifts. Verify during apply. | S:60 R:75 A:75 D:75 |
| 21 | Confident | The H1 "shellpath" text is `~/ai.shll.in $ cat README.md` exactly as shown in the mockup (not parameterized or generated from page metadata). | Hardcoded literal matches the mockup; any future variant (e.g., per-page shellpath) is out of scope. | S:80 R:90 A:90 D:85 |
| 22 | Confident | The blinking cursor blink rate is ≈1Hz (matches mockup's `animation: blink 1.1s steps(2, start) infinite`). | Mockup-defined value; minor variance is fine. | S:70 R:95 A:90 D:80 |

22 assumptions (17 certain, 5 confident, 0 tentative, 0 unresolved).

<!-- Merged into plan.md ## Requirements on 2026-06-03 — safe to delete. -->
