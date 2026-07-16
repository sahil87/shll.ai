# Intake: Tool-Page Install One-Liner + Screenshots

**Change**: 260715-moju-tool-page-install-screenshots
**Created**: 2026-07-16

## Origin

Conversational (`/fab-discuss` session → user approved the recommended approach → second of two queued changes; the first, `3ke3-canonical-short-tool-urls`, is complete with PR #86 open). The user's raw ask:

> Because I am using shll.ai/&lt;tool-name&gt; as the link I share everywhere, those page needs more love — 1. one step installation step, screenshots where available.

The agent recommended: (a) a small shared `InstallOneLiner.astro` component (a `tool` prop, rendering the per-tool curl one-liner) used on all 7 overviews — single source, avoiding 7 new hand-copies of the install command (the homepage install block is already a documented hand-copy drift surface, `ld0j`); (b) for screenshots, a constitution/rubric PATCH blessing **site-owned curated screenshots** as a permitted content class on overviews — the run-kit screenshots added by PR #82 are hand-placed and currently sit outside the letter of the Tool-Page Depth constraint ("mechanically synced"). The user replied "Go ahead for both, one after the other".

## Why

1. **Pain point (install)**: `shll.ai/<tool>` is the link the user shares everywhere, but a visitor landing there finds **no install step at all** — per-tool install lives only inside the pulled readme page and the global `getting-started/install` page. Since PR #84, the toolkit has a real one-step install (`curl -fsSL https://shll.ai/install | sh`) that accepts tool subsets (`sh -s -- run-kit`), so a one-line, copy-paste install per tool is now accurate and cheap.
2. **Pain point (screenshots)**: PR #82 added two run-kit screenshots to its overview — the highest-value visual on the page — but hand-placed screenshots are formally disallowed by the constitution's Tool-Page Depth constraint (only *mechanically synced* depth is blessed). Without codifying the pattern, every future screenshot either violates the constitution or gets rejected in review.
3. **If not fixed**: shared links keep landing visitors on pages with no actionable install step; the run-kit screenshots stay a latent constitutional violation that invites either cleanup-deletion or rule-rot.
4. **Why this approach**: a shared component is the repo's established single-source pattern (`GithubButton`, `VersionTable`, `ToolsIndex` precedents); a constitution PATCH is the established mechanism for scope-note updates to Tool-Page Depth (v2.1.1 `4s3e`, v2.1.2 `x0br` precedents — principles unchanged, scope refined).

## What Changes

All site work in `sites/astro-starlight-terminal1/`; canonical tool URLs are at root per change `3ke3` (`/<tool>/`, overview files still physically at `src/content/docs/tools/<tool>/overview.mdx`).

### 1. New `InstallOneLiner.astro` component

`src/components/InstallOneLiner.astro`, taking a `tool` slug prop (validate against the roster in `src/lib/tool-slugs.ts` — build-fail on an unknown slug, mirroring `GithubButton`'s missing-slug guard). Renders a small terminal-styled block:

```
$ curl -fsSL https://shll.ai/install | sh -s -- <tool>
```

plus one short site-authored sentence linking to `/getting-started/install/` for the whole-toolkit story (e.g. "Installs `shll` + `<tool>` via Homebrew — or install the whole toolkit."). Implementation notes:

- Reuse the homepage install block's terminal idiom: `shell-session`-style markup with the `$` prompt span `user-select: none`, so selection copies the command only. Reuse existing `terminal.css` classes/`--c-*` tokens wherever possible (dark-mode parity for free, Constitution V); component-scoped styles only if something is genuinely new (Constitution VI: no new deps; Constitution I: zero client JS).
- The one-liner is the component's single source — this deliberately does NOT add 7 hand-copies. The two documented hand-copy surfaces (homepage install block, `getting-started/install.md`) are unchanged and remain the canonical hand-written carriers.
- vn39 cross-check: `curl`/`sh` are exempt shell tokens; the line names no tool-binary subcommands/flags. No `help/<tool>.json` friction.

### 2. Overview body shape gains an `## Install` section (7 files)

Each `src/content/docs/tools/<tool>/overview.mdx` gains, between the job-framed lead and `## How it fits`:

```mdx
## Install

<InstallOneLiner tool="<tool>" />
```

Import path from the overview files: `../../../../components/InstallOneLiner.astro` (same 4-level ascent as `GithubButton`). Resulting overview order: `<GithubButton>` → lead → `## Install` → (`## Screenshots` where present) → `## How it fits` → `## Where to next`. run-kit's existing `## Screenshots` section moves after `## Install` if not already ordered that way.

### 3. Constitution PATCH — bless site-owned curated screenshots (v2.1.3)

Amend the **Tool-Page Depth** constraint in `fab/project/constitution.md` (a PATCH: principles unchanged, scope note refined — the `4s3e`/`x0br` precedent):

- Add a third permitted content class: **site-owned curated screenshots** — committed static assets under the live site (`public/screenshots/<tool>-*.webp`), hand-captured and hand-placed on the overview's `## Screenshots` section. Rationale to carry: screenshots are curated visual captures versioned in-repo — they are not command/flag prose, so the drift the mechanical-sync rule guards against does not apply; staleness risk is visual-only and acceptable for marketing framing. They MUST carry meaningful alt text (existing Accessibility constraint), SHOULD be `.webp`, and remain distinct from *synced* imagery (README images keep flowing to the readme page mechanically, untouched by this rule).
- Changelog entry (v2.1.3, dated, naming change `moju`) following the existing changelog format.
- This retroactively legitimizes the run-kit screenshots from PR #82 — name that explicitly in the changelog entry.

### 4. Screenshots on overviews — scope for this change

- **run-kit**: already has 2 screenshots (`public/screenshots/run-kit-{agent-session,console}.webp`) with alt text; normalize section placement per §2. No new captures.
- **Other 6 tools**: no site-owned screenshot assets exist, and none can be fabricated here — they follow as assets are captured (out of scope). hop/fab-kit README images already render on their readme pages via the pulled slice; do NOT hoist them onto overviews (they are synced content belonging to the readme page; hoisting would create a second render of upstream-controlled imagery).

### 5. Verification

- `pnpm build` succeeds; `node --test 'scripts/*.test.mjs'` still passes.
- Each built `dist/<tool>/index.html` contains the install one-liner with the correct slug (`sh -s -- <tool>`).
- The block renders in both themes via `--c-*` tokens (no hardcoded colors) and ships zero client JS.
- run-kit's overview shows Install before Screenshots; the two screenshots still render.
- An unknown slug passed to `InstallOneLiner` fails the build with a descriptive error.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) overview body shape gains the `## Install` section (component, placement, single-source rationale) and the `## Screenshots` convention (site-owned curated assets, constitution v2.1.3, run-kit precedent); note the third permitted content class alongside the two synced/generated exceptions.

## Impact

- ~10 files: 1 new component, 7 overview edits, `fab/project/constitution.md` PATCH, possibly `terminal.css` (only if the existing shell-session classes need a small extension) + 1 memory file at hydrate.
- No new dependencies, zero client JS, build-time only. Dark-mode parity via existing tokens.
- Branch note: this change stacks on `260715-3ke3-canonical-short-tool-urls` (PR #86, open) — the overviews it edits carry 3ke3's slug frontmatter and absolute links. Its PR diff will include 3ke3's commits until #86 merges; GitHub collapses this automatically after merge.
- In-flight change `2fcv` (run-kit overview wording, its own branch) touches different sections of `run-kit/overview.mdx` — worst case a trivial merge conflict.

## Open Questions

*(none — component approach, screenshot blessing, and scope limits were settled in the originating discussion)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Shared `InstallOneLiner.astro` component (tool prop, roster-validated) instead of 7 hand-copied blocks | Discussed — user approved; mirrors GithubButton/VersionTable single-source precedents | S:90 R:85 A:90 D:90 |
| 2 | Certain | Constitution PATCH (v2.1.3) blessing site-owned curated screenshots as a third content class; retroactively covers run-kit's PR #82 screenshots | Discussed — agent flagged the constitutional tension, user approved the amendment path | S:85 R:75 A:85 D:85 |
| 3 | Confident | Placement: `## Install` section between the lead and `## How it fits`; Screenshots follows Install | Not explicitly discussed; conventional top-of-page install placement, keeps nav sections last | S:55 R:85 A:80 D:70 |
| 4 | Confident | Render idiom: homepage shell-session markup with select-none `$` prompt, existing terminal.css tokens | Matches the repo's established install-block treatment; selection-copy affordance already proven | S:60 R:85 A:85 D:75 |
| 5 | Confident | Screenshots scope = run-kit only this change; no hoisting of README images onto overviews | "Where available" self-limits; hoisting synced imagery would blur the synced/site-owned boundary | S:65 R:80 A:80 D:70 |
| 6 | Confident | Stack the branch on 3ke3's branch (PR #86) rather than main | Overviews depend on 3ke3's frontmatter/links; branching from main would guarantee conflicts | S:60 R:75 A:85 D:75 |

6 assumptions (2 certain, 4 confident, 0 tentative, 0 unresolved).
