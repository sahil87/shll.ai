# Tool Page Rubric

> **Live-site mismatch — read first.** The body of this rubric below describes the **non-live tailwind site** (`sites/astro-tailwind-terminal1`): single-page tool entries at `src/content/tools/{name}.md`, frontmatter validated by the `tools` zod schema in `src/content.config.ts`, and sidebar coupling via `src/data/tools.ts`. **That site is no longer live.** The live site (per `SITE_DIR` in `.github/workflows/deploy.yml`, swap `fbb046f`, 2026-05-31) is **Starlight** (`sites/astro-starlight-terminal1`): tools are **multi-page** (`src/content/docs/tools/<tool>/{overview,install,commands,workflows}.{md,mdx}`), the sidebar is **hardcoded in `astro.config.mjs`** (no `src/data/`). Fully reconciling this rubric's body to Starlight is a separate concern (the rubric predates the swap); this file currently carries only the [Command reference exception](#generated-command-reference-exception) below as a Starlight-aware addition.

## Overview

Every tool documented at `src/content/tools/{name}.md` follows the same shape. The rubric is short on purpose — these pages are "directory entries" pointing to each tool's full README on GitHub, not full docs.

This pattern is observable across all seven tool pages (`idea.md`, `hop.md`, `fab-kit.md`, `wt.md`, `run-kit.md`, `tu.md`, `shll.md`) and is the expected shape for any new tool added to the toolkit.

## Requirements

Every tool page MUST contain the following sections, in order:

1. **Frontmatter** — `title` (the tool name) and `description` (one sentence, ≤140 chars, the elevator pitch). MUST satisfy the `tools` collection schema in `src/content.config.ts` (zod: `{ title: string, description: string }`).
2. **Opening paragraph** — One short paragraph (1-2 sentences) describing what the tool is. SHALL NOT exceed two sentences.
3. **`## Install`** — A `bash` code block with the `brew install sahil87/tap/{tool}` line and any required shell-init eval (e.g., `eval "$(tool shell-init zsh)"`).
4. **`## At a glance`** — A `bash` code block with 4-6 representative commands and inline `# comment` annotations. Followed by a bulleted list of distinguishing properties (3-6 bullets).
5. **`## Full docs`** — One sentence pointing to the GitHub README, followed by `**→ [github.com/sahil87/{tool}](https://github.com/sahil87/{tool})**` as the link.

Tool pages SHALL NOT contain **hand-written**:

- Long-form command reference (every flag, every subcommand) — **except** the *generated* Command reference described in [the exception below](#generated-command-reference-exception). This rule still stands for hand-written content; the exception is narrowly for binary-generated reference.
- Architecture diagrams, Screenshots, or deep long-form prose — **except** the *mechanically-synced* README slice described in [the pulled-README-slice exception below](#pulled-readme-slice-exception-change-w32m). The old blanket bans on diagrams/screenshots/depth applied to **hand-copied** content; they no longer apply to content pulled-and-synced from the tool's canonical repo.
- Changelog or version history (hand-written; a tool's own README `## Changelog`, if present, may travel into the pulled slice — it is not denylisted by the extraction contract).

> **Stance revised (change `w32m`, constitution v2.1.0).** The earlier "site is a thin directory / link out for depth / no screenshots / no diagrams" stance is **superseded** by the constitution's new **Tool-Page Depth** constraint ([`constitution.md`](../../../fab/project/constitution.md) v2.1.0). Tool pages MAY now host deep per-tool prose, referenced screenshots, and rendered diagrams — **provided** the content is mechanically synced from the canonical tool repo (README slice + `docs/site/`), never hand-copied, and any command/flag it references passes the `vn39` validation gate. The anti-drift *value* behind the old stance is preserved and made explicit: single-source + mechanical sync (the producer repo stays canonical), not thinness. Both generated/synced exceptions below realize this.

## Generated Command reference (exception)

The one permitted exception to "SHALL NOT contain long-form command reference" is a **generated** CLI command reference, sourced from `help/<slug>.json` (see [help-collection](./help-collection.md)). On the **live Starlight site** it renders as each tool's dedicated **`commands` page** (`sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/commands.{md,mdx}`), filling Starlight's existing "commands … coming soon" slot.

This is permitted precisely because it is **generated, not hand-written** — single-sourced from the binary's own `-h` output, so it cannot drift from the tool the way a hand-copied reference would. The anti-drift intent of the "SHALL NOT" rule is preserved: hand-maintained long-form reference is still forbidden; only binary-generated, single-sourced reference is allowed.

**Placement decision (now realized, change `js1s`).** The reference renders as a **dedicated `commands` page per tool** on the live Starlight site (multi-page docs model), chosen over an expandable `<details>` block on the `overview` page — the per-page model is the idiomatic Starlight shape and fills the existing empty `commands` slot.

The realized form: each tool has `src/content/docs/tools/<tool>/commands.mdx` (frontmatter `title: Commands` + a `description`) that imports `src/components/CommandReference.astro` and renders `<CommandReference tool="<tool>" />`. The component reads + validates + renders `help/<slug>.json` at build time (see [help-collection → Rendering Consumer](./help-collection.md#rendering-consumer-commandreference)). Pages are `.mdx` (not `.md`) precisely so they can `import` the component.

**Generated replaces hand-written.** idea and fab-kit previously carried hand-written `commands.md` prose; both were **removed** and replaced by the generated `commands.mdx` (a `.md` and `.mdx` at the same slug would collide in Starlight). The curated prose is not lost — its canonical home becomes each command's cobra `Long` field, which flows back through the producer into `help/<slug>.json` and onto the site automatically (tracked as idea backlog `e3rk`, out of scope here). Net effect: **no hand-written command-reference prose remains on any tool page**; the only command reference is the binary-generated one.

**Enriched/structured render + cross-tool index (change `qemq`).** The generated reference surface is now two surfaces, both still single-sourced from `help/*.json` (so the anti-drift guarantee holds):

1. The per-tool `commands` page no longer renders a flat raw `-h` blob — `CommandReference.astro` decomposes each node's captured `text` at build time (via `src/lib/parse-help.ts`) into a **structured view**: command path + copy, description, copyable usage, a flags table with type/required/global badges and per-row copy, a per-command flag filter, and a "show raw" `<details>` fallback (raw stays authoritative). Per-command `-h/--help` rows are suppressed, paired with a once-per-page universal-help note.
2. A new **cross-tool command index** at `/reference/command-index` (in a new "Reference" sidebar group) flattens every command path + real flag across all tools into one searchable list.

Both run at build time (Constitution I) and the parse is **display-only** — it never derives the command tree (still sourced from JSON `commands[]`), so it does not violate the help-dump contract §5 nor the anti-drift intent of this exception. Mechanics live in [help-collection → Rendering Consumer](./help-collection.md#rendering-consumer-commandreference).

## Pulled README slice (exception, change `w32m`)

The second permitted exception to the hand-written bans is a **mechanically-synced README slice** — deep prose, referenced screenshots, and rendered diagrams pulled from the tool's canonical README. It is permitted for the **same reason** as the generated Command reference: it is **synced, not hand-written** — single-sourced from the tool's own repo and refreshed daily, so it cannot drift the way a hand-copied page would. The anti-drift intent of the "SHALL NOT" rules is preserved; only the *mechanism* (mechanical sync) is what makes depth safe.

This is the prose counterpart to the generated Command reference (which is the *command* counterpart). Together they realize the constitution's [Tool-Page Depth](../../../fab/project/constitution.md) constraint (v2.1.0): the site can be deep, because depth is single-sourced and synced.

**Realized form.** A daily pull workflow deduces a curated slice from each tool's README (skip leading chrome; stop before footer chrome; strip mermaid + GitHub theme-only images), runs it through the `vn39` command/flag validation gate, and commits it to the repo-root collector `content/<slug>/README.md`. Each tool's `overview.mdx` renders `<ReadmeSlice tool="<slug>" />` (injected **under `<GithubButton>`**, preserving existing prose) — a build-time component that reads the slice via the ascend-to-root `import.meta.url` pattern and renders markdown→HTML at build time (Constitution I), with missing→placeholder / present-but-invalid→build-fail discipline. The overview thus becomes: `<GithubButton>` + `<ReadmeSlice>` + any existing hand-written overview prose.

Mechanics live in [readme-extraction](./readme-extraction.md); the forward contract is [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md). The slice is rendered on the **per-tool axis** (overview); the cross-tool `Reference` axis (`qemq`) is a separate surface and is untouched.

**Coexistence with the install pages.** A pulled `Install` section (it is INCLUDED in the slice, not excluded) is canonical for "install just this tool + its specifics"; the global `getting-started/install` quick-start stays canonical for "install the whole toolkit." Both ship, framed differently — accepted as legitimate, since both can be simultaneously correct; the `vn39` gate (not exclusion) guards the pulled install's command accuracy.

## Per-tool GitHub affordance (live Starlight site)

Every tool **overview** page on the live Starlight site (`sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/overview.mdx`) MUST render a top-of-page GitHub affordance: `<GithubButton tool="<slug>" />`, just under the H1. The component (`src/components/GithubButton.astro`, change `vn39`) takes a `tool` slug prop and links to `https://github.com/sahil87/{tool}` — build-time only (no client JS, Constitution I), styled with the terminal `--c-*` tokens (dark-mode parity, Constitution V), with a visible `:focus-visible` ring (Accessibility). It mirrors `CommandReference.astro`'s conventions (`not-content`, scoped `<style>`, frontmatter `interface Props`, missing-slug build guard).

**`.md` → `.mdx` for overviews.** Because importing an Astro component requires MDX, all 7 tool overviews are `.mdx` (not `.md`), mirroring the existing `commands.mdx`. The import path from `src/content/docs/tools/<tool>/` to the component is `../../../../components/GithubButton.astro` (4 `../`). Starlight sidebar slugs (`tools/<tool>/overview`) are extension-agnostic, so the rename does not touch `astro.config.mjs`.

**Redundancy note.** The rubric-mandated bottom-of-page `**→ [github.com/sahil87/{tool}]**` README pointer (where present) now coexists with the top button. This is intentional — the top button is the persistent "jump to repo" affordance; the footer pointer is the "deepest reference / full README" link in footer prose context. `idea` and `fab-kit` overviews carry only the top button (no footer pointer), so there is no duplication there.

## Bullet Style

Bullets in the "At a glance" section MUST use the pattern: **bold short claim** — em-dash — short explanation. Examples from existing pages:

- **Plain Markdown, not a database** — the backlog is a checked-in file.
- **Substring navigation** — `h ou<TAB>` matches `outbox`.
- **One-shot install** — idempotent and safe to re-run.

Rationale: scannable on mobile, parallel structure across the toolkit, easy to extend.

## Sidebar Coupling

Every new tool page MUST also have a corresponding entry in `src/data/tools.ts` (`{ slug, label, blurb }`). See [astro-config](../site/astro-config.md). Adding a page without an entry leaves the page unreachable from the sidebar AND missing from the home-page tree-list (both read from `tools.ts`).

## Design Decisions

- **~~Short pages, not deep docs.~~ Deep, but synced — not hand-copied (revised, change `w32m`, constitution v2.1.0).** The original stance ("the site is a directory; the READMEs are the destination; duplicating them here invites drift") was correct about the *drift* but wrong to conclude *thinness*. The drift it feared came from **hand-copying**, not from depth. The site may now host deep per-tool content because that content is **mechanically synced** from the canonical repo (the [pulled README slice](#pulled-readme-slice-exception-change-w32m)), never hand-copied — so it is fresh by construction and cannot rot. A visitor SHOULD now be able to understand a tool deeply *on the site* without clicking out to GitHub; the tool repo stays canonical (it is where docs are authored), and the daily pull keeps the site in sync.
- **Brew install line in every page.** Even though `shll install` installs everything, individual brew lines let visitors install one tool without buying into the whole toolkit.
- **`At a glance`, not `Usage`.** The section is deliberately a teaser, not a tutorial. The name signals "skim this, then read the full README."

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
| 2026-05-17 | Starlight removal (branch `starlight-removal`): tool pages moved from `src/content/docs/tools/` to `src/content/tools/`. Frontmatter now validates against the `tools` zod schema in `src/content.config.ts` (was `docsSchema()`). Sidebar coupling now via `src/data/tools.ts` instead of `astro.config.mjs`. |
| 2026-06-02 | Change `xiis`: added the generated Command-reference exception (renders as the per-tool `commands` page on the live Starlight site, sourced from `help/<slug>.json`); preserved the "SHALL NOT contain long-form command reference" rule with this single exception; added a live-site mismatch note flagging that this rubric's body describes the now-non-live tailwind site while the live site is Starlight. Full rubric-to-Starlight reconciliation deferred. |
| 2026-06-02 | Change `js1s`: the Command-reference exception is now **realized** — the command reference renders via `src/content/docs/tools/<tool>/commands.mdx` importing `CommandReference.astro`, replacing hand-written command prose. idea/fab-kit's hand-written `commands.md` were removed (slug collision with `.mdx`); their prose relocates to cobra `Long` (idea backlog `e3rk`). All 7 tools have a `commands.mdx` + a sidebar `Commands` entry in `astro.config.mjs`; today wt renders real data and the other 6 render the placeholder. No hand-written command-reference prose remains on any tool page. |
| 2026-06-03 | Change `vn39`: added the [per-tool GitHub affordance](#per-tool-github-affordance-live-starlight-site) — every tool overview renders a top-of-page `<GithubButton tool="…" />` (new `src/components/GithubButton.astro`); restored the GitHub link to idea/fab-kit overviews (previously linkless). All 7 overviews converted `.md` → `.mdx` to import the component. Stale "Install, commands, and workflows pages coming soon" footers (hop/wt/run-kit/tu/shll) corrected — Commands pages exist and are in the sidebar. The install reference on tool/getting-started pages is now the canonical `shll` quick-start (`shll shell-setup --trust-tap`, not the removed `shll shell-install`); see [help-collection](./help-collection.md) for the command-accuracy reconciliation. |
| 2026-06-04 | Change `qemq`: extended the [generated Command-reference exception](#generated-command-reference-exception) — the per-tool `commands` page now renders an **enriched/structured view** (build-time `parseHelp` decomposition → flags table with badges, copy affordances, per-command filter, "show raw" fallback) instead of a flat raw blob, and a new **cross-tool command index** at `/reference/command-index` (new "Reference" sidebar group) joins the generated reference surface. Both stay single-sourced from `help/*.json`; the parse is display-only (never derives the command tree), so §5 and the anti-drift intent are preserved. Mechanics in [help-collection](./help-collection.md#rendering-consumer-commandreference). |
| 2026-06-04 | Change `w32m`: **revised the tool-page-depth stance** (backed by [constitution](../../../fab/project/constitution.md) v2.1.0, the new Tool-Page Depth constraint). Added the [pulled-README-slice exception](#pulled-readme-slice-exception-change-w32m) — deep prose, referenced screenshots, and rendered diagrams MAY now appear on tool pages when **mechanically synced** from the canonical README (`<ReadmeSlice>` injected into each `overview.mdx` under `<GithubButton>`, daily-pulled to `content/<slug>/README.md`, `vn39`-gated), parallel to the generated Command-reference exception. Reframed the "SHALL NOT contain Screenshots/diagrams/depth" bans as applying to **hand-written** content only, and revised the "Short pages, not deep docs" decision to "deep but synced, not hand-copied." Mechanics in [readme-extraction](./readme-extraction.md); contract in [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md). |
