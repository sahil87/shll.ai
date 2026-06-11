# Intake: Author Links & Per-Tool Star Counts

**Change**: 260611-d9qb-author-links-star-counts
**Created**: 2026-06-11
**Status**: Draft

## Origin

> I find a few things missing from the current website 1) Links to my social handles - github / linked in. A note about the author (the sahil87 line) 2) Ability to quickly star these repos

Conversational (`/fab-discuss` session preceding `/fab-new`). Key decisions reached in discussion:

- **LinkedIn in footer, NOT header** — user explicitly rejected a header icon ("linked in header might be too much - linked in on footer is ok"). The header `social` array in `astro.config.mjs` stays unchanged (GitHub + Discord).
- **noon.design also in footer** — user confirmed ("yes, add noon.design to footer also"). The constitution's External Links section already names `noon.design` in the expected outbound link set, but it appears nowhere on the site today.
- **Homepage `$ whoami` author section** — user approved; styled in the established terminal motif (`shell-caption` + `home-prose`, like the existing `cat ABOUT.md` block from change `ld0j`).
- **Per-tool star counts, not shll.ai's** — user asked "which repo's stars?"; agreed each `GithubButton` shows the count of the repo it points at (`github.com/sahil87/<tool>`). Showing the site repo's stars next to a `sahil87/wt` link would be misleading. The shll.ai site repo's own count is out of scope.
- **Build-time fetch, not GitHub's iframe buttons** — buttons.github.io embeds (third-party client-side JS × 7 tools) were considered and rejected against Constitution I (static-first) and VI (minimal deps). Counts are fetched from the GitHub API at build time and rendered statically; freshness rides the existing daily scheduled rebuild (`scheduled-readme-refresh.yml` always-commits → push to main → deploy), keeping counts ≤24h stale.
- **Failure mode** — on any fetch failure, render the button *without* the count; never fail the build. Matches the report-only/fail-silent ethos of the README and help pulls.
- **Tool pages only** — the homepage `ls tools/` listing stays clean (no counts); agent's lean, user did not object.

## Why

1. **Pain point**: The site presents seven tools but almost nothing about the person behind them. The only author trace is the footer copyright line; there is no LinkedIn anywhere, and `noon.design` — name-checked in the constitution's External Links set — is absent. For a personal toolkit, the author *is* part of the pitch. Separately, tool pages give a visitor no "is anyone using this?" signal, and no nudge toward starring.
2. **Consequence of not fixing**: Visitors can't connect the toolkit to its author (lost credibility and follow-through traffic to GitHub/LinkedIn/noon.design), and the repos forgo stars from interested visitors who would star if shown an affordance at the moment of interest.
3. **Why this approach**: There is no URL that stars a repo — starring requires a logged-in click on github.com — so the honest ceiling is "one click to the repo, star there," enhanced with a live-ish count as social proof. Build-time fetch keeps Constitution I intact (zero runtime JS) where iframe star buttons would not, and the daily scheduled rebuild makes build-time counts acceptably fresh without any new infrastructure.

## What Changes

### 1. Footer author links (`sites/astro-starlight-terminal1/src/components/Footer.astro`)

Extend the existing `.site-copyright` line with two links, keeping the established `·` separator style:

```
© Sahil Ahuja 2026 · MIT licensed · LinkedIn · noon.design
```

<!-- assumed: links join the existing copyright line as a single row rather than a second row — matches the established one-line style; trivially reversible -->

- `LinkedIn` → `https://www.linkedin.com/in/ahujasahil/` <!-- clarified: URL provided by user — notably NOT linkedin.com/in/sahil87 -->
- `noon.design` → `https://noon.design`
- Reuses the existing `.site-copyright a` styles (inherit color, underline, hover/focus-visible) — dark-mode parity (Constitution V) and keyboard focus states (Accessibility) come for free from the `--c-*` tokens already in use.
- **No header change**: `social` array in `astro.config.mjs` keeps exactly GitHub + Discord.

### 2. Homepage `$ whoami` author section (`sites/astro-starlight-terminal1/src/content/docs/index.mdx`)

A new section in the established terminal motif, placed **after the install section and before the Discord line**: a `shell-caption` pre showing `$ whoami`, followed by a `home-prose` paragraph. Draft copy (user-editable; voice matches the existing `cat ABOUT.md` block):

```html
<section class="not-content" aria-label="About the author">
<pre class="shell-session shell-caption not-content">
<span class="shell-line"><span class="shell-prompt">$</span> whoami</span>
</pre>
<div class="home-prose">
<p><strong>Sahil Ahuja</strong> — I build small tools that make AI coding agents plan
before they type. The shll toolkit is the workflow I use every day, packaged.
Find me on <a href="https://github.com/sahil87">GitHub</a>,
<a href="https://www.linkedin.com/in/ahujasahil/">LinkedIn</a>, or at <a href="https://noon.design">noon.design</a>.</p>
</div>
</section>
```

<!-- assumed: draft author copy and placement (after install, before Discord) — author-voice text is trivially editable; placement follows the page's narrative order (what → tools → loop → install → who) -->

This deliberately rhymes with the interactive terminal's existing `whoami` easter egg ("a developer who plans before they code.").

### 3. Easter egg tie-in (`sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`)

<!-- clarified: user confirmed — egg keeps the joke and appends the real links -->
The `whoami` easter egg keeps its existing joke lines ("a developer who plans before they code." / "(everyone else is just typing.)") and **appends** the real author line with the same three links (GitHub, LinkedIn, noon.design), so the egg lands the joke and then delivers. Link rendering must use whatever anchor mechanism the prompt's output lines already support; if output lines are plain text only, print the bare URLs.

### 4. Build-time star counts (`src/lib/github-stars.ts` (new) + `GithubButton.astro` + `.github/workflows/deploy.yml`)

**New module** `sites/astro-starlight-terminal1/src/lib/github-stars.ts`:

- `getStarCount(tool: string): Promise<number | null>` — `GET https://api.github.com/repos/sahil87/{tool}`, returns `stargazers_count`.
- Sends `Authorization: Bearer ${process.env.GITHUB_TOKEN}` when the env var is present; unauthenticated otherwise (local dev).
- **Module-level per-build cache** (one fetch per repo per build, even if a future page renders the button twice).
- **Any failure → `null`**: network error, non-200 (404, 403 rate-limit), missing/malformed `stargazers_count`. Log a single console warning to the build log; never throw. A missing number is cosmetic; a broken deploy is not.
- Native `fetch` (available in the Astro/Node build) — **no new dependency** (Constitution VI).

**`GithubButton.astro`**: when `getStarCount(tool)` resolves to a number, render a star-count span in the existing button row; when `null`, render the button exactly as today (count omitted, no placeholder).

```
View on GitHub   github.com/sahil87/wt   ★ 142   ↗
```

<!-- assumed: display format `★ {n}` with thousands abbreviation (1234 → `1.2k`), styled with the existing --c-* tokens — cosmetic, one obvious default, trivially adjustable -->

**`.github/workflows/deploy.yml`**: pass the automatic token to the build step env:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

(Unauthenticated calls from shared Actions-runner IPs rate-limit unpredictably; the automatic token raises the limit with zero secret management. 7 calls per build is trivial either way.)

**Freshness**: no new scheduling. The existing always-commit daily README refresh triggers a daily deploy, so counts are at most ~24h stale.

### Non-Goals

- No LinkedIn icon in the header `social` array (explicitly rejected).
- No star counts on the homepage `ls tools/` listing (tool pages only).
- No star count / "view source" affordance for the shll.ai site repo itself.
- No GitHub iframe star buttons (buttons.github.io) — rejected against Constitution I/VI.
- No terminal-themed 404 page (discussed earlier, dropped from this change's scope).
- No changes to the other site variant (`astro-tailwind-terminal1`) — live site only.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) GithubButton gains an optional build-time star count; the Footer override gains the author link row; the homepage gains the `$ whoami` hand-authored block (sibling of the `ld0j` blocks — note any new hand-copy drift surfaces, e.g. the LinkedIn URL appearing in both footer and whoami section)
- `build-deploy/deployment`: (modify) deploy workflow's build step now passes `GITHUB_TOKEN`; build acquires a tolerant build-time GitHub API dependency (7 repo calls, fail-soft to count-omission); freshness model documented as riding the daily scheduled rebuild

## Impact

- `sites/astro-starlight-terminal1/src/components/Footer.astro` — one line + reused styles
- `sites/astro-starlight-terminal1/src/content/docs/index.mdx` — new section (~15 lines)
- `sites/astro-starlight-terminal1/src/lib/github-stars.ts` — new, small (~40 lines), follows existing `src/lib/` patterns
- `sites/astro-starlight-terminal1/src/components/GithubButton.astro` — top-level await for count + conditional span; existing loud-fail guard for missing `tool` prop unchanged
- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — only if Open Question 2 confirms
- `.github/workflows/deploy.yml` — one env line on the build step
- **No new npm dependencies.** Build time +7 sequential-or-parallel HTTP calls (sub-second). No client-side JS added anywhere (Constitution I preserved).

## Open Questions

None — both intake questions were asked and resolved at intake time:

- **Q1 (resolved)**: LinkedIn profile URL is `https://www.linkedin.com/in/ahujasahil/` (user-provided; note it is NOT `linkedin.com/in/sahil87` — do not "correct" it to match the GitHub handle).
- **Q2 (resolved)**: Yes — the `whoami` easter egg appends the real author links (see §3).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | LinkedIn link goes in the footer, not the header | Discussed — user explicitly rejected header, approved footer | S:95 R:80 A:90 D:90 |
| 2 | Certain | noon.design link added to the footer alongside LinkedIn | Discussed — user confirmed; constitution already names noon.design in the outbound link set | S:95 R:85 A:90 D:90 |
| 3 | Certain | Homepage gets a `$ whoami` author section in the terminal motif with GitHub/LinkedIn/noon.design links | Discussed — user approved ("Whoami author section ok") | S:90 R:75 A:85 D:85 |
| 4 | Certain | Star counts are per-tool (the repo each GithubButton points at), not the shll.ai site repo | Discussed — user asked which repo; recommendation accepted | S:90 R:80 A:85 D:90 |
| 5 | Certain | Counts fetched at build time and rendered statically; no buttons.github.io iframes, no client JS | Discussed — Constitution I/VI; iframe option explicitly rejected in conversation | S:90 R:70 A:95 D:90 |
| 6 | Certain | Deploy workflow passes the automatic GITHUB_TOKEN to the build; freshness rides the existing daily scheduled rebuild (≤24h stale) | Discussed — accepted as part of the fetch-mechanics note | S:85 R:75 A:90 D:85 |
| 7 | Certain | On star-fetch failure, render GithubButton without the count; never fail the build | Discussed — accepted; matches established report-only/fail-soft pull ethos | S:90 R:85 A:90 D:90 |
| 8 | Confident | Star counts appear on tool pages only; homepage `ls tools/` listing stays clean | Proposed as lean in discussion; user did not object; trivially extendable later | S:70 R:85 A:75 D:75 |
| 9 | Confident | Local dev builds without GITHUB_TOKEN attempt unauthenticated fetch and omit the count on failure | Follows directly from decisions 6+7; no user-visible stakes in dev | S:65 R:85 A:85 D:80 |
| 10 | Confident | Count display format: `★ {n}` with thousands abbreviation (1234 → `1.2k`) in the existing button row, `--c-*` token colors | Not discussed; cosmetic with one obvious default; trivially adjustable | S:40 R:90 A:70 D:75 |
| 11 | Confident | Footer links join the existing copyright line as one `·`-separated row (not a second row) | Matches the established single-line footer style; trivially reversible | S:50 R:95 A:75 D:70 |
| 12 | Certain | The `whoami` easter egg appends the real author line + links after its joke lines | Clarified — user confirmed (Open Question 2) | S:95 R:90 A:70 D:60 |
| 13 | Confident | Star fetch lives in a new `src/lib/github-stars.ts` module with a module-level per-build cache | Implementation placement following the existing `src/lib/` pattern (extract-readme, parse-help, etc.) | S:55 R:85 A:85 D:75 |
| 14 | Certain | LinkedIn URL is `https://www.linkedin.com/in/ahujasahil/` | Clarified — user provided (Open Question 1); the handle differs from the GitHub username, validating that this could not be guessed | S:95 R:90 A:15 D:30 |
| 15 | Confident | Draft `whoami` copy and placement (after install section, before Discord line) | Author-voice text, trivially editable; placement follows page narrative order; draft included verbatim in §2 | S:40 R:95 A:55 D:60 |

15 assumptions (9 certain, 6 confident, 0 tentative, 0 unresolved).
