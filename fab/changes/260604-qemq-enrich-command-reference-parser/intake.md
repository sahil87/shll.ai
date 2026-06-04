# Intake: Enrich Command Reference with Build-Time `-h` Parser

**Change**: 260604-qemq-enrich-command-reference-parser
**Created**: 2026-06-04
**Status**: Draft

## Origin

Initiated in a `/fab-discuss` session exploring how to improve shll.ai, with the
command reference identified as the clearest depth opportunity. During that
discussion we established that the existing `CommandReference.astro` renders each
tool's captured `-h` output as a raw verbatim blob inside a `<pre>` — faithful but
flat: structured fields (`short`, `usage`, `path`) are captured yet barely used,
and the rich content (flags, types, defaults, examples) stays trapped in the text.

A working **Python prototype** was built and run against the real data:
**all 6 tools, 120 commands, 156 flags parsed with zero ragged lines.** A
side-by-side HTML mockup (`wt create`, raw vs. enriched) demonstrated the payoff.
This change ports that proven prototype to a build-time TypeScript module and wires
it into the live Starlight site.

Interaction mode: conversational (`/fab-discuss` → exploration → mockup →
`/fab-new`). Three scoping decisions were made explicitly via a structured question:

1. **Scope** — *everything in one change* (parser + enriched render + per-command
   filter + cross-tool flag index), not a phased rollout.
2. **Architecture** — *separate parser module* (`src/lib/parse-help.ts`), not parsing
   inline in the component frontmatter — for reusability (the index page) and unit
   testability.
3. **Raw fallback** — *always keep raw behind a per-command "show raw" toggle*; the
   parser is display-only and the verbatim `-h` text is never lost.

> Enrich the generated command reference with a build-time -h parser. Add a separate parser module (sites/astro-starlight-terminal1/src/lib/parse-help.ts) that decomposes each captured Cobra `text` blob into structured parts — description, usage, examples, and flags[] (short, long, value-placeholder, argtype, default, required, desc). Anchor ONLY on known Cobra headers; treat everything before the first anchor as free-form description and never force-parse prose (hop/shll carry hand-written Long blocks). Then have CommandReference.astro import the parser and render the structured view: flags table (name · type/required badges · description), copy affordances on path/usage/each flag, a per-command flag filter, suppress the boilerplate -h/--help row, and keep raw verbatim -h behind a "show raw" toggle. Also add a build-time-generated cross-tool flag/command index page. Constraints: all parsing at BUILD TIME (Constitution I); filter/index search are progressive-enhancement client JS over static content; do NOT touch the help-dump contract or tool repos (spec §5 — parse for display only, never for tree structure); raw text stays the verbatim authority; no new runtime dependency; dark-mode parity via --c-* tokens; keyboard-navigable with visible focus. change_type: feat.

## Why

**Problem.** The command reference is the site's deepest content surface, but today
it is a verbatim terminal dump. Flags are space-aligned text that wraps poorly on
mobile; nothing is individually copyable (a reference's #1 job is "let me grab
this"); types/defaults/required-ness are prose, not scannable; and there is no way
to search across tools. The structured value Cobra hands us for free is discarded
at render time.

**Consequence if not addressed.** The reference stays a screenshot-of-a-terminal —
correct but low-utility. The site under-delivers on its single strongest
differentiator (a fresh, generated, multi-tool reference) and visitors bounce to
each tool's GitHub README, undercutting the site's reason to exist (a directory
into the toolkit).

**Why this approach over alternatives.**
- *Parse at build time, site-side* (chosen): zero coordination with the 7 tool
  repos, zero runtime cost, fully static output. The captured `text` is already in
  hand; we decompose it for display only.
- *Enrich the schema so tools emit structured `flags[]`* (rejected for now): the
  durable long-term answer per contract §8, but requires a coordinated/staged
  rollout across 7 repos. Build-time parsing delivers the same UX today with no
  external dependency, and the structured layer it produces is exactly what a
  future schema enrichment would slot into.
- *Leave raw, just style it* (rejected): doesn't unlock copy-per-flag, badges,
  filter, or the cross-tool index — the actual depth wins.

**Compliance note (load-bearing).** Spec §5 (`help-dump-contract.md`) forbids
parsing `-h` text to discover **tree structure** — that is a *producer-side*
obligation on the tools, and the tree still comes from the JSON `commands[]`. This
change parses the already-captured `text` for **display only**, never for
structure, and keeps the raw `text` as the verbatim authority. It does not touch
the contract, `schemas.ts`'s validated shape, or any tool repo.

## What Changes

### 1. New build-time parser module — `src/lib/parse-help.ts`

A pure, dependency-free TypeScript module (port of the proven Python prototype)
exporting a `parseHelp(text: string)` function that decomposes a Cobra `-h` blob:

```ts
interface ParsedFlag {
  short: string | null;       // "h" from "-h"
  long: string;               // "worktree-name"
  placeholder: string | null; // value placeholder, MAY contain spaces ("brew update", "cmd[=__rk_riff_pane_bare__]")
  argtype: string | null;     // best-effort type token when the placeholder is a simple type ("string")
  default: string | null;     // extracted from a trailing "(default ...)"
  required: boolean;          // "(required)" present in desc
  desc: string;               // description with the "(default ...)" suffix stripped
}
interface ParsedHelp {
  description: string;        // everything before the FIRST Cobra section anchor (free-form, verbatim)
  usage: string[];            // lines under "Usage:"
  examples: string;           // block under "Examples:" (often empty)
  flags: ParsedFlag[];        // under "Flags:"
  globalFlags: ParsedFlag[];  // under "Global Flags:"
}
```

**Parsing rules (verbatim from the prototype):**
- **Anchor ONLY on known Cobra headers**: a line matching exactly
  `^(Usage|Aliases|Examples|Available Commands|Flags|Global Flags):\s*$`.
- **Description = everything before the first anchor** — preserved as-is. Never
  force-parse prose. (`hop` has a hand-written second `Usage:` block + "Notes" /
  "Getting started"; `shll` has a "Subcommands:" block — these stay in the
  description blob untouched.)
- **Flag grammar**: `^\s* (?:-X,\s+)? --long (?:[ \t]<placeholder>)?? \s{2,} <desc>`
  — the description begins at the **2-or-more-space gap**; the placeholder is
  whatever sits between `--long` and that gap (and MAY contain spaces). A trailing
  `(default …)` is split out of `desc` into `default`.
- **Missing sections are simply absent**, never an error.
- The trailing `Use "<tool> [command] --help" …` footer is discarded.

A small unit test (e.g. `src/lib/parse-help.test.ts` or a `scripts/` check)
asserts the known edge cases parse with zero ragged flag lines across all
committed `help/*.json`: `wt create` (6 flags, types), `rk riff`
(`--cmd cmd[=__rk_riff_pane_bare__]`), `wt update` / `idea update` / `hop update` /
`shll shell-setup` (multi-word placeholders), and `hop` root (prose-only, no
`Flags:` section → empty `flags`, description preserved).

### 2. Enriched render in `CommandReference.astro`

The component imports `parseHelp` and, per node, renders a **structured view**:

- **Command header**: the `path` (e.g. `wt create`) with a copy-to-clipboard
  button.
- **Description**: the parsed free-form description (its own block), not buried
  above the flags.
- **Usage**: each usage line with a copy button.
- **Flags table**: columns *flag name · description*, with **type** and
  **required** rendered as visual badges; each row has a copy button that copies
  the flag token (e.g. `--worktree-name `). The boilerplate `-h, --help` row is
  **suppressed per-command** (it repeats on all 120 commands) — BUT this suppression
  MUST be paired with a **single, prominent global note** (rendered once on the
  reference page / index, not per command) stating that `-h`/`--help` work on every
  command and `-v`/`--version` at the tool root. Suppressing the rows without this
  note would wrongly imply those commands lack help; the note preserves that the
  affordance is universal while removing the visual repetition.
  <!-- clarified: #7 — suppress per-command -h/--help rows AND add a one-time global note that -h/--help work everywhere; raw view still shows the rows verbatim -->
  The "show raw" toggle still surfaces the verbatim `-h`/`--help` rows for any
  command.
- **Examples**: rendered as a block when present (currently rare).
- **Per-command flag filter**: a small input that narrows the flags table
  client-side (progressive enhancement over already-rendered rows).
- **"Show raw" toggle** (native `<details>`): reveals the verbatim `-h` `text` —
  the authoritative fallback. If parsing yields an empty `flags` set but the raw
  text clearly has content (e.g. a prose-only root), the raw view is the primary
  content for that node.

Structure (the `<details>` tree, recursion via `Astro.self`, the build-time `fs`
read with `findRepoRoot`, the missing→placeholder / invalid→build-fail behavior)
is **unchanged** — only each node's body gets the structured treatment. Styling
reuses the terminal `--c-*` tokens (dark-mode parity, Constitution V); collapsibles
stay native `<details>`/`<summary>`; new interactive controls (copy buttons,
filter) are keyboard-navigable with visible `:focus-visible` states (Accessibility).

### 3. New cross-tool flag/command index page

A build-time-generated page at **`src/content/docs/reference/command-index.mdx`**
(slug `/reference/command-index`, in a **new "Reference" Starlight sidebar group**)
plus a backing component, that flattens command + flag entries across all tools into
a single searchable list — answering questions like "which tools have `--json`?" or
"where is `--non-interactive`?". Built at build time from the same `help/*.json` via
`parseHelp`; a client-side search input filters the pre-rendered rows (progressive
enhancement). Each entry links to the owning tool's `commands` page (deep-link/anchor).
<!-- clarified: #10 — index slug = /reference/command-index in a new "Reference" sidebar group, over a top-level /commands hub or nesting under Tools -->

**Index scope** (clarified): include every **command path** AND every **real flag**
across all tools, with `Global Flags` included. **Exclude the boilerplate**
`-h`/`--help` and `-v`/`--version` rows (the universal-help fact is carried by the
one-time global note from §2, not by repeating these rows here). **Prose-only roots**
(e.g. `hop` root with no `Flags:` section) are listed as **commands** (no flag rows).
<!-- clarified: #11 — index = commands + real flags (incl. Global Flags), excluding -h/--help/-v/--version boilerplate; prose-only roots listed as commands -->

The new "Reference" sidebar group is added in `astro.config.mjs`.

### 4. Constraints honored

- **Build-time only** — `parseHelp` runs in component/page frontmatter during
  `astro build`; the filter and index search are client JS that only filters
  already-static content. No runtime, no data-fetch (Constitution I).
- **No tool-repo / contract changes** — display-only parse; `text` stays the
  verbatim authority; `schemas.ts` and `help-dump-contract.md` untouched.
- **No new runtime dependency** (Constitution VI) — plain TS string parsing.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) — the "Generated Command reference
  (exception)" section gains the enriched/structured render + the new cross-tool
  index page as part of the generated reference surface.
- `conventions/help-collection`: (modify) — "Rendering Consumer (CommandReference)"
  gains the build-time `parseHelp` decomposition step, the structured view, the
  show-raw fallback, and the new cross-tool index consumer; note the explicit
  display-only-vs-structure boundary against spec §5.

> The forward contract (`docs/specs/help-dump-contract.md`) is **not** modified —
> this change is purely consume-side and changes nothing the tools must emit.

## Impact

- **New**: `sites/astro-starlight-terminal1/src/lib/parse-help.ts` (+ a unit test).
- **New**: a cross-tool command-index page + backing component under
  `sites/astro-starlight-terminal1/src/`.
- **Modified**: `sites/astro-starlight-terminal1/src/components/CommandReference.astro`
  (structured render; recursion/read/failure-mode plumbing unchanged).
- **Modified**: `sites/astro-starlight-terminal1/astro.config.mjs` (new "Reference"
  sidebar group with the `command-index` page).
- **Data**: consumes existing `help/*.json` (6 present; `tu` still absent → existing
  placeholder path unchanged). No new data captured.
- **Dependencies**: none added.
- **Risk**: parser brittleness to future Cobra format changes — mitigated by the
  always-available raw fallback and the unit test pinning current behavior.

## Open Questions

_All resolved during `/fab-clarify` (2026-06-04) — see `## Clarifications`._

- ~~Exact slug/placement for the cross-tool index page~~ → `/reference/command-index`
  in a new "Reference" sidebar group.
- ~~Whether the index should include `Global Flags` and prose-only roots~~ → include
  commands + real flags (incl. Global Flags), exclude `-h`/`-v` boilerplate; prose-only
  roots listed as commands.

## Clarifications

### Session 2026-06-04

| # | Action | Detail |
|---|--------|--------|
| 10 | Changed | Index slug = `/reference/command-index` in a new "Reference" sidebar group |
| 11 | Changed | Index scope = commands + real flags (incl. Global Flags), exclude `-h`/`-v` boilerplate; prose-only roots as commands |
| 7 | Changed | Confirmed per-command `-h/--help` suppression, refined to ALSO add a one-time global note that `-h`/`--help` work everywhere (`-v`/`--version` at root) |
| 8 | Confirmed | — |
| 9 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Parse at BUILD TIME, site-side; raw `text` stays verbatim authority | Constitution I + the captured `text` is already in hand; established in discussion | S:98 R:80 A:95 D:95 |
| 2 | Certain | Display-only parse — never for tree structure; contract/tool repos untouched | Spec §5 binds the producer's tree discovery, not site-side display parsing; confirmed in discussion | S:97 R:75 A:96 D:95 |
| 3 | Certain | Separate parser module `src/lib/parse-help.ts`, not inline in the component | User chose "separate parser module" explicitly (reusable for index, unit-testable) | S:97 R:70 A:92 D:96 |
| 4 | Certain | Full scope in one change (parser + render + filter + cross-tool index) | User chose "everything in one change" explicitly | S:96 R:55 A:88 D:94 |
| 5 | Certain | Always keep raw `-h` behind a per-command "show raw" toggle | User chose "always keep raw behind a toggle"; parser is display-only, raw never lost | S:97 R:85 A:94 D:96 |
| 6 | Certain | Parser grammar/anchors per the proven prototype (6 tools/120 cmds/156 flags, 0 ragged) | Empirically validated against all committed `help/*.json` this session | S:98 R:75 A:97 D:95 |
| 7 | Certain | Suppress per-command `-h, --help` rows AND add a one-time global note that `-h`/`--help` work everywhere (`-v`/`--version` at root) | Clarified — user confirmed suppression, refined to require a universal-help note so suppression doesn't imply commands lack help; raw view still shows the rows | S:95 R:90 A:85 D:88 |
| 8 | Certain | Filter + index search are progressive-enhancement client JS over static content | Clarified — user confirmed | S:95 R:85 A:88 D:85 |
| 9 | Certain | Reuse existing terminal `--c-*` tokens for all new UI (dark-mode parity) | Clarified — user confirmed | S:95 R:90 A:90 D:90 |
| 10 | Certain | Cross-tool index at `/reference/command-index` in a new "Reference" sidebar group | Clarified — user chose this over a top-level `/commands` hub or nesting under Tools | S:95 R:70 A:60 D:55 |
| 11 | Certain | Index = commands + real flags (incl. Global Flags), excluding `-h`/`-v` boilerplate; prose-only roots listed as commands | Clarified — user confirmed recommended scope | S:95 R:72 A:62 D:58 |

11 assumptions (11 certain, 0 confident, 0 tentative, 0 unresolved).
