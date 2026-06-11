# Intake: Homepage Newcomer Content

**Change**: 260610-ld0j-homepage-newcomer-content
**Created**: 2026-06-10
**Status**: Draft

## Origin

> For someone who just came to shll.ai — there's very little context. Need more content on the home page.

Conversational — this intake follows a `/fab-discuss` session that audited the live homepage. Findings that ground this change:

- The homepage (`src/content/docs/index.mdx`, splash template) currently contains: the hero tagline ("Seven small CLIs that force AI agents to plan before they code"), a fake `shll install` terminal animation, an interactive prompt (`TerminalPrompt`), the loop diagram (SVG via `Diagram`), two comment-styled lines mapping tool names to one-word roles, and a Discord link. That is roughly **one sentence of indexable prose** on the entire landing page.
- A newcomer never learns: what problem the toolkit solves, who it is for, what each of the seven tools actually does, or how to install — without clicking into the sidebar.
- The answers already exist one click away: `getting-started/overview.md` ("The shll toolkit is seven small CLIs that work together to make AI-assisted coding tractable… they compose into a pipeline that runs from idea capture to merged PR with the AI doing the typing") and `getting-started/philosophy.md`.
- Constitution (Accessibility): "Decorative diagrams SHOULD have a textual explanation adjacent" — currently unmet for the loop diagram; the adjacent text is comment-styled one-worders.
- This change is the content/prose sibling of `260610-kb1r-seo-sharing-fixes` (meta tags, OG card, title). More real HTML prose on the homepage is simultaneously the newcomer context and the crawlable content — the two changes reinforce but do not overlap.
- The last three shipped changes (#51 interactive-above-the-fold, #52 touch support, #53 command polish) all invested in the homepage terminal aesthetic. New content must stay inside that theme, not fight it.

## Why

1. **Pain point**: the landing page is a vibe with no exposition. First-time visitors (the site's entire purpose — it is the front door to the toolkit) get tool names and an animation, not comprehension. Crawlers get almost no text to index.
2. **Consequence of not fixing**: visitors bounce without understanding what shll is; search engines have nothing to rank the page on beyond the tagline; the seven tool pages receive no keyword-rich internal links from the highest-authority page on the domain.
3. **Why this approach**: add real, terminal-styled HTML prose to the existing homepage rather than redesigning it. The terminal theme is a deliberate, recently-polished investment; content sections styled as terminal output (e.g. `cat`/`ls` motifs) preserve it while making the text real markup — indexable, selectable, accessible. Source material is lifted from existing getting-started pages, not invented, so no canonical-content drift.

## What Changes

All changes scoped to the live site, `sites/astro-starlight-terminal1/`, primarily `src/content/docs/index.mdx` (plus `src/styles/terminal.css` for any new section styling).

Section order on the page after this change:

1. Hero (unchanged)
2. Terminal window with install animation + interactive prompt (unchanged)
3. **NEW — "what is this" block**
4. **NEW — `ls tools/` grid**
5. Loop diagram **with new adjacent prose**
6. **NEW — install one-liner**
7. Discord link (unchanged)

### 1. "What is this" block

2–4 sentences of real text, terminal-styled (e.g. a `$ cat ABOUT.md` motif above a prose block) but rendered as actual HTML text — NOT inside a `<pre>` that would break wrapping/selection/screen-readers, and NOT an image. Content drawn from `getting-started/overview.md`, e.g.:

> The shll toolkit is seven small CLIs that make AI-assisted coding tractable. Each tool is independent, brew-installable, and useful on its own — together they compose into a pipeline that runs from idea capture to merged PR, with the AI doing the typing. Built for developers running multiple coding agents in parallel.

Exact copy may be tuned during apply; the constraint is it answers *what is this / who is it for / what's the payoff* in plain language.

### 2. `ls tools/`-style grid

Seven entries — `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll` — each: tool name linking to `/tools/<tool>/overview/` + one descriptive line. Styled as terminal directory-listing output, but each row real HTML (link + text). This creates seven keyword-rich internal links from the highest-authority page.

One-liners stay at the "what it's for" level, sourced from each tool's existing overview framing. **Hard constraint (the `vn39` rule, constitution Tool-Page Depth)**: hand-written prose MUST NOT reference commands or flags absent from `help/<tool>.json` — safest is to name no commands/flags at all in these lines. Starting copy (tunable during apply):

- `idea` — capture ideas and feed a backlog without breaking flow
- `hop` — a personal directory of your git repos: jump anywhere, batch-update from anywhere
- `fab-kit` — the planning harness: constitution, intake, plan, review — agents plan before they code
- `wt` — disposable git worktrees so each change works in isolation
- `run-kit` — one dashboard to watch every agent session
- `tu` — track what your AI coding sessions cost
- `shll` — the bootstrap: install and update the whole toolkit

### 3. Prose adjacent to the loop diagram

Replace/augment the two comment-styled one-worder lines with 1–3 sentences of real text explaining the loop (one idea fans out into parallel agents, converges into one dashboard; which tools sit inside the loop vs. around it). Satisfies the constitution's Accessibility SHOULD ("decorative diagrams SHOULD have a textual explanation adjacent"). The existing comment-styled tool links may stay as flavor, but the explanation must be real prose.

### 4. Visible install one-liner

The brew install command on the homepage as a copyable code line (sourced from `getting-started/install.md` — verify the exact command there during apply; do not invent it). Keeps the "Install everything" hero CTA; this is the for-people-who-scroll affordance.

### Constraints

- **Dark mode parity (Constitution V)**: every new section renders correctly in both themes — new styles use the existing `--c-*` custom-property palette in `terminal.css`.
- **Static, zero new deps (Constitution I, VI)**: pure content + CSS; no new components requiring client JS, no new packages.
- **Accessibility**: new links keyboard-navigable with visible focus states (reuse existing link styling); prose readable by screen readers (real text, semantic markup).
- **No drift**: prose is lifted/adapted from existing site pages (overview, philosophy, install) — not newly-authored claims about tool behavior.

### Out of scope

- Meta tags, OG card, homepage `<title>` — covered by sibling change `260610-kb1r-seo-sharing-fixes`.
- Changes to getting-started pages, tool pages, or the interactive terminal's command set.
- The variant site and playground.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) only if the homepage's relationship to tool pages changes materially (seven internal links + one-liner framing per tool); otherwise no memory change — homepage composition is page content, not a cross-file convention.

## Impact

- `sites/astro-starlight-terminal1/src/content/docs/index.mdx` — main change: three new sections + diagram prose.
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — styles for prose-in-terminal-frame sections and the tools grid.
- Possibly a small presentational component under `src/components/` if the tools grid warrants one (no client JS).
- No dependency changes, no config changes, fully static output.

## Open Questions

- None.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | New content is real, indexable HTML text styled in the terminal theme — never imagery or ASCII-in-`<pre>` prose | Core of the discussed problem (SEO + newcomer comprehension both need real text); user endorsed direction | S:85 R:80 A:90 D:90 |
| 2 | Confident | Four additions: what-is-this block, `ls tools/` grid, diagram-adjacent prose, install one-liner | Discussed as items 4–7 in the audit; user said "draft both intakes" without trimming the list | S:70 R:80 A:80 D:75 |
| 3 | Confident | Section order: hero → terminal → what-is-this → tools grid → diagram+prose → install → Discord | Reasonable reading order; user explicitly left "section order" open as a possible discussion topic — trivially reorderable in one file | S:50 R:90 A:75 D:60 |
| 4 | Confident | Prose copy lifted/adapted from existing getting-started pages; starting copy in this intake is tunable at apply | Anti-drift instinct from constitution Tool-Page Depth; exact wording is low-stakes and reversible | S:65 R:90 A:80 D:75 |
| 5 | Certain | Tool one-liners name no commands/flags (vn39 hard rule kept trivially satisfied) | Constitution Tool-Page Depth binding rule for hand-written prose | S:85 R:90 A:95 D:90 |
| 6 | Certain | Zero new dependencies, zero client JS, dark-mode parity via existing `--c-*` palette | Constitution I, V, VI directly answer this | S:80 R:90 A:95 D:90 |
| 7 | Confident | Existing hero, terminal animation, interactive prompt, and Discord footer stay as-is (additive change) | Last three shipped changes invested in these; nothing in discussion suggested removal | S:70 R:85 A:85 D:80 |

7 assumptions (3 certain, 4 confident, 0 tentative, 0 unresolved).
