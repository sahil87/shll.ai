# Intake: Content / Keyword Depth Pass (Editorial SEO)

**Change**: 260618-bees-content-keyword-seo-pass
**Created**: 2026-06-18

## Origin

Backlog item `[bees]` (2026-06-18) — the third and final item of the SEO/agent-discoverability
discussion batch. Its two siblings already shipped: `[354p]` (build-time `/llms.txt` +
`/llms-full.txt`, PR #69) and `[pgox]` (per-page JSON-LD, PR #70). Those were mechanical;
`bees` is the **editorial** work — "higher-payoff but less mechanical."

> Content / keyword depth pass on the live site (sites/astro-starlight-terminal1) — the editorial
> SEO work. Scope: (1) unique, keyword-bearing meta descriptions per tool page; (2) stronger
> H1s/headings and the 'what is shll / why use it / who it's for' framing that actually ranks, on
> the homepage and getting-started/overview; (3) deliberate internal linking between related tool
> pages (idea→fab-kit→wt→run-kit workflow chain) so crawlers and agents see the toolkit as a
> connected graph, not 7 islands; (4) confirm every page has a non-empty, unique `<title>` + meta
> description. CONSTRAINT: respect the canonical-source discipline — tool-page deep prose is
> mechanically synced from each repo's README (Constitution Tool-Page Depth); editorial work here
> targets SITE-AUTHORED framing (homepage, getting-started, overview directory entries), NOT the
> pulled README slices, and any command/flag mention in hand-written prose MUST pass the vn39
> help-json cross-check. Static-first, zero new deps.

**Interaction mode**: one-shot intake from a pre-discussed backlog item, with one interactive SRAD
question resolved at intake (the meta-description source-of-truth decision — see Assumption #1).

**Key decision reached at intake**: The backlog recommends "single-source meta descriptions from
`help/<tool>.json` where possible." A live audit found this premise is **partly stale** — every
editable page already carries a unique, hand-authored frontmatter `description`, and those are
markedly more keyword-rich than the terse `root.short` values (e.g. fab-kit's
`6-stage pipeline that forces AI agents to plan before they code.` vs. `root.short`'s
`Fab workflow engine — single binary replacement for kit shell scripts`). The user resolved this:
**keep and editorially refine the hand-authored descriptions; do NOT downgrade to `root.short`.**
`root.short` remains the single source only for the `pgox` JSON-LD `SoftwareApplication.description`
node, where it already lives. Meta descriptions are therefore a hand-authored-prose surface bound by
the vn39 hard rule.

## Why

**The problem.** The two mechanical SEO siblings (`354p`, `pgox`) made the site legible to crawlers,
social scrapers, and coding agents at the *markup* level — but markup quality is capped by *content*
quality. Three editorial gaps remain that no amount of JSON-LD fixes:

1. **Tool-page H1s are bare tool names.** Every `tools/<tool>/overview.mdx` renders its H1 from the
   Starlight frontmatter `title:`, which is just the bare slug (`idea`, `wt`, `fab-kit`). A bare
   one-word H1 carries almost no ranking signal and no "what is this / why care" framing for a
   first-time visitor arriving from search.
2. **The toolkit reads as 7 islands.** No `overview.mdx` links to any *other* tool's page (audited:
   zero cross-tool links in all 7 overviews). The `idea → fab-kit → wt → run-kit` workflow chain is
   described in prose on `getting-started/overview.md` but is **not hyperlinked** between the tool
   pages themselves. Crawlers and agents see seven disconnected leaves, not a connected graph —
   weak internal-link equity and weak "these tools compose" signal.
3. **Homepage / overview framing is thin on ranking-oriented copy.** The homepage hero tagline and
   the `getting-started/overview.md` intro are good but terse; they under-serve the
   "what is shll / why use it / who it's for" queries that actually rank.

**The consequence if unfixed.** The mechanical layer is in place but under-leveraged: thin H1s and a
disconnected link graph cap the organic-search and agent-comprehension payoff of `354p`/`pgox`. This
is the "higher-payoff" item precisely because content beats markup for ranking.

**Why this approach (editorial, scoped to site-authored surfaces).** The canonical-source discipline
(Constitution § Tool-Page Depth) is non-negotiable: the deep per-tool prose is the tool's own README,
mechanically synced and rendered **verbatim** on the `readme` page. So editorial work CANNOT touch
those synced slices — it targets only the **site-authored framing**: `overview.mdx` thin entries, the
`getting-started/*` pages, `tools/index.mdx`, the homepage, and the `reference/command-index` intro.
This keeps the two authors cleanly separated (site framing vs. the tool's canonical words) exactly as
the constitution requires, and adds zero dependencies (static MDX edits only — Constitution I, VI).

## What Changes

All edits are confined to **site-authored content files** under
`sites/astro-starlight-terminal1/src/content/docs/`. **No** edits to `readme.mdx` (synced slice),
`commands.mdx` (generated), `help/<tool>.json`, or any build code. This is a content-only change.

### 1. Meta descriptions — keep & refine hand-authored (NOT single-sourced from root.short)

**Resolved decision (Assumption #1).** Every editable page already has a unique frontmatter
`description`. They are kept as the SEO source of truth and editorially sharpened for keyword
coverage and uniqueness — they are **not** replaced by `help/<tool>.json` `root.short` (which is
terser and would downgrade them). `root.short` stays the source only for the `pgox` JSON-LD node.

Audit of current tool-page descriptions (all present, all unique — refine in place, do not regress):

| Tool | Current frontmatter `description` |
|------|-----------------------------------|
| fab-kit | `6-stage pipeline that forces AI agents to plan before they code.` |
| hop | `Fuzzy-nav, batch-git, and run-anything-inside-any-repo from one hop.yaml config.` |
| idea | `Plain-Markdown backlog tracker — worktree-aware, queryable from the CLI, feeds /fab-new.` |
| run-kit | `Browser dashboard for tmux + Claude Code workspaces. Mobile-friendly via Tailscale.` |
| shll | `Meta-CLI to install, update, and shell-wire the whole toolkit in one command.` |
| tu | `Token/cost tracker for Claude Code, Codex, OpenCode. Multi-machine sync, live watch mode.` |
| wt | `Opinionated git worktree wrapper — one worktree per change, one AI session per worktree, zero conflicts.` |

Refinement criteria (apply per page, conservative — these are already good): ensure each is
≤ ~155 chars (snippet length), leads with the highest-value keyword, names the *job* not the
binary, and is unique across the site. Where a description is already optimal, leave it byte-for-byte.
The same pass covers the non-tool pages (`getting-started/*`, `tools/index`, `reference/*`,
`workflows/*`, homepage) — all already have descriptions (see Impact audit); refine only where a
description is thin, generic, or duplicative.

**vn39 binding rule**: any command/flag named in a refined description (hand-written prose) MUST exist
in the corresponding `help/<tool>.json`. Cross-check before finalizing (see § Verification).

### 2. Stronger H1s / headings on tool overviews + homepage/overview framing

**Tool overviews** (`tools/<tool>/overview.mdx`): the bare-slug H1 stays as the Starlight
`title:` (changing it risks the sidebar label and the `shll | shll` title discipline settled at
`kb1r`), but each overview body gains a **lead sentence reframed around the job** — a "what
is `<tool>` / why use it / who it's for" opening that surfaces ranking keywords in the first
indexable paragraph, replacing or augmenting the current single terse sentence. Example for `idea`:

```mdx
`idea` is a plain-Markdown backlog tracker for AI-assisted development — it captures and manages a
per-repo backlog in a single `fab/backlog.md` file, worktree-aware and queryable from the CLI, and
it's the same file `fab-kit`'s `/fab-new` reads to start a change. If you run multiple coding agents
in parallel, `idea` is where work waits its turn.
```

(Note: this body prose names `/fab-new` — a `fab-kit` command — which must pass the vn39 check
against `help/fab-kit.json`. `fab/backlog.md` is a file path, not a command, so it is exempt.)

**Homepage** (`index.mdx`) and **`getting-started/overview.md`**: sharpen the "what is shll / why /
who it's for" framing. The homepage already carries indexable HTML prose under the `cat ABOUT.md`
motif (change `ld0j`) — extend/sharpen that copy for keyword coverage; do not invent new claims
(the `ld0j` copy was lifted from `overview.md`/`philosophy.md`, not invented — preserve that
discipline). The hero tagline (`Seven small CLIs that force AI agents to plan before they code.`) is
strong; leave it unless a clearly better keyword-bearing variant emerges.

### 3. Internal linking — connect the workflow chain (the highest-value item)

Add **deliberate cross-tool links** so the toolkit reads as a connected graph. The canonical chain
the backlog names is `idea → fab-kit → wt → run-kit`, with `tu` (cost) and `hop` (repo nav) as
cross-cutting, and `shll` as the bootstrap.

Mechanism: add a small **"Related tools" / "How it fits"** subsection to each `overview.mdx` body
(site-authored — the overview is the directory entry, this is exactly its job per the constitution),
linking to the adjacent tools in the workflow with one-line context. Example for `idea`:

```mdx
## How it fits

`idea` feeds the pipeline: a backlog item becomes a change in **[fab-kit](../../fab-kit/overview/)**
via `/fab-new`, which runs inside an isolated **[wt](../../wt/overview/)** worktree. Watch the cost
of the whole run with **[tu](../../tu/overview/)**.
```

Link targets are the canonical `/tools/<tool>/overview/` entry pages (relative MDX links, matching
the existing `[Readme](../readme/)` / `[Commands](../commands/)` style already in each overview).
The `getting-started/overview.md` ASCII workflow diagram already shows the chain — make its tool
names **links** to the overview pages too, so the diagram is navigable, not just illustrative.

**Per-page link map** (the connected graph — final shape may adjust at apply per editorial judgment,
recorded as Assumption #4):

- `idea` → fab-kit, wt, tu
- `fab-kit` → idea (source), wt (where it runs), run-kit (monitor)
- `wt` → fab-kit (what runs in it), run-kit (dashboard over worktrees)
- `run-kit` → wt (sessions it shows), tu (cost overlay)
- `tu` → (cross-cutting) fab-kit, run-kit
- `hop` → (cross-cutting nav) idea, wt
- `shll` → (bootstrap) links to all / the install page

### 4. Title + meta-description completeness audit

Confirm every rendered, indexable page has a non-empty, unique `<title>` and meta `description`.
**Audit finding: already satisfied** — all 8 editable content surfaces carry unique frontmatter
`description`s and Starlight emits a per-page `<title>` for each (see § Impact). This item is
therefore a **verification gate**, not a generation task: re-confirm post-edit that no description
was accidentally duplicated or emptied during the refinement pass, and that titles remain unique
(the deliberate `shll | shll` on `tools/shll/overview/` and the homepage's `shll — the AI coding
toolkit` override are correct-by-design per `kb1r` — do not "fix" them).

### Out of scope (explicit non-goals)

- **No edits to `readme.mdx` (synced README slice) or `commands.mdx` (generated)** — canonical-source
  discipline (Constitution § Tool-Page Depth). Editorial work touches site-authored framing only.
- **No edits to `help/<tool>.json`** — those are the canonical machine source; this change consumes
  them (vn39 cross-check) but never edits them.
- **No new dependencies, no build-code changes, no new components** — content-only MDX/Markdown edits
  (Constitution I, VI). If a "Related tools" pattern wants a shared component, that is a *future*
  mechanical change, not this editorial pass.
- **No change to the `pgox` JSON-LD or `354p` llms.txt logic** — those single-source `root.short`
  and are unaffected; this pass does not touch their inputs.
- **No sub-item breakdown into separate changes** — the backlog said "break into per-page sub-items
  at intake"; resolved as in-change phases/tasks (per-page tasks within this one change), not
  separate fab changes (Assumption #6).

## Affected Memory

- `conventions/seo-social-meta.md`: (modify) Add an editorial-layer note: meta descriptions are
  **hand-authored and SEO-optimized** (NOT single-sourced from `root.short` — that decision and its
  rationale belong on record beside the `pgox`/`354p` notes that DO single-source `root.short`).
  Record the cross-tool internal-linking convention (the `idea→fab-kit→wt→run-kit` graph) and the
  "How it fits" overview subsection pattern. This is the established home for the site's SEO story.
- `conventions/tool-page-rubric.md`: (modify) Record that `overview.mdx` bodies now carry a
  job-framed lead sentence + a "How it fits" cross-tool linking subsection, reinforcing the overview
  = site-authored directory entry role (vs. the synced `readme` page). Note the vn39 hard rule
  applies to any command/flag named in this hand-written framing prose.

## Impact

**Files edited** (all site-authored content; counts from live audit):

- `src/content/docs/tools/{fab-kit,hop,idea,run-kit,shll,tu,wt}/overview.mdx` — 7 files: lead-sentence
  reframe + "How it fits" linking subsection; refine frontmatter `description` if warranted.
- `src/content/docs/index.mdx` — homepage framing copy (the `cat ABOUT.md` prose), description refine
  if warranted. **Do not touch** the `head:` overrides block (kb1r title/og overrides — settled).
- `src/content/docs/getting-started/overview.md` — "what is shll / who for" framing; make the ASCII
  workflow-diagram tool names into links.
- `src/content/docs/getting-started/{install,philosophy}.md` — description/heading refine only if thin.
- `src/content/docs/tools/index.mdx` — already strong; refine description only if warranted.
- `src/content/docs/reference/command-index.mdx`, `src/content/docs/workflows/{daily-flow,new-change}.md`
  — completeness audit only (descriptions already present and unique).

**Current title/description audit** (all editable pages — every one already has a unique description):
8 content surfaces audited, all with non-empty unique frontmatter `description:`; Starlight emits a
unique per-page `<title>`. So item (4) is a re-verify gate, and item (1) is refine-in-place, not
fill-from-empty.

**No impact on**: build pipeline, dependencies, `help/<tool>.json`, the `pgox` JSON-LD dispatcher,
the `354p` llms.txt endpoints (they re-read the same content on the daily refresh — an MDX edit here
is automatically also an `llms-full.txt` content change, which is the intended `354p` coupling),
Starlight config, components, or any runtime behavior.

**Verification surface**: `pnpm build` must succeed; the vn39 cross-check (`node
scripts/validate-help.mjs` confirms help JSON is valid; manual grep of any command/flag token in
edited prose against `help/<tool>.json`) must pass for all hand-written command mentions.

## Open Questions

- None blocking. The one decision that needed a human — the meta-description source of truth — was
  resolved at intake (Assumption #1: keep & refine hand-authored). The exact final wording of each
  refined description, lead sentence, and the precise link map are editorial calls made at apply and
  recorded as graded assumptions; none are Unresolved.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Meta descriptions: keep & editorially refine the existing hand-authored frontmatter `description`s; do NOT downgrade to `root.short`. `root.short` stays the source only for the `pgox` JSON-LD node. | User-resolved at intake via SRAD question — the central tension (backlog rec vs. the better existing descriptions). No longer open. | S:95 R:80 A:90 D:95 |
| 2 | Certain | Scope is site-authored content only: the 7 `overview.mdx`, `index.mdx`, `getting-started/*`, `tools/index.mdx`, `reference/*`, `workflows/*`. NO edits to `readme.mdx` (synced) or `commands.mdx` (generated). | Directly dictated by Constitution § Tool-Page Depth (canonical source = the synced README/generated commands; editorial work targets framing). Not a judgment call. | S:90 R:75 A:100 D:95 |
| 3 | Certain | vn39 hard rule applies: any command/flag named in refined hand-written prose MUST exist in `help/<tool>.json`; cross-check before finalizing (`validate-help.mjs` + token grep). | Constitution binds the vn39 rule as a HARD rule for hand-written site prose (report-only only for the synced slice). Mechanism (`scripts/validate-help.mjs`) confirmed present. | S:90 R:70 A:100 D:90 |
| 4 | Confident | Internal linking via a "How it fits" subsection on each `overview.mdx` linking adjacent tools in the `idea→fab-kit→wt→run-kit` chain (+ tu/hop cross-cutting), targets `/tools/<tool>/overview/`. | Backlog names the chain exactly; the overview = site-authored directory entry is its constitutional job. Exact per-page link set is an editorial call (one obvious front-runner). | S:75 R:80 A:80 D:70 |
| 5 | Confident | Tool-page H1 stays the bare-slug Starlight `title:`; "stronger H1/heading" is delivered via a job-framed lead sentence + headings in the body, not by changing the frontmatter title. | Changing `title:` cascades to the sidebar label and the settled `kb1r` title discipline (`shll | shll`); the body lead is where ranking-keyword framing safely lives. | S:70 R:75 A:85 D:75 |
| 6 | Confident | "Break into per-page sub-items at intake" is realized as per-page phases/tasks WITHIN this one change, not as separate fab changes. | A single editorial pass with shared conventions (vn39, linking graph) is one coherent unit of work; splitting into 8 changes would fragment the convention. Reversible (could split later). | S:70 R:85 A:80 D:75 |
| 7 | Tentative | Homepage/overview framing is refined by sharpening the EXISTING `ld0j` `cat ABOUT.md` prose for keywords, not by adding new sections or new claims. | `ld0j` deliberately lifted copy from `overview.md`/`philosophy.md` rather than inventing; preserving that keeps claims sourced. Multiple valid editorial depths exist — front-runner is conservative sharpening. | S:60 R:80 A:65 D:55 |

7 assumptions (3 certain, 3 confident, 1 tentative, 0 unresolved).
