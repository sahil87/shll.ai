# Intake: Fix consumer-side README/docs-site content-rendering gaps

**Change**: 260608-ng8c-fix-readme-consumer-link-rendering
**Created**: 2026-06-08
**Status**: Draft

## Origin

This change originated from a `/fab-discuss` session that audited the README-extraction
contract (`docs/specs/readme-extraction-contract.md`) and asked a two-part question: (a) is there an
instruction telling each of the 7 tool repos to conform to it, and (b) would conforming be *enough* to
solve content-copying issues on shll.ai. A team of four verification sub-agents investigated from
distinct angles (instruction-existence, contract-sufficiency, consumer-code-correctness,
scope-completeness) and converged on a clear split:

- **Conformance is necessary but not sufficient.** Some breakage classes are **consumer-side** —
  defects/limitations in shll.ai's own `extract-readme.ts` + CLIs that **no amount of repo conformance
  can fix**. A tool author can follow the contract to the letter and the site still mishandles their
  content.

A separate, already-completed companion edit added a **§Producer conformance directive** to the
contract so the 7 repos can conform by reading the document. That directive *works around* several of
these gaps by telling authors what to avoid (e.g. "make site-escaping links absolute," "don't use an
HTML `<h1>` title"). **This change fixes the durable, code-side root causes** so the consumer matches
its own contract — i.e. so a conforming repo is actually rendered correctly, and a non-conforming repo
gets a *visible signal* instead of a silent broken page.

> Fix consumer-side README/docs-site content-rendering gaps in extract-readme.ts and the CLIs:
> (1) no closure/link lint on the README slice so site-escaping relative links render as live 404s
> (e.g. content/idea/README.md:85 docs/specs/overview.md); (2) findClosureViolations flags a ..-escape
> while rewriteDocsSiteLinks silently clamps it, misrouting to a wrong real page; (3) gh-theme-only HTML
> images not stripped though contract promises all; (4) head-chrome detection misses YAML frontmatter,
> HTML <h1> titles, and <br>/<hr> badge-row variants, leaking into the slice. These are consumer bugs no
> repo conformance can fix.

**Interaction mode**: conversational. The four gaps below were each established with file:line evidence
during the discussion (the consumer code is the machine-anchored authority per the contract's
§Extraction reference; the agents read it directly and reproduced behavior). Severity tiers were agreed
with the user: gaps 1 & 2 are must-fix, gaps 3 & 4 are should-fix, and a set of by-design tradeoffs are
explicitly **out of scope** (recorded under Non-Goals).

## Why

**The problem.** The contract states *"`extract-readme.ts` is the authority for the mechanical behavior;
the prose above MUST agree with it; on any discrepancy the prose is reconciled to match the code."*
Today, in four places, the **prose promises behavior the code does not deliver**, or the code mishandles
content a conforming author would legitimately write. The result: a tool page renders a broken link, a
wrong page, a wrong-theme image, or a malformed slice — with, in the worst cases, **no warning anywhere**.

**The consequence if we don't.** These are not theoretical. **Gap 1 is live on `main` right now**:
`content/idea/README.md:85` ships `[overview.md](docs/specs/overview.md)`, which renders as a dead
`/tools/idea/docs/specs/overview.md` link — the exact "line-85 404" that change `x0br`'s own intake
flagged as already-broken and deferred. As more tools conform and pull more prose (and as the `docs/site/`
tree lights up), each gap multiplies. The §Producer conformance directive mitigates by steering authors,
but steering is conformance-by-promise; without the code fixes there is no *mechanism* — a careless or
not-yet-conformant repo silently degrades the site, undermining the contract's core anti-drift value
(*understand the tool deeply, accurately, on the site*).

**Why this approach over alternatives.**

- **Fix the code, not just the contract prose.** For each gap we could instead reconcile the prose
  *down* to the weaker code behavior (e.g. "§6 only strips markdown images"). Rejected: the contract's
  promises are the *right* behavior; the code should rise to them. The one exception is where the promise
  is genuinely infeasible to keep robustly (recorded as a Non-Goal, with prose reconciled there).
- **Report-only lints, never publish gates.** Every new check mirrors the established §7 / §closure-lint
  posture: emit a CI `::warning::` and **still commit** the canonical content. This is non-negotiable —
  `4s3e` deliberately flipped the README cross-check from a blocking gate to a reporter precisely because
  *the tool README is canonical; you do not protect a system from its own source of truth*. A README
  link lint that **blocked** would re-introduce the exact anti-pattern `4s3e` removed.
- **Single-sourced pure detectors, pinned by tests.** Each fix extends the existing
  pure/total/dependency-free function shape (`extractReadme`, `findUnknownTokens`, `findClosureViolations`)
  and is pinned by `scripts/extract-readme.test.mjs` (native `node --test`), so the tested behavior and the
  CI/render behavior cannot drift (Constitution I/VI; the contract's single-machine-anchor discipline).

## What Changes

All code changes are in `sites/astro-starlight-terminal1/` — the consumer. No tool-repo change, no new
dependency, all build-time/pure (Constitution I/VI). The contract prose (`docs/specs/readme-extraction-contract.md`)
is reconciled where a promise changes. Four fixes, by agreed severity.

### 1. README slice gets a closure/relative-link lint (MUST — closes the live 404)

**Today.** `findClosureViolations` is invoked **only** by `scripts/extract-docs-site-cli.mjs` for
`docs/site/` pages. The README slice (`scripts/extract-readme-cli.mjs`) runs only `extractReadme` +
`findUnknownTokens` (§7). So a relative link in the README that *leaves the rendered set* — e.g.
`[overview](docs/specs/overview.md)`, `[contributing](CONTRIBUTING.md)`, a relative image — is committed
verbatim and renders as a **live 404 / broken image with no warning**. §9 calls the README the *default*
source, yet it is the only pulled surface with **zero** link checking.

**Change.** Add a **report-only README-slice link lint** to `extract-readme-cli.mjs`, mirroring the
docs/site closure lint exactly (warn + write + exit 0, never withhold). It flags, in the deduced slice:

- a **relative link target** that is not an auto-handled `docs/site/<p>.md` link (those are rewritten by
  `rewriteReadmeDocsSiteLinks`) — i.e. a relative link that will 404 because the consumer does not rewrite
  it and the target is not on the site. Examples flagged: `docs/specs/overview.md`, `CONTRIBUTING.md`,
  `./src/foo.go`, `../other.md`.
- a **relative image target** (images MUST be absolute everywhere, §3).

Implement as a new pure exported detector in `extract-readme.ts` (e.g.
`findReadmeLinkViolations(slice): ReadmeLinkViolation[]` with `kind: 'relative-link' | 'relative-image'`),
reusing the existing `rewriteLinkTargets` scanner + `isAbsoluteTarget` guard so detection and the rewrite
guard cannot drift. The CLI consumes a non-empty result as a `::warning::` naming the file + each target,
then **still writes** `content/<slug>/README.md` and exits 0.

GIVEN a pulled `idea` slice containing `[overview](docs/specs/overview.md)`; WHEN the README lint runs;
THEN a `::warning::` names the file + `docs/specs/overview.md`, the slice is STILL committed, and the CLI
exits 0. GIVEN a slice whose every link is absolute or a `docs/site/` link; WHEN the lint runs; THEN no
warning is emitted.

> **Scope note — detection only, no consumer rewrite.** This change does **not** add a defensive consumer
> rewrite of non-`docs/site/` relative README links (that was deferred by `x0br` Assumption #13 and stays
> deferred — the fix-the-source-of-truth principle says the author makes such links absolute). This change
> only adds the **signal** (warning) that is missing today, plus updates the directive to reference it.

### 2. Reconcile `findClosureViolations` (escape) and `rewriteDocsSiteLinks` (clamp) (MUST)

**Today.** For a `..`-escape inside a `docs/site/` page (e.g. `advanced/hooks.md` linking
`../../install.md`):
- `escapesDocsSite` (`extract-readme.ts:644`) returns `kind: 'escape'` → a non-blocking `::warning::`.
- `resolveSegments` (`extract-readme.ts:559`) **clamps** the over-climb at root
  (`if (stack.length > 0) stack.pop()`), so the render-time rewrite emits a **valid-looking URL pointing
  at a real, different page** (`/tools/<slug>/install` — the top-level docs/site install page or the
  reserved static install slug). The author's broken link is silently rewritten into a *confidently-wrong*
  live link; the only signal is a warning that "never withholds."

**Change.** Make the rewriter's escape handling **consistent with the detector** so an escape does not
masquerade as a working link. Decision (Confident, see Assumptions): on a detected `..`-escape,
`rewriteDocsSiteLinks` emits a **deliberately non-resolving marker URL** instead of a clamped real path —
a path under the tool root that cannot collide with a real page and reads as broken-on-purpose, e.g.
`/tools/<slug>/__unresolved__/<original-target>` (exact token finalized in the plan; MUST NOT match any
emitted route or reserved slug). The page still commits (report-only), the warning still fires, but the
rendered link no longer points at a plausible wrong page — it visibly fails, matching what the lint says.
Single-source the escape detection so the rewriter and `findClosureViolations` use the **same**
escape predicate (no second copy of the `..`-climb math).

GIVEN a docs/site page `advanced/hooks` with `[i](../../install.md)`; WHEN `rewriteDocsSiteLinks` runs;
THEN the target resolves to a non-colliding unresolved marker (not `/tools/<slug>/install`), AND
`findClosureViolations` reports the same target as `escape`. GIVEN an intra-set `[j](../install.md)` that
does NOT escape; WHEN the rewriter runs; THEN it resolves normally to `/tools/<slug>/install`.

### 3. Strip gh-theme-only HTML images, not just markdown (SHOULD — make §6 true)

**Today.** §6 promises *"**any** image whose URL carries `#gh-dark-mode-only`/`#gh-light-mode-only` is
removed."* But `GH_THEME_IMG_RE` (`extract-readme.ts:126`) matches **only** markdown `![…](…)` syntax. §4
explicitly tells authors they may use HTML `<picture>`/`<img>` — those carrying the gh-only fragment
**survive the strip**, rendering the wrong-theme duplicate the contract swears is gone. Prose overstates
code.

**Change.** Extend the §6 strip so it also removes HTML images whose `src`/`srcset` carries
`#gh-dark-mode-only` / `#gh-light-mode-only`: a bare `<img src="…#gh-dark-mode-only…">` line, and a
`<source srcset="…#gh-…">` inside a `<picture>`. Keep it a pure whole-line/region text transform (no DOM
dep), composing with the existing markdown strip. If a `<picture>` is left with no remaining `<source>`/
`<img>`, drop the now-empty wrapper lines (mirror `stripGhThemeImages`'s empty-line cleanup). Add the same
coverage to `findClosureViolations`' image scanning so a relative `<source srcset>` is also seen (it
currently inspects only `href`/`src`, missing `srcset` — a parallel hole noted by the audit).

GIVEN a slice with `<img src="https://x/dark.svg#gh-dark-mode-only">` and a `<picture>` whose only
`<source srcset>` carries `#gh-light-mode-only`; WHEN the strips run; THEN both are removed and no empty
`<picture>` residue remains; a plain `<img>` with no theme fragment survives.

### 4. Harden head-chrome detection (SHOULD — stop slice leaks)

**Today.** `headBoundary` + `BADGE_LINE_RE` (`extract-readme.ts:135,73`) recognize only a markdown `#` H1,
a `>` blockquote, and a narrow set of HTML wrappers (`p|img|picture|source|a|div`). It does **not**
recognize, and therefore **stops the head-skip at** (leaking into the slice):
- a leading **YAML frontmatter** block (`---` … `---`),
- an **HTML heading title** (`<h1 align="center">Tool</h1>` — a very common README idiom; not matched by
  `H1_RE` which requires markdown `#`, nor by `BADGE_LINE_RE` which omits `<h1>`),
- badge/image lines ending in **`<br>` / `<hr>` / `<span>`** (common badge-row separators), which break the
  "contiguous chrome run" so subsequent badges also leak.

**Change.** Extend head-chrome recognition so these are skipped as chrome (not leaked):
- skip a single **leading YAML frontmatter** block when the very first non-blank line is `---` (consume
  through the closing `---`);
- treat a leading **HTML heading** (`<h1…>…</h1>`, possibly multi-line) as head chrome equivalent to the
  markdown H1 (still "only the first leading heading" — a later one is a real section);
- add `br`, `hr`, `span` (and a leading HTML comment `<!-- … -->`) to the head-chrome line allowlist so a
  badge row using them stays contiguous.

Keep the two existing hard requirements documented in the directive (a markdown `#` H1 and no frontmatter
remain the *recommended* author shape) — but the consumer now degrades gracefully instead of producing a
malformed slice when a repo uses the HTML-header idiom. Reconcile §1 prose to enumerate the broadened
chrome set.

GIVEN a README starting with a YAML frontmatter block then `# tool` then badges then prose; WHEN the head
boundary is computed; THEN the frontmatter, H1, and badges are all skipped and the slice begins at prose.
GIVEN a README whose title is `<h1 align="center">Idea</h1>` followed by a badge row; WHEN the head
boundary is computed; THEN the HTML title and the full badge row are skipped (none leak).

### 5. Contract prose reconciliation (in `docs/specs/readme-extraction-contract.md`)

Where a fix changes a promise, reconcile the prose to match the new code (the contract's
self-imposed rule). Specifically: §6 (now covers HTML images), §1 (broadened head chrome), §link-resolution
(escape emits a marker, not a clamped path), and a new note under §closure-lint or §8 that the README slice
is now link-linted (report-only). Add GIVEN/WHEN/THEN per change. Update the §Producer conformance directive
to reference the new README lint (so authors know a relative README link now *warns*).

### 6. Reserved-slug set → `{overview, readme, commands}`: delete hallucinated static pages + update CLI (SHOULD)

**Context.** The contract (PRs #41/#42, merged) shrank the reserved slug set to exactly
`overview`, `readme`, `commands` and released `install`/`workflows` to tool-repo control via `docs/site/`.
This is a *contract* change; the **consumer code still encodes the old 5-item set and still ships the
hand-authored stub pages**. This section brings the code in line with the merged contract — they are
currently out of sync.

**Today.**
- `scripts/extract-docs-site-cli.mjs` hard-codes `RESERVED_SLUGS = {overview, readme, commands, install,
  workflows}` (the old set). So a tool's legitimate `docs/site/install.md` would wrongly warn as a
  reserved-slug collision, AND the static `install`/`workflows` pages would shadow it at the route level.
- Four hand-authored static pages exist with **no canonical source** — `idea` and `fab-kit` each have
  `install.md` + `workflows.md` under `sites/astro-starlight-terminal1/src/content/docs/tools/<slug>/`.
  These are exactly the hand-copied, drift-prone site prose the constitution's *Tool-Page Depth* forbids
  (e.g. `idea/install.md` hardcodes `shll version` / `shll update`). With `install`/`workflows` no longer
  reserved, they must be **removed** so the route space is free for the tool repos' own `docs/site/`
  pages.
- `astro.config.mjs` has explicit sidebar entries for those pages (`idea` + `fab-kit`, the
  `Install`/`Workflows` `slug:` items), and each tool's `overview.mdx` has nav-link bullets pointing at
  `../install/` and `../workflows/`.

**Change.**
1. **Update the CLI reserved set** — `extract-docs-site-cli.mjs` `RESERVED_SLUGS` → `{overview, readme,
   commands}` (drop `install`, `workflows`). A `docs/site/install.md` no longer warns; it mounts at
   `/tools/<slug>/install`.
2. **Delete the four hallucinated static pages** —
   `src/content/docs/tools/idea/install.md`, `…/idea/workflows.md`,
   `…/fab-kit/install.md`, `…/fab-kit/workflows.md`.
3. **Remove their sidebar entries** from `astro.config.mjs` (the `Install`/`Workflows` `slug:` items under
   `idea` and `fab-kit`; leave any unrelated `Workflows` group such as the top-level guides untouched —
   verify line ~175 is not one of these tool pages before removing).
4. **Repair the `overview.mdx` nav links** for `idea` and `fab-kit` — drop the `[Install](../install/)`
   and `[Workflows](../workflows/)` bullets (those pages no longer exist as static pages). If/when the
   tool publishes a `docs/site/install.md`, the build-time sidebar (`docs-site-sidebar.mjs`) surfaces it
   automatically; the thin overview need not hand-link it. Removing the dead bullets prevents a 404.
5. **Verify the build** — `pnpm build` (or the project's build) succeeds with no broken-link/`[WARN]`
   regressions from the removed pages; no remaining reference to the deleted slugs.

> **Note — no `docs/site/` replacement authored here.** This change only *removes* the hallucinated
> site-owned pages and frees the slug space. Authoring real `docs/site/install.md` content is the **tool
> repo's** job (the §Producer conformance directive), out of scope for this consumer change.

GIVEN the merged contract's 3-item reserved set; WHEN `extract-docs-site-cli.mjs` lints a tool's
`docs/site/install.md`; THEN no reserved-slug warning is emitted and the page mounts at
`/tools/<slug>/install`. GIVEN the four static `install`/`workflows` pages are deleted and their
sidebar/nav references removed; WHEN the site builds; THEN the build succeeds with no dangling links and
no pages render at the old `/tools/idea/install` etc. (until a tool publishes its own `docs/site/`
version).

## Affected Memory

- `conventions/readme-extraction`: (modify) the consumer/pull side now includes a **README-slice link
  lint** (report-only), broadened **head-chrome** recognition (frontmatter / HTML `<h1>` / `<br>`-`<hr>`-
  `<span>` / leading comment), HTML-image coverage in the §6 gh-theme strip, and the escape-marker behavior
  in `rewriteDocsSiteLinks`.
- `conventions/docs-site-tree`: (modify) the `..`-escape now rewrites to a non-colliding unresolved marker
  (consistent with `findClosureViolations`) instead of a clamped real path; `srcset` now scanned by the
  closure lint; **reserved-slug set is now `{overview, readme, commands}`** (CLI `RESERVED_SLUGS`
  updated), with `install`/`workflows` owned by the tool repo via `docs/site/`.
- `conventions/tool-page-rubric`: (modify) `install`/`workflows` are no longer site-authored static pages
  — the hand-authored stubs were removed; those slugs now come (if at all) from the tool's `docs/site/`
  tree. The thin `overview.mdx` no longer hand-links install/workflows.

## Impact

- **Code**: `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` (new/extended pure detectors +
  head/strip/rewrite logic), `scripts/extract-readme-cli.mjs` (wire README link lint),
  `scripts/extract-docs-site-cli.mjs` (consume any shared escape predicate change; **update
  `RESERVED_SLUGS` → 3-item set**), `scripts/extract-readme.test.mjs` (regression tests per fix).
- **Static pages + config (section 6)**: delete `src/content/docs/tools/{idea,fab-kit}/{install,workflows}.md`
  (4 files); edit `astro.config.mjs` (remove the `idea`/`fab-kit` Install/Workflows sidebar entries);
  edit `src/content/docs/tools/{idea,fab-kit}/overview.mdx` (remove the install/workflows nav bullets).
- **Render path**: `src/components/ReadmeSlice.astro` and `src/pages/tools/[slug]/[...path].astro` consume
  the same transforms — verify no signature change breaks the call sites (the escape-marker change is
  internal to `rewriteDocsSiteLinks`; the lint is CLI-only, not render-time).
- **Workflow**: `.github/workflows/scheduled-readme-refresh.yml` — the README-step `::warning::` surface
  grows (new lint); always-commit posture unchanged.
- **Docs**: `docs/specs/readme-extraction-contract.md` prose reconciliation (§1, §6, §link-resolution,
  §closure-lint/§8, directive).
- **No new dependency; build-time/pure only.** All detectors stay pure/total (never throw).

## Open Questions

- Exact spelling of the unresolved-escape marker URL (gap 2) — must not collide with any real route or
  reserved slug; finalized in the plan.
- For gap 1, should the README link lint also flag a relative link to a *non-`.md`* docs/site asset
  referenced from the README (rare), or scope strictly to "relative + not a `docs/site/<p>.md` link"? Lean
  to the simpler scope; confirm in plan.

## Non-Goals

- **Not changing report-only to blocking.** No new check becomes a publish gate; all warn + commit
  (preserves `4s3e`'s canonical-source posture).
- **Not adding a defensive consumer rewrite** of non-`docs/site/` relative README links (deferred by
  `x0br` #13; this change adds only the warning).
- **Not adding HTML sanitization** of slices (`set:html` with no `rehype-sanitize`). The trust boundary is
  the `sahil87/*` repos; noted by the audit but a separate security-posture decision, out of scope here.
- **Not closing the vn39 ≤24h fabricated-command window** (§7 report-only by design) or the reserved-slug
  shadow-warning (§9.2 by design) — both conscious contract tradeoffs, not bugs.
- **Not implementing the deferred `<picture>`→`data-theme` mapping** (§4 escape hatch) — orthogonal.
- **Not handling the two admitted §link-resolution shapes** (outer target of a linked image;
  reference-style link defs) — the directive steers authors away from them; robust rewriting needs
  nested-bracket parsing that risks the guard's precision (contract records this as deferred).
- **Not authoring replacement `docs/site/` content** for the deleted install/workflows pages — that is the
  tool repo's job (§Producer conformance directive). Section 6 only removes the hallucinated pages and
  frees the slug space; the routes simply 404-cleanly (no page emitted) until a tool publishes its own.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope is consumer-side only (`sites/astro-starlight-terminal1/`); no tool-repo change | User explicitly framed these as "consumer bugs no repo conformance can fix"; the 4 gaps + the section-6 reserved-slug cleanup all live in shll.ai code/content with file:line evidence | S:98 R:80 A:95 D:95 |
| 2 | Certain | All new checks are report-only (warn + commit + exit 0), never publish gates | `4s3e` established this posture for README/closure; a blocking README lint would re-introduce the anti-pattern it removed (canonical source must not be withheld) | S:95 R:75 A:97 D:96 |
| 3 | Certain | Gap 1 (README link lint) and gap 2 (escape/clamp reconciliation) are must-fix; gaps 3–4 should-fix | User agreed the severity tiering in the discussion; gap 1 is a live 404 on `main` (`content/idea/README.md:85`), gap 2 silently misroutes to a wrong real page | S:96 R:78 A:90 D:92 |
| 4 | Certain | Fix code up to the contract's promises, not reconcile prose down — except where infeasible | The contract's self-rule is "prose reconciled to code," but the promises (strip all theme images, README is default source) are the intended behavior; raising code to them is the correct direction. Infeasible cases recorded as Non-Goals | S:90 R:70 A:88 D:85 |
| 5 | Confident | Gap 2 escape rewrites to a non-colliding unresolved marker URL (vs. clamp-to-real-page or throw) | A marker makes the break visible + consistent with the lint, without violating purity/total (no throw) or withholding (still commits); exact token deferred to plan. Alt (leave clamp, just warn louder) rejected — still renders a confidently-wrong real page | S:80 R:65 A:78 D:70 |
| 6 | Confident | New detectors are pure/total exported functions in `extract-readme.ts`, pinned by `extract-readme.test.mjs` | Matches the single-machine-anchor discipline of every existing detector; Constitution I/VI (build-time, dependency-free); ensures CI/render/test cannot drift | S:88 R:80 A:90 D:88 |
| 7 | Confident | Contract prose (§1/§6/§link-resolution/§closure-lint/directive) reconciled in the same change | The contract requires prose↔code agreement; shipping the code fix without the prose update would itself create the drift the contract forbids | S:85 R:82 A:88 D:85 |
| 8 | Confident | HTML-header / frontmatter repos are degraded-gracefully by the consumer, while the directive still recommends markdown `#` H1 + no frontmatter | Belt-and-suspenders: steer authors (directive) AND make the consumer robust (code). The HTML centered-header idiom is common enough that silent slice-corruption is a real risk | S:82 R:72 A:82 D:78 |
| 9 | Tentative | README link lint scopes to "relative + not a `docs/site/<p>.md` link"; does not special-case relative links to non-md docs/site assets | Simpler, covers the live 404 class; the non-md-asset case is rare and the §closure lint already addresses the docs/site side. Confirm in plan | <!-- assumed: README lint scope kept simple; non-md-asset edge deferred unless plan finds it common --> S:60 R:65 A:62 D:55 |
| 10 | Certain | Section 6 (reserved-slug cleanup): update CLI `RESERVED_SLUGS` to 3-item set, delete the 4 hallucinated `idea`/`fab-kit` install/workflows static pages, repair their sidebar/nav refs; author no replacement | Directly implied by the merged contract (PRs #41/#42); the deleted pages are hand-copied site prose with no canonical source (constitution Tool-Page Depth); replacement `docs/site/` content is the tool repo's job (Non-Goal). Confirmed with user via scope question | S:95 R:60 A:90 D:90 |

10 assumptions (5 certain, 4 confident, 1 tentative, 0 unresolved).
