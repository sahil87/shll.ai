# Plan: Homepage Newcomer Content

**Change**: 260610-ld0j-homepage-newcomer-content
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Homepage: "What is this" block

#### R1: Real-prose about block with `cat ABOUT.md` motif
The homepage (`sites/astro-starlight-terminal1/src/content/docs/index.mdx`) SHALL gain a "what is this" section placed after the interactive terminal/prompt and before the tools grid. It MUST consist of a terminal-styled motif line (`$ cat ABOUT.md` in the existing `.shell-session`/`.shell-caption` idiom) followed by 2–4 sentences of real, wrapping HTML prose — NOT inside a `<pre>`, NOT an image. The copy MUST be lifted/adapted from `getting-started/overview.md` (and MAY draw from `getting-started/philosophy.md`) and MUST answer: what is this, who is it for, what's the payoff.

- **GIVEN** a first-time visitor (or crawler) loads the built homepage
- **WHEN** they scroll past the terminal window
- **THEN** they encounter 2–4 sentences of selectable, indexable HTML text explaining the toolkit (seven small CLIs, independent + brew-installable, compose into an idea→merged-PR pipeline, built for running multiple agents in parallel)
- **AND** the prose wraps normally and is readable by screen readers (semantic `<p>` markup)

### Homepage: `ls tools/` grid

#### R2: Seven tool links with command-free one-liners
The homepage SHALL gain an `ls tools/`-styled listing with exactly seven entries — `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll` — each a real HTML link to `/tools/<tool>/overview/` plus one descriptive line at the "what it's for" level, sourced from each tool's existing overview framing. The one-liners MUST NOT name any commands or flags (vn39 hard rule for hand-written prose, constitution Tool-Page Depth) — they name no commands/flags at all. The listing MUST be real HTML rows (list + link + text), only *styled* as terminal directory-listing output.

- **GIVEN** the built homepage
- **WHEN** the tools section renders
- **THEN** seven `<a href="/tools/<tool>/overview/">` links exist with keyword-rich one-liner descriptions
- **AND** no one-liner contains a command invocation or flag token
- **AND** the entry label for run-kit is `run-kit` (the route/section name — the `rk` binary identity applies only to typed/printed CLI tokens, per the jf3q naming rule)

### Homepage: Loop-diagram prose

#### R3: Real prose adjacent to the loop diagram
The loop diagram section SHALL carry 1–3 sentences of real HTML prose adjacent to the diagram, explaining the loop (one idea fans out into parallel agents, converges into one dashboard; which tools sit inside the loop vs. around it). This satisfies the constitution's Accessibility SHOULD ("decorative diagrams SHOULD have a textual explanation adjacent"). The two existing comment-styled one-worder link lines are REPLACED by this prose, which carries the same seven tool links inline (avoids duplicating 7 links twice within one viewport). The `# the loop — …` caption line above the diagram stays.

- **GIVEN** the built homepage
- **WHEN** a screen-reader user (or any user) reaches the loop diagram
- **THEN** adjacent real prose explains what the diagram depicts, naming the inside-the-loop tools (idea, fab-kit, wt, run-kit) and the around-it tools (hop, tu, shll) as links

### Homepage: Install one-liner

#### R4: Visible copyable install commands, verbatim from install.md
The homepage SHALL gain a visible install section showing the brew install command exactly as documented in `getting-started/install.md` — `brew install sahil87/tap/shll` followed by `shll install` — as selectable/copyable shell lines (the `$` prompt span is already `user-select: none`, so selection copies only the command). The commands MUST be verbatim from `install.md` (verified during apply: lines 7–8) — not invented. A comment-styled link to `/getting-started/install/` for full steps SHOULD accompany it. The hero "Install everything" CTA stays.

- **GIVEN** a visitor who scrolls instead of clicking the hero CTA
- **WHEN** they reach the install section
- **THEN** they can select and copy `brew install sahil87/tap/shll` and `shll install` without grabbing the `$` prompt glyphs
- **AND** both commands byte-match the quick-start in `getting-started/install.md`

### Homepage: Theming, constraints & preservation

#### R5: Terminal theming, dark-mode parity, zero deps, zero client JS
All new sections MUST be styled within the existing terminal theme using only the existing `--c-*` custom-property palette in `src/styles/terminal.css` (dark-mode parity, Constitution V). The change MUST add zero new dependencies (Constitution VI), zero client JS, and remain fully static (Constitution I). New links MUST be keyboard-navigable with visible focus states — reusing/extending the existing `.shell-session a` link treatment (accent + dotted underline; solid underline + surface tint on hover/focus-visible).

- **GIVEN** the built site in either color theme
- **WHEN** the new sections render
- **THEN** all colors resolve from `--c-*` variables (both themes correct), `package.json` is unchanged, and no new `<script>` is introduced
- **AND** tabbing through the new links shows a visible focus state on each

#### R6: Existing sections preserved; section order
The hero, terminal install animation, interactive prompt (`TerminalPrompt`), `VersionTable`, loop diagram, and Discord footer line MUST remain functionally as-is (additive change). Final section order MUST be: hero → terminal window + prompt → what-is-this → tools grid → loop diagram with prose → install one-liner → Discord.

- **GIVEN** the modified `index.mdx`
- **WHEN** compared with the previous version
- **THEN** the hero frontmatter, terminal-window block, `<TerminalPrompt />`, `<Diagram …/>`, and Discord line are unchanged, and the new sections appear in the specified order

### Non-Goals

- Meta tags, OG card, homepage `<title>` — shipped by sibling change `260610-kb1r-seo-sharing-fixes`
- Changes to getting-started pages, tool pages, or the interactive terminal's command set (no `cat ABOUT.md` command added to the island)
- The variant site (`astro-tailwind-terminal1`) and `_playground/`
- A copy-to-clipboard button (would require client JS — selection-copy is the affordance)

### Design Decisions

1. **Prose lives in `not-content`-wrapped semantic HTML, styled by two new `terminal.css` classes (`.home-prose`, `.tools-listing`)** — *Why*: the splash page's established idiom is `not-content` blocks fully styled by `terminal.css`; Starlight's article styling would fight the terminal look. — *Rejected*: a new Astro component (no reuse case yet; pure content + CSS suffices per intake).
2. **Extend the existing `.shell-session a` link rules to the new containers rather than duplicating them** — *Why*: single source for the terminal link treatment incl. focus state (code-quality: reuse over duplication). — *Rejected*: per-class copies (drift risk).
3. **Replace the two comment-styled one-worder lines with linked prose** — *Why*: intake allows replace-or-augment; keeping both would render the same seven links twice back-to-back. The prose carries the links, so internal-link value is preserved. — *Rejected*: keeping both (redundant link block).

## Tasks

### Phase 1: Setup

- [x] T001 Add `ld0j` homepage styles to `sites/astro-starlight-terminal1/src/styles/terminal.css`: `.home-prose` (wrapping prose block, `--c-*` colors, readable measure), `.tools-listing` (grid rows: name column + dim description, mobile stack), and extend the `.shell-session a` / `:hover, :focus-visible` selector groups to cover `.home-prose a` and `.tools-listing a` <!-- R5 -->

### Phase 2: Core Implementation

- [x] T002 Add the "what is this" section to `sites/astro-starlight-terminal1/src/content/docs/index.mdx` after `<TerminalPrompt />`/`<hr />`: `$ cat ABOUT.md` caption + `.home-prose` block with 2–4 sentences lifted from `getting-started/overview.md`/`philosophy.md` <!-- R1 -->
- [x] T003 Add the `ls tools/` grid to `index.mdx` after the about block: `$ ls tools/` caption + `.tools-listing` with seven `/tools/<tool>/overview/` links and command-free one-liners adapted from the intake/tool overviews <!-- R2 -->
- [x] T004 Replace the two comment-styled one-worder lines under the loop diagram in `index.mdx` with a `.home-prose` paragraph (1–3 sentences, inside-vs-around framing, seven inline tool links); keep the `# the loop — …` caption above the diagram <!-- R3 -->
- [x] T005 Add the install section to `index.mdx` after the diagram prose: caption + `.shell-session` block with `brew install sahil87/tap/shll` and `shll install` verbatim from `getting-started/install.md`, plus a comment line linking to `/getting-started/install/` <!-- R4 -->

### Phase 3: Integration & Edge Cases

- [x] T006 Build the live site (`cd sites/astro-starlight-terminal1 && npm run build`) and verify the built homepage HTML: new prose present as real text outside `<pre>`, seven overview links, install commands byte-match install.md, hero/terminal/prompt/Discord intact, no new `<script>`, `package.json` unchanged <!-- R5, R6 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: The built homepage contains a `$ cat ABOUT.md` motif followed by 2–4 sentences of real HTML prose (semantic `<p>`, not inside `<pre>`, not an image) answering what/who/payoff, lifted from existing getting-started copy
- [x] A-002 R2: The built homepage contains exactly seven tool entries linking to `/tools/{idea,hop,fab-kit,wt,run-kit,tu,shll}/overview/`, each with a one-liner; no one-liner names a command or flag
- [x] A-003 R3: Real prose (1–3 sentences) sits adjacent to the loop diagram explaining the loop and the inside/around tool split; the comment-styled one-worder lines are replaced by it
- [x] A-004 R4: The homepage shows `brew install sahil87/tap/shll` and `shll install` exactly as in `getting-started/install.md`, selectable without the `$` prompt glyph, with a link to the full install page

### Behavioral Correctness

- [x] A-005 R6: Hero frontmatter, terminal-window animation block, `<TerminalPrompt />`, `<VersionTable />`, `<Diagram />`, and the Discord footer line are unchanged; section order is hero → terminal → about → tools grid → diagram+prose → install → Discord

### Scenario Coverage

- [x] A-006 R5: All new CSS uses only existing `--c-*` custom properties (no hardcoded theme colors), so both themes render correctly
- [x] A-007 R5: New links are keyboard-reachable and show a visible `:focus-visible` state (shared shell-link treatment); prose is real text in semantic markup

### Edge Cases & Error Handling

- [x] A-008 R5: Zero new dependencies (`package.json` untouched), zero client JS added, `npm run build` succeeds with fully static output

### Code Quality

- [x] A-009 Pattern consistency: New markup follows the page's existing idioms (`not-content`, `.shell-session`/`.shell-caption` captions, trailing-slash internal links); CSS follows terminal.css's commented-section style
- [x] A-010 No unnecessary duplication: Link styling extends the existing `.shell-session a` rules instead of duplicating them; no magic colors outside the `--c-*` palette

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change adds new functionality without making existing code redundant. (The two comment-styled one-worder link lines under the loop diagram were already removed *by* this change per R3 — verified absent from `index.mdx` and `dist/index.html` — leaving no further redundant code behind.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Replace (not augment) the two comment-styled one-worder lines with the new diagram prose, which carries the same seven links inline | Intake explicitly allows "replace/augment"; keeping both would duplicate seven links twice back-to-back; link equity preserved | S:70 R:90 A:85 D:70 |
| 2 | Confident | Install section shows the two verbatim quick-start lines (`brew install sahil87/tap/shll`, `shll install`) rather than a single invented `&&` chain | Intake forbids inventing the command; install.md presents them as separate lines; both verified present (`shll install` confirmed in `help/shll.json`) | S:75 R:90 A:90 D:80 |
| 3 | Confident | New sections are plain HTML in `index.mdx` styled by `terminal.css` classes — no new presentational component | Intake says "possibly a small presentational component … if the tools grid warrants one"; a 7-row list used once does not warrant a component; trivially extractable later | S:70 R:90 A:85 D:75 |
| 4 | Confident | Copy-to-clipboard is selection-based only (prompt glyph `user-select: none`), no copy button | Zero-client-JS constraint rules out a button; existing `.shell-prompt` already opts out of selection | S:75 R:90 A:90 D:85 |
| 5 | Certain | fab-kit one-liner names artifacts/stages ("constitution, intake, plan, review"), never command invocations or flags | vn39 hard rule scopes to commands/flags; these are pipeline concepts from the intake's own starting copy | S:85 R:90 A:90 D:85 |
| 6 | Confident | About block's second sentence draws the plain-files/no-hidden-state framing from `getting-started/philosophy.md` | Intake permits drawing from philosophy.md; satisfies "who is it for / payoff" without authoring new claims | S:70 R:90 A:85 D:80 |
| 7 | Certain | No `[NEEDS CLARIFICATION]` markers in this plan — under-specified points resolved inline as graded rows here | `_generation` procedure forbids markers in plan.md (intake-only construct); no genuine ambiguity remained | S:85 R:95 A:95 D:90 |

7 assumptions (2 certain, 5 confident, 0 tentative).
