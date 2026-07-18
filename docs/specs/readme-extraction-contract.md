# Spec: README-extraction contract

**Status**: Active
**Created**: 2026-06-04 (change `w32m`)
**Extraction anchor**: [`sites/astro-starlight-terminal1/src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts)
**Consumed by**: [`docs/memory/conventions/readme-extraction.md`](../memory/conventions/readme-extraction.md) *(created at hydrate)*
**Sibling contract**: [`help-dump-contract.md`](./help-dump-contract.md)
**Producer-facing standard**: [`sahil87/shll` → `docs/site/standards/readme-extraction.md`](https://github.com/sahil87/shll/blob/main/docs/site/standards/readme-extraction.md), rendered at [shll.ai/shll/standards/readme-extraction](https://shll.ai/shll/standards/readme-extraction)

> **Producer/consumer split (2026-07-17).** The **producer-facing standard** — the page a tool repo reads to conform — now lives canonically in the shll repo's `docs/site/standards/` tree (linked above), alongside the toolkit-wide [CLI principles](https://shll.ai/shll/standards/principles). It distills this spec's producer rules (§1–§6, §9.1/§9.2, and the §Producer conformance directive). THIS spec remains the **consumer-side authority**: the machine-anchored extraction behavior (`extract-readme.ts`), the pull workflow, the lints and link-resolution transforms, and the render model. On any divergence over producer obligations, the shll standard is corrected to agree with the extraction anchor here — `extract-readme.ts` stays the single machine-checkable truth (§Extraction reference).

## Overview

This is the forward contract for how each shll toolkit CLI's `README.md` MUST be
structured so that shll.ai can pull a **deduced, curated slice** of it and render that slice
on the tool's page. It is the README-prose counterpart to [`help-dump-contract.md`](./help-dump-contract.md)
(which governs the machine-generated command reference). The two are intentionally symmetric:
a **producer-facing standard** in the shll repo (see the split note above) + a **consumer** (this
spec's scheduled pull workflow + build-time render component).

**The asymmetry with `help-dump` (state it plainly).** `help-dump` asks each tool to *emit a new
artifact* (a JSON envelope). This contract mostly **constrains an artifact tools already have** —
the README. It is therefore partly *"keep this structure"* rather than *"emit this."* The
practical consequence: there is no new subcommand to write and no new file to ship from the tool
side — a tool author's obligation is to keep the README's top structure conformant and to commit
rendered images for any diagram destined for the site.

**Anti-drift framing.** The tool repo is **canonical**; shll.ai never hand-copies README prose.
A scheduled job pulls the curated slice on a daily cadence and commits it to the repo root, so the
site's per-tool prose is fresh *by construction* — the precise drift `vn39` had to clean up
(fabricated commands/flags **hand-copied** onto the site) cannot recur, because nothing is
hand-copied. The README is **canonical and rendered verbatim**; the `help/<tool>.json` cross-check
(§7) is a **non-fatal divergence reporter**, not a publish gate — it surfaces a command/flag mismatch
as a repo-level lint (a CI `::warning::`) so the fix lands where it belongs (the tool's README),
without ever withholding the canonical slice.

**Why structural deduction (not skip-markers).** Every toolkit README shares the same top
structure (H1 → toolkit blockquote → badges → content). The site slice is therefore **deduced
mechanically** from that structure (§1 head, §2 tail) with no per-README marker discipline that
could rot. Markers rot; structure does not.

> **Out-of-scope boundary.** Conforming the 7 *external* tool repos' READMEs to this contract is a
> forward, per-repo, gradual activity (exactly like the help producers) — **NOT** part of the change
> that publishes this contract. shll.ai's pull + render wiring is complete for all 7 slugs and
> degrades to a neutral placeholder for any tool whose README is not yet conformant (or whose first
> pull has not yet succeeded). The per-repo conformance work itself is specified as a ready-to-hand-to-an-agent
> task in **[§Producer conformance directive](#producer-conformance-directive)** below (the README-prose
> sibling of `help-dump-contract.md`'s "Teardown directive"); each tool repo conforms by reading that
> section.

## §1 Head rule — where the site slice begins

The site slice begins **after** the leading GitHub chrome. The puller skips, from the top of the
README, a contiguous run of:

0. a single leading **YAML frontmatter** block (`---` … `---`) when it is the very first non-blank
   content, and a leading **HTML comment** (`<!-- … -->`, e.g. a markdownlint pragma),
1. the single leading **H1** — markdown (`# tool-name`) **or** an HTML title (`<h1 …>…</h1>`,
   possibly spanning lines); only the FIRST leading heading is treated as chrome,
2. a single leading **`> blockquote`** (the toolkit line — see the canonical text in
   [§Producer conformance directive](#producer-conformance-directive) rule 1, including any
   wrapped continuation lines of that same blockquote), and
3. any contiguous run of **image / badge lines**: markdown images (`![alt](url)`), linked badges
   (`[![alt](img)](href)`), and HTML image wrappers (`<p align=…><img …></p>`, bare `<img …>`,
   `<picture>`/`<source>`, and the badge-row separators `<br>` / `<hr>` / `<span>`).

Blank lines interleaved with the above are part of the skipped head. Deduction **stops skipping at
the first non-blank line that is none of the above** — that line is the first line of the slice.

Example (from `idea`'s README):

```markdown
# idea                          ← H1 (skipped)
> Part of [@sahil87's open source toolkit](https://shll.ai) — see all projects there.   ← toolkit blockquote (skipped)
[release] [downloads] [stars]   ← badge row (skipped)
                                ← ← ← SITE CONTENT STARTS HERE
Capture and manage ideas…       ← tagline paragraph (first pulled line)
## Why idea?                    ← first real section (pulled)
```

### GIVEN/WHEN/THEN

- **Chrome is skipped, slice begins at first prose** — GIVEN a README beginning with an H1, a
  toolkit blockquote, and a contiguous badge row; WHEN the puller computes the head boundary; THEN
  the H1, blockquote, and badge row are skipped and the slice begins at the first non-chrome line
  (the tagline paragraph).
- **No-chrome README passes through** — GIVEN a README whose first non-blank line is already prose
  (no H1/blockquote/badges); WHEN the head boundary is computed; THEN nothing is skipped and the
  slice begins at the top.

## §2 Tail rule — where the site slice ends

Pulling MUST stop before the GitHub-native footer chrome. The slice ends **immediately before the
first occurrence (after the head) of a denylisted section heading**. Matching is on the **heading
text** — case-insensitive, `##` or `###`, independent of position; the first denylisted heading
encountered terminates the slice.

**Final denylist:** `Contributing`, `Development`, `Building`, `License`, `Acknowledgements`.

`Changelog`, `Roadmap`, and `FAQ` are **deliberately NOT denylisted** — they are user-relevant and
belong on the site. A README with no denylisted heading yields a slice running to end-of-file.

### `Install` / `Installation` is INCLUDED (pulled), NOT excluded

A tool's own README install section legitimately carries tool-specific detail the common `shll`
quick-start skips, and that detail belongs on the site. Including it does **not** conflict with
`vn39`: `vn39`'s actual rule is *"site prose MUST NOT reference commands/flags absent from
`help/<tool>.json`"* — not *"Install sections are forbidden."* A pulled install section ships
**verbatim** (the README is canonical); if its commands diverge from `help/<tool>.json`, the §7
**reporter** surfaces a `::warning::` so the tool README can be corrected — the slice is not
withheld (report-only, §7).

**Coexistence model.** The global `getting-started/install` quick-start stays canonical for
"install the whole toolkit"; each tool's pulled Install section is canonical for "install just this
tool + its specifics." Both ship, framed differently — accepted as legitimate (not drift), since
both can be simultaneously correct.

### GIVEN/WHEN/THEN

- **Slice ends at first denylisted heading** — GIVEN a body containing `## Usage`, `## Install`,
  `## Contributing`, `## License`; WHEN the tail boundary is computed; THEN the slice includes
  `## Usage` and `## Install` and ends just before `## Contributing`.
- **Install is kept; Changelog/Roadmap/FAQ are kept** — GIVEN a body with `## Install`,
  `## Changelog`, `## Roadmap`, `## FAQ`; WHEN the tail boundary is computed; THEN none of those four
  terminate the slice.
- **No denylisted heading → slice to EOF** — GIVEN a body with no denylisted heading; WHEN the tail
  boundary is computed; THEN the slice runs to end-of-file.

## §3 Image rule — all images absolute, everywhere

> **Refined by change `x0br`.** The original §3 ("reference, don't copy") is now stated as its
> logical conclusion: **every** image reference — in `README.md` AND in `docs/site/**` — MUST be an
> **absolute** URL (`https://…`, e.g. `raw.githubusercontent.com/…`). shll.ai vendors **zero** image
> binaries. A relative image path is a closure violation (warned by the §closure lint), not a copy
> instruction.

Screenshots are **referenced by their absolute repo URL — NOT copied** into the shll.ai repo. Alt
text is mandatory and travels inside the markdown (`![alt](url)`); good alt text in the README is
therefore correct on shll.ai automatically (single-source). Freshness is guaranteed by **co-capture**:
the image URL and the surrounding prose are pulled in the **same daily run**, so a repo reorganizing
its images breaks both together and self-heals on the next run.

**Why all-absolute (not just README).** Making every image absolute means the move from GitHub to
shll.ai can never break an image link (there is no relative path to re-anchor), the §closure lint
only has to police markdown *links* (not images), and one uniform rule covers both sources. This
extends the original §3 "reference, don't copy" stance to its conclusion and removes vendoring from
the consumer's responsibilities entirely.

**Accepted known property:** a ≤24h window where the live site may hotlink a since-moved image (a
transient broken image, never a broken build). Build-time vendoring of images is explicitly
**deferred** — it is a consumer-side option that needs no repo-side change, so it can be added later
without touching this contract.

### GIVEN/WHEN/THEN

- **Images are referenced absolutely, alt text travels** — GIVEN a README or `docs/site/` image
  `![CLI dashboard](https://raw.githubusercontent.com/sahil87/idea/main/docs/shot.png)`; WHEN the
  slice/tree is pulled; THEN the image reference (with its alt text) travels into the slice verbatim,
  and the image is NOT copied into shll.ai.
- **A relative image is a closure violation** — GIVEN a `docs/site/` page with a relative image
  `![diagram](./arch.png)`; WHEN the §closure lint runs; THEN it emits a `::warning::` naming the
  file + image (images MUST be absolute), and the page is still committed (report-only).

## §4 Dark-theme guidance (two parties)

Dark-mode guidance is split by the party responsible for it.

**Producer (tool author).** Prefer **theme-agnostic** screenshots — CLI shots read on any
background and are expected to cover ~90% of cases. For genuine light/dark diagram pairs, use the
standard `<picture><source media="(prefers-color-scheme: …)">` with a fallback `<img>`. Do **NOT**
use the GitHub-proprietary `#gh-dark-mode-only` / `#gh-light-mode-only` URL-fragment trick — it
renders wrong-theme duplicates off GitHub and **WILL be stripped by the puller** (§6).

**Consumer (shll.ai render).** The live site's dark mode is Starlight's `data-theme` toggle, **NOT**
`prefers-color-scheme` (`astro.config.mjs` uses `expressiveCode themes: ['github-dark','github-light']`
plus Starlight's theme attribute). So a pulled `prefers-color-scheme` `<picture>` tracks the **OS**,
not the site toggle — a mismatch on manual flip. The site **accepts OS-tracked images for
theme-agnostic shots**; mapping `<picture>` sources to `data-theme` is a documented consumer-side
**escape hatch, deferred** until a real diagram needs it.

### GIVEN/WHEN/THEN

- **Producer avoids the gh-only trick** — GIVEN a tool author with a light/dark diagram pair; WHEN
  they author it per this contract; THEN they use `<picture><source media=…>` (not `#gh-*-mode-only`),
  because the puller strips the gh-only fragment.

## §5 Mermaid (Option A — strip; require rendered images)

Astro Starlight does **not** render mermaid out of the box (no mermaid/rehype-mermaid dependency in
the live site's `package.json`; Starlight passes ```` ```mermaid ```` fences to the code highlighter,
so they render as syntax-highlighted *text*, not diagrams). Rather than add a heavyweight build-time
browser dependency (`rehype-mermaid` + Playwright — Constitution VI tension) or ship client-side
mermaid JS (Constitution I violation), this contract **MANDATES**:

- Diagrams destined for shll.ai MUST be committed as **rendered images** (SVG preferred, for
  dark-theme control).
- Inline ```` ```mermaid ```` fences are **NOT rendered** on shll.ai and **WILL be stripped on
  pull** (§6).

Tools keep mermaid in their README for GitHub's native rendering if they wish; they additionally
commit a rendered SVG for the site. (GitHub Actions can render mermaid→SVG trivially.)

### GIVEN/WHEN/THEN

- **Inline mermaid is stripped; rendered image survives** — GIVEN a README section with a
  ```` ```mermaid ```` fence followed by a committed `![architecture](docs/arch.svg)`; WHEN the slice
  is pulled; THEN the mermaid fence is stripped and the rendered-image reference is preserved.

## §6 What the puller strips on pull

After computing the head (§1) and tail (§2) boundaries, the puller applies these strips to the
slice, in addition to the boundary cuts:

1. **Mermaid fences** (§5): every ```` ```mermaid ```` … ```` ``` ```` block is removed. Non-mermaid
   fenced code blocks are left intact.
2. **GitHub theme-only images** (§4): any image whose URL carries `#gh-dark-mode-only` or
   `#gh-light-mode-only` is removed — in **both** markdown (`![](…#gh-…)`) and HTML form
   (`<img src=…#gh-…>`, `<source srcset=…#gh-…>` inside a `<picture>`). A `<picture>` wrapper left with
   no remaining `<source>`/`<img>` after the strip is dropped entirely (no empty residue). Plain images
   (no theme fragment) are preserved.

These strips are pure text transforms with no per-tool special-casing.

### GIVEN/WHEN/THEN

- **Strips are mechanical and total** — GIVEN any pulled slice; WHEN the strips run; THEN mermaid
  fences and `#gh-*-mode-only` images are removed while ordinary prose, code fences, and plain images
  survive, and the transform never errors.

## §7 Divergence reporter — the `vn39` integration, REPORT-ONLY (change `4s3e`)

Pulled README prose WILL contain command/flag examples. The `vn39` binding rule
polices **hand-written** site prose: **"site prose MUST NOT reference commands/flags absent from
`help/<tool>.json`."** For the **canonical, mechanically-synced README slice**, that cross-check is
applied as a **non-fatal reporter, not a publish gate**.

**The README is canonical and rendered verbatim; divergence is a repo-level lint, never a publish
gate.** A blocking gate would contradict the architecture's foundation (the tool repo's README is
canonical — constraint #2): rejecting the canonical source when it diverges from `help-dump` makes
`help-dump` the de-facto authority and silently withholds the very thing the site projects. So when a
tool's pulled slice (including its Install section) references a command path or flag **absent from
`help/<tool>.json`**, the reporter emits a `::warning::` (a repo-level lint surfaced in the CI run
log) and **the canonical slice is still committed and rendered**. The fix belongs in the **tool's
README**, never a silent exclusion on the shll.ai side — *you do not protect a system from its own
source of truth; you fix the source of truth.* The detection of `shll shell-install`-style fabricated
commands is retained as a useful drift signal; only the consequence changed (warn, don't withhold).

**Accepted tradeoff.** A genuinely fabricated command can appear on shll.ai for up to one refresh
cycle (≤24h) until the tool README is corrected — the precise harm `vn39` guarded against, now
consciously accepted in favor of canonical-source consistency and full tool coverage. The reporter is
**not** an install-accuracy *guard* (it no longer blocks); it is an install-accuracy *reporter*.

**Two consumers, do not conflate.** The `vn39` rule remains a **hard rule for hand-written site
prose** (which MUST NOT cite absent commands). It is **report-only** ONLY for the canonical pulled
README slice.

The reporter is implemented as a **pure, single-sourced verifier** shared by the extraction module's
unit test and the workflow — `findUnknownTokens(slice, helpDoc)` in
[`src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts) — so
the tested detection and the CI detection cannot drift. `extract-readme-cli.mjs` consumes a non-empty
result as a `::warning::` + exit 0 (writes the slice), not exit 1. Command/flag truth comes from the
same `help/<tool>.json` tree (command **paths**) and the build-time `parseHelp` decomposition
(**flags**) the command reference already trusts.

#### §7.1 Detection mechanics — the false-positive guards (change `715p`)

The detector is intentionally **conservative** — a report-only reporter that trains readers to trust
it must not be dominated by false positives. Detection scans only the slice's **code spans** (inline
`` `code` `` + fenced blocks — where command/flag examples live, not free prose), walks the help
**tree** from the binary for command paths (descending only into known children, stopping at a known
**leaf** so a positional arg after a real command is not a "fabricated subcommand" — the `childrenOf`
walk), and scans `--long` / `-x` flag tokens. On top of that base it applies four guards so
deliberately-undumped or foreign tokens are not attributed to the tool:

1. **Bare `--` end-of-options stop (flag scan).** Within a statement, the flag scan stops at the first
   whitespace-delimited bare `--` token (POSIX end-of-options). Flags after it are passed through to a
   different program and are NOT the tool's — e.g. `run-kit riff -- --worktree-name …` forwards
   `--worktree-name` to `wt`. (The command-path walk already stops at the first `-`-prefixed token, so
   only the flag scan needed the explicit `--` stop.)
2. **Angle-bracket `<placeholder>` stop (flag scan).** The flag scan also stops at the first token
   matching `/^<[^>]*>$/` (an angle-bracket placeholder). For launcher tools the statement's remainder
   after a `<placeholder>` is an example-shaped **foreign** command whose flags belong to another
   program — e.g. `hop <name> git push --force` runs git in the target dir, so `--force` is git's flag.
   This is **angle-only**: a `[optional]`-style bracket placeholder does NOT stop the scan, so a real
   tool flag after an optional positional keeps being checked (`wt create [branch] --base main` still
   checks `--base`). Accepted false-negative: a genuinely fabricated flag after a `<placeholder>` goes
   unchecked — the right trade for a conservative report-only detector.
3. **Cobra `completion`/`help` seed (gated on a non-leaf root).** `completion` and `help` are seeded
   as valid **leaf** children of a tool's root, mirroring the universal-flag seed
   (`--help`/`-h`/`--version`/`-v`). help-dump excludes these auto-generated subcommands from every dump
   (see `help-dump-contract.md` §4 noise filtering), so a README documenting `<tool> completion` /
   `<tool> help <cmd>` would otherwise flag as an unknown subcommand. Registering them as leaves means a
   `completion <shell>` / `help <cmd>` tail is positional args and is not flagged. **The seed is gated
   on the root already being a cobra PARENT** — a root with ≥1 real subcommand in its dump. A
   **leaf-root** tool (a dump whose root has `commands: []` — no subcommand tree at all, e.g. `tu`,
   whose `help/tu.json` exists but exposes no subcommands) genuinely has no `completion`/`help`
   subcommand and its root is already a known LEAF, so every bare-word tail (`tu sync`, `tu status`) is
   correctly treated as a positional arg; seeding children there would flip that leaf into a non-leaf
   and wrongly flag every real tail as a fabricated subcommand. So the seed fires for the six
   multi-command tools (idea/hop/fab-kit/wt/run-kit/shll) and is skipped for a leaf-root dump. (Flags
   are seeded unconditionally — they never change leaf/non-leaf semantics.)
4. **`UNDUMPED_TOKENS` allowlist — tokens real-but-undumped.** A narrow, **checker-only** allowlist
   (keyed by the dump's ROOT path, i.e. the binary name) declares tokens that are real on the tool but
   deliberately absent from its dump because **hiddenness is not representable in `help/<tool>.json`**
   (the dump strips hidden nodes/flags — see `help-dump-contract.md` §2/§4): (a) the **fab-kit sibling
   binary** — `help/fab-kit.json` dumps only the `fab` binary, but fab-kit's workspace commands
   (`init`, `sync`, `doctor`, `upgrade-repo`, `update`, `migrations-status` — the binary's full visible
   set, so a future README mention of any does not resurface the bug) live on the `fab-kit` binary and
   are invocable via hidden `fab` aliases; and (b) hop's **hidden `--shim-plan`** internal flag. These
   tokens are **never rendered** — the allowlist only quiets the reporter; it merges into the same
   root-children / flag sets `helpFacts` builds, so `findUnknownTokens`'s signature is unchanged.
   Merging both fab-kit binaries' dumps was rejected: it is upstream-blocked (`fab-kit help-dump` fails
   on the installed binary) and would change **rendered** surfaces (the commands page, homepage tool
   cards, `/llms.txt`) — a far larger blast radius than a checker-only guard. Drift cost if upstream
   renames a command: one stale allowlist entry whose worst case is a suppressed warning — acceptable
   for a report-only surface.

**Remaining warning classes stay warned (out of scope for `715p`).** Structurally-different residues
are deliberately left flagged, each needing its own future design: hop's `hop <project> [command…]`
launcher positionals (the root has both children and positional args), wt's cobra aliases (`ls`/`new`/
`rm` — aliases are not in dump `commands[]`), shll's legacy-alias/historical-flag/fenced-prose mentions
(`shll shell-install`, `--trust-tap`, `shll OK`, `shll the`), and `run-kit url` (genuine drift — absent
from the shipped binary's dump). The detector does **no** prose-level NLP; a "documents absence"
sentence (`` No `--force` on … ``) is already handled by the first-token-≠-binary skip on a standalone
inline span.

### GIVEN/WHEN/THEN

- **A fabricated command WARNS but still commits** — GIVEN a pulled `shll` slice whose Install
  section references `shll shell-install` (absent from `help/shll.json`); WHEN the reporter
  cross-checks the slice; THEN a `::warning::` naming `shll shell-install` is emitted, the slice is
  STILL written to `content/shll/README.md`, and the CLI exits 0.
- **A clean slice is silent** — GIVEN a slice whose every command path and flag exists in
  `help/<tool>.json`; WHEN the reporter runs; THEN no warning is emitted and the slice is committed.
- **Missing `help/<tool>.json` → unverified warning, still commit** — GIVEN a slug with no committed
  `help/<slug>.json` (the documented interim state before a tool's first successful dump pull); WHEN
  the CLI runs against a readable README; THEN an "unverified" `::warning::` is emitted, the canonical
  slice is STILL written, and the CLI exits 0.
- **A passthrough flag after `--` is not attributed (§7.1.1)** — GIVEN a run-kit slice
  `run-kit riff -- --worktree-name pacing-canyon`; WHEN the reporter runs; THEN `--worktree-name` is
  NOT flagged (it follows the bare `--`), while a fabricated flag placed BEFORE the `--` still is.
- **A foreign flag after a `<placeholder>` is not attributed; `[optional]` still checks (§7.1.2)** —
  GIVEN `hop <name> git push --force`; WHEN the reporter runs; THEN `--force` is NOT flagged (it
  follows the `<name>` placeholder), while `hop rm --force` (no placeholder) still flags `--force` and
  `wt create [branch] --base main` still checks `--base` (a `[optional]` bracket does not stop the scan).
- **Cobra `completion`/`help` never flag; a leaf-root tool is not falsely broken (§7.1.3)** — GIVEN a
  README documenting `run-kit completion` and `run-kit help riff` (a multi-command tool); WHEN the
  reporter runs; THEN neither is flagged (seeded valid leaf children; the tails are positional args).
  AND GIVEN a leaf-root tool whose dump root has `commands: []` (e.g. `tu`) documenting a real tail
  `tu sync`; WHEN the reporter runs; THEN `tu sync` is NOT flagged (the seed is skipped for a leaf root,
  so its bare-word tails stay positional args rather than becoming fabricated subcommands).
- **Undumped-but-real tokens pass; fabricated ones still flag (§7.1.4)** — GIVEN fab-kit's README
  documenting `fab init`/`fab sync`/… (sibling-binary commands absent from `help/fab-kit.json`) and
  hop's `--shim-plan` (a hidden flag); WHEN the reporter runs; THEN none are flagged (the
  `UNDUMPED_TOKENS` allowlist), while a genuinely fabricated `fab frobnicate` still is.

## §8 Pull model — the consumer (sibling of the help refresh)

shll.ai pulls README slices via a scheduled refresh job, a **sibling** of
[`refresh-help.yml`](../../.github/workflows/refresh-help.yml) — kept distinct
because it is a different data kind (markdown slices, not the JSON command tree) with a different
verifier (§7 command/flag cross-check, a report-only reporter — not Zod-schema validation).

- **Triggers:** a daily `schedule` cron + `workflow_dispatch` (on-demand after a README change).
- **Per-tool pipeline** (looped over all 7 tools): fetch the repo's `README.md` → apply §1 head +
  §2 tail deduction → §6 strips → §7 divergence reporter (non-fatal) → **README-slice link lint**
  (non-fatal, `findReadmeLinkViolations`: warns on a relative link that is not a `docs/site/` link, or a
  relative image — both 404/break on the site; report-only, mirrors §7; scans **code-masked** text so an
  illustrative link/image inside a code span or fenced block is not flagged — change `715p`, see
  §closure lint) → **always commit** the slice to `content/<slug>/README.md` (a divergence or a link
  violation emits a `::warning::` but is committed; a missing `help/<slug>.json` commits with an
  "unverified" warning).
- **Per-tool `docs/site/` tree pipeline** (sibling step, change `x0br`): in the same run, fetch the
  repo **tarball** (`https://codeload.github.com/sahil87/<repo>/tar.gz/<branch>`, main→master fallback)
  and untar **only** the `docs/site/` subtree → run the §closure lint per page (non-fatal `::warning::`
  on a relative-link escape or a relative image — never withholds) → copy each page **verbatim** to
  `content/<slug>/site/<path>.md`, preserving the subtree shape. A repo tarball is one request per
  tool (no contents-API N+1, no rate limit, no token). A tool with no `docs/site/` tree is a clean
  no-op (last-good preserved); per-tool fetch/IO-failure isolation matches the README step.
- **Repo-root data location:** the extracted slice is committed to a `content/<slug>/` directory at
  the **repo root** (sibling to `help/`, `sites/`, `fab/`, `docs/`). Same rationale as `help/`:
  project-level data that **survives a live-site swap** (Constitution II + III), kept distinct from
  `help/` so README data and help data do not overload one directory.
- **Direct commit to `main`, always (warn-not-skip on divergence)**, off the deploy path, with
  **per-tool _fetch-failure_ isolation** (a tool whose README genuinely cannot be fetched/read keeps
  its last-good slice; others proceed) — mirroring the help-refresh job's isolation, but note the
  isolation now applies ONLY to fetch/read failures, NOT to divergence (which always commits with a
  warning). When it commits to `main`, the **existing** `deploy.yml` ships the change
  (Constitution IV); no deploy trigger is added here. A flaky **fetch** therefore breaks the REFRESH
  for that tool (not the deploy — the site keeps the last-good slice); a **divergence** does not break
  anything, it commits + warns.
- **Render side:** a build-time Starlight component
  ([`ReadmeSlice.astro`](../../sites/astro-starlight-terminal1/src/components/ReadmeSlice.astro))
  reads `content/<slug>/README.md` via the ascend-to-root `import.meta.url` `fs` read (the pattern
  proven by `CommandReference.astro` — NOT a fixed depth, NOT `process.cwd()`, NOT `import.meta.glob`),
  renders the markdown to static HTML at build time via `@astrojs/markdown-remark` — a build-time
  dependency already pulled transitively by `astro` core + `@astrojs/starlight`, declared explicitly
  in the site `package.json` (pinned to the version astro core uses) so the bare import resolves under
  strict pnpm; this makes an existing dep importable, adding no new runtime dependency and no new
  transitive weight (Constitution VI). The component renders on a **parallel per-tool `readme` page**
  (`src/content/docs/tools/<slug>/readme.mdx`, slug `/<slug>/readme`, sidebar label "Readme") —
  a sibling of the generated `commands` page — **NOT** injected into `overview.mdx`. Each tool's
  `overview.mdx` is a thin directory entry (GithubButton + 1–2 sentence framing + nav links to the
  readme / commands pages and any `docs/site/` pages the tool publishes, e.g. install / workflows); the
  canonical depth lives on the readme page and the tool's `docs/site/` tree.
  Missing slice → neutral placeholder (build succeeds); present-but-unreadable slice → build fails (a
  committed defect must not deploy).
- **`docs/site/` render side** (change `x0br`; namespace moved to root by change `3ke3`): a single Astro **dynamic route**
  ([`src/pages/[slug]/[...path].astro`](../../sites/astro-starlight-terminal1/src/pages/%5Bslug%5D/%5B...path%5D.astro))
  walks the committed `content/<slug>/site/**` tree at build time via `getStaticPaths` and renders
  **one page per file** at URL `/<slug>/<path>` (the `docs/site/`/`site/` prefix stripped, the
  subtree shape preserved) — e.g. `content/idea/site/advanced/hooks.md` → `/idea/advanced/hooks`.
  Each page is its **own page**, a sibling of `overview`/`readme`/`commands`. It reuses the SAME
  build-time `@astrojs/markdown-remark` `createMarkdownProcessor` + repo-root cross-boundary read as
  `ReadmeSlice.astro`, applies the §link-resolution site-absolute transform (passing the page's slug +
  mount path so relative targets resolve to `/<slug>/<resolved>`), and is wrapped in
  Starlight's `<StarlightPage>` so it inherits the sidebar, prose styles, and dark-mode parity
  (Constitution I/V/VI: build-time, no client JS, no new dependency). This is the FIRST dynamic route
  in the codebase (all other pages are static MDX stubs) — accepted, as it is the only approach that
  renders a variable, author-controlled page set with no per-page maintenance. **Reserved-slug
  precedence:** a `docs/site/` page MUST NOT be named after a tool's reserved static slug
  (exactly `overview`, `readme`, `commands` — the three site-owned pages; `install`/`workflows` are NOT
  reserved and belong to the tool repo via `docs/site/`, see §9.2) — those three slugs are owned by the
  site (the hand-authored overview + generated readme/commands pages). The dynamic route is
  higher-priority than Starlight's `[...slug]` catch-all, so a collision would shadow the static page (a
  benign build `[WARN]`); the producer avoids it by not reusing one of those three names. Missing tree →
  no pages emitted, build succeeds
  (degrades cleanly, same discipline as a missing README slice).
- **`docs/site/` sidebar** (change `x0br`): the Starlight sidebar is hand-authored per tool (explicit
  `items:` arrays, NOT `autogenerate`). A build-time helper
  ([`src/lib/docs-site-sidebar.mjs`](../../sites/astro-starlight-terminal1/src/lib/docs-site-sidebar.mjs))
  walks `content/<slug>/site/**` at config-evaluation time and produces a flat list of `{ label, link }`
  entries (label = the page's first H1, link = `/<slug>/<path>`), which `astro.config.mjs`
  **appends** to each tool's hand-authored `items:` array. So the variable docs/site pages appear in
  the sidebar automatically with zero per-page maintenance, beneath the hand-authored
  Overview/Readme/Commands entries; a tool with no tree gets no extra entries.

### GIVEN/WHEN/THEN

- **`docs/site/` tree rendered as separate pages** — GIVEN committed `content/idea/site/install.md`
  and `content/idea/site/advanced/hooks.md`; WHEN the site builds; THEN pages exist at
  `/idea/install` and `/idea/advanced/hooks`, each rendered build-time as static HTML
  inside the Starlight layout, and both appear in the `idea` sidebar group.
- **Missing `docs/site/` tree degrades cleanly** — GIVEN a tool with no committed
  `content/<slug>/site/` tree; WHEN the site builds; THEN no docs/site pages are emitted for it, no
  sidebar entries are added, and the build succeeds.
- **Slice committed to the repo-root collector, off the deploy path** — GIVEN the scheduled
  readme-refresh on its daily cron; WHEN it pulls a fetchable `run-kit` README (divergent or clean);
  THEN `content/run-kit/README.md` is direct-committed to `main` (a divergence carries a
  `::warning::`), and the existing `deploy.yml` ships it — no deploy logic lives in the refresh job.
- **Fetch-failure isolation (divergence is NOT a failure)** — GIVEN one tool whose README genuinely
  cannot be fetched; WHEN the run proceeds; THEN that tool keeps its last-good
  `content/<slug>/README.md` and the others still refresh. A tool whose README merely *diverges* is
  NOT isolated — its canonical slice is committed with a `::warning::`.
- **Rendered on the parallel readme page** — GIVEN a committed `content/<slug>/README.md`; WHEN the
  site builds; THEN `ReadmeSlice` renders it on `/<slug>/readme`, while the tool's `overview`
  page stays a thin directory entry that links to it.

## §9 The `docs/site/` documentation tree — ACTIVE (closed-set model, change `x0br`)

> **Status: implemented.** Activated by change `x0br`. The pull + render path now handles, in
> addition to the README slice, each tool's `docs/site/**/*.md` **documentation tree** — a handful
> of (possibly nested) markdown pages a README links into for depth (install guides, deep-dives,
> format contracts). The workflow fetches the tree (§8 tarball step), the CLI mounts + lints it
> (§closure lint), and a dynamic route renders one page per file (§8 render side). The model below is
> a **closed set**: shll.ai conforms by closure + two tiny link transforms, and the producer repos
> conform per-repo over time (out of scope here — see the out-of-scope boundary).

The README slice remains the **default** source. The `docs/site/` tree is for site-relevant depth
that does NOT belong inline in the README. The pull surface is exactly two things: the `README.md`
slice and the `docs/site/**` tree — **everything else in the repo is never pulled** (source, tests,
design notes, and any other `docs/` subtree). So maintainer/design notes simply live anywhere outside
`docs/site/` and are invisible to the site by default; no special folder is needed. One caveat:
`docs/site/` is the **only** `docs/` subtree shll.ai reads — in particular `docs/specs/` and
`docs/memory/` already carry a specific meaning in a fab repo (pre-implementation design intent and
post-implementation memory) and are **not** pulled. The organizing axis is therefore simply
**published vs. not**: `README.md` slice + `docs/site/**` are published to the site; all other paths
are not.

**Mount.** `content/<slug>/site/<path>.md` → URL `/<slug>/<path>` (the `docs/site/` prefix
collapses to the `site/` collector, and `site/` is stripped from the URL; the subtree shape is
preserved). Each file is its own page (the per-tool namespace lives at the site root since change
`3ke3` — formerly `/tools/<slug>/<path>`):

```
docs/site/install.md          → /<slug>/install
docs/site/advanced/hooks.md   → /<slug>/advanced/hooks
```

### §9.1 Closed-set producer contract — the four rules

A tool repo's `docs/site/` tree conforms to these four rules (each repo adopts them in its own later,
per-repo change — out of scope for the change that publishes this contract):

1. **Closure.** `docs/site/` is a **fully self-contained set**: every *relative* link and image inside
   any `docs/site/**/*.md` file MUST resolve to a path **inside** `docs/site/`. No `..` segment may
   escape `docs/site/`.
2. **External links absolute-by-author.** A link (in a README or a `docs/site/` page) to anything
   *outside* the copied set — source files, `docs/specs/`, the tool's other internals — MUST be
   written as an absolute `https://…` URL **by the author**. The author makes the "does this link
   leave the site?" decision explicitly, by hand. This is what lets the consumer be two context-free
   transforms instead of a link classifier.
3. **All images absolute, everywhere** (see §3). Every image in `README.md` and `docs/site/**` MUST be
   absolute; shll.ai vendors zero binaries; a relative image is a closure violation (§closure lint).
4. **README → `docs/site/` links written naturally.** A README link *into* a `docs/site/` page is
   written as the natural repo-relative path `docs/site/<path>.md`; shll.ai rewrites it on render to
   the **site-absolute** path `/<slug>/<path>` (§link resolution).

**Why a closed set (not a machine link-classifier).** An earlier design classified every link at copy
time (rewrite to a GitHub `blob` URL vs. a site slug) using a copied-set manifest. The closed-set rule
**eliminates** the classifier: the author declares site-internal vs. external by writing external
links absolute, and closure guarantees every *relative* link is intra-set, leaving the consumer with
two context-free transforms. Fewer moving parts, no manifest, and the invariant (`docs/site/` is
self-contained) is **lintable** (§closure lint).

### §9.2 Reserved-slug precedence

A `docs/site/` page path MUST NOT collide with a tool's reserved static slugs — exactly **`overview`,
`readme`, `commands`** — which are owned by the site: a hand-authored `overview` directory entry, plus
the generated `readme` (the pulled README slice) and `commands` (the help-tree command reference) pages.
The reserved set is **uniform across all 7 tools**. The dynamic route is higher-priority than
Starlight's `[...slug]` catch-all, so a collision would *shadow* the static page (a benign build
`[WARN]`). The producer avoids it by not reusing one of these three names; the constraint is recorded so
a conforming repo does not trip it.

**`install` and `workflows` are deliberately NOT reserved.** They are owned by the **tool repo**, not the
site: a tool publishes `docs/site/install.md` / `docs/site/workflows.md` and shll.ai renders them at
`/<slug>/install` and `/<slug>/workflows`. There is no site-authored page to shadow — the
tool's own `docs/site/` content is the single source for that depth. (The site previously carried
hand-authored `install`/`workflows` stubs for `idea` and `fab-kit`; those were site-authored prose with
no canonical source — exactly the hand-copied drift the constitution's *Tool-Page Depth* principle
forbids — and were **removed** so the tool repo controls this content. See the changelog.) This keeps the
site-owned reserved set minimal (the three pages every tool genuinely has) and hands all other tool-page
depth — install, workflows, and any deep-dive — to the canonical, mechanically-synced `docs/site/` tree.

**Report-only enforcement.** The docs/site CLI
([`extract-docs-site-cli.mjs`](../../sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs))
checks each page's top mount segment against this reserved set and emits a CI `::warning::` naming the
offending page when one collides — and the page is **still committed** (same report-only posture as the
§closure lint and the §7 divergence reporter; canonical wins, never withhold). So a reserved-slug
collision is visible in the run log without blocking the pull.

### GIVEN/WHEN/THEN

- **Published vs. not, not a wanted/unwanted axis** — GIVEN a tool author with a site-only note and a
  maintainer-only note; WHEN they organize their repo; THEN the site-only note goes in `docs/site/*.md`
  (pulled + rendered) and the maintainer note goes anywhere outside `docs/site/` (never pulled — no
  special folder needed), while `docs/specs/` / `docs/memory/` keep their existing fab meanings and are
  not pulled.
- **Closure makes the consumer trivial** — GIVEN a `docs/site/` tree that obeys closure + absolute
  external links; WHEN shll.ai pulls it; THEN every relative link is known-intra-set, so the consumer
  needs only the two §link-resolution transforms — no link classifier, no copied-set manifest.

## §link resolution — the consumer's entire rewrite surface (two transforms, change `x0br`)

Two transforms, applied to **link/image URL targets only** — never to prose or code that merely
mentions the literal text, and never to absolute URLs. Both live as pure, exported, tested functions
in [`extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts) (same
single-machine-anchor discipline as `extractReadme`/`findUnknownTokens`).

**The target is rewritten to a SITE-ABSOLUTE path `/<slug>/<resolved-path>`** (reworked by the
`x0br` review; namespace moved to root by change `3ke3` — formerly `/tools/<slug>/<resolved-path>`).
The earlier design rewrote to RELATIVE forms (README `docs/site/<p>.md` → `./<p>`;
docs/site pages → a bare `.md`-strip). That is **wrong** under the site's serving model: each page is
served as a **trailing-slash directory** (`/<slug>/<path>/`, i.e. `<path>/index.html`), and
Starlight's own sibling links are absolute *with* a trailing slash (e.g. `/idea/install/`). A
relative target therefore resolves **one segment too deep** — the README page is served at
`/idea/readme/`, so `./install` resolves to `/idea/readme/install` while the target page
lives at `/idea/install/` (broken); a docs/site page at `/idea/advanced/hooks/` linking a
sibling `./other` resolves to `/idea/advanced/hooks/other` (broken). A site-absolute target is
**serving-model-proof** (immune to `trailingSlash`) and matches Starlight's own absolute links.
Because the resolved URL embeds the slug — and, for docs/site pages, resolves `.`/`..` against the
page's own mount path — both transforms are **slug-aware** (and the docs/site transform is
mount-path-aware). They are no longer slug-agnostic string transforms; that is accepted and intended.

1. **`docs/site/` pages (intra-set links)** — `rewriteDocsSiteLinks(markdown, slug, mountPath)`:
   resolve each **relative** link/image target against the page's OWN directory within the docs/site
   tree (`mountPath` is the page's path under `site/`, no `.md`, e.g. `advanced/hooks`), normalize
   `.`/`..`, strip `.md`, and emit the site-absolute mount URL `/<slug>/<resolved>`. Closure
   (§9.1.1) guarantees relative targets are intra-set. Examples: page `advanced/hooks` linking
   `../install.md` → `/<slug>/install`; linking `./sibling.md` → `/<slug>/advanced/sibling`.
   A target that **escapes** the tree (a `..` climbing above the root — a closure violation, §closure
   lint) is NOT clamped to a real page; it is rewritten under a reserved `__unresolved__` segment
   (`/<slug>/__unresolved__/<…>`) so the broken link is visibly dead rather than misrouted to a
   plausible-but-wrong page. The escape predicate is **shared** with `findClosureViolations`, so the
   rewrite and the warning agree on what "escape" means. Applied at render time by the dynamic route
   (the committed slice stays a verbatim copy of canonical).
2. **README slice (links into `docs/site/`)** — `rewriteReadmeDocsSiteLinks(markdown, slug)`: a relative
   target of the form `docs/site/<p>.md` → the site-absolute mount URL `/<slug>/<p>` (the
   `docs/site/` prefix maps to the tool root `/<slug>/`, `.md` stripped, nested `<p>` subtree
   preserved). Examples: `[guide](docs/site/install.md)` → `[guide](/<slug>/install)`;
   `docs/site/advanced/hooks.md` → `/<slug>/advanced/hooks`. Relative targets NOT under
   `docs/site/` are left untouched (the README's own relative links into non-docs/site files are out of
   scope and self-heal via the absolute-by-author producer rule, §9.1.2).

### The rewrite guard (critical correctness boundary)

Both transforms operate **only** on link/image URL targets — the `(...)` of markdown `[text](target)`
and `![alt](target)`, and `href`/`src` in raw HTML — and (for the README) match `docs/site/` **only as
a path-prefix of a RELATIVE target**. They MUST NOT touch:

- absolute URLs containing the literal substring (e.g.
  `https://github.com/sahil87/idea/blob/main/docs/site/x.md` stays verbatim),
- prose or fenced code that mentions the text `docs/site`,
- the `.md` of anything that is not a relative link target (a `.md` in link TEXT survives).

This is "rewrite the relative-link target," **not** a blind string replace. A `#fragment` / `?query`
suffix on a relative target is preserved verbatim (the rewrite applies to the path part only).

### Known limitations

Two link shapes are **not** rewritten by the current transforms (honestly recorded; the canonical page
still commits + renders, and these are rare in practice — fixing them robustly requires nested-bracket
parsing that risks the guard's precision, so it is deferred, not scoped here):

- **(a) The OUTER target of a linked image** `[![alt](img)](page.md)` is unhandled — the scanner matches
  the inner image (whose target is an absolute image URL per §3, so untouched) but not the outer link's
  `(page.md)`. A docs/site page linked behind a badge keeps its raw relative target. (Plain links and
  plain images are fully handled.)
- **(b) Reference-style link definitions** `[id]: ./x.md` are unhandled — the scanner only sees inline
  `(...)` targets and `href`/`src`, not the `[id]: target` definition line. A reference-style link into
  `docs/site/` is not rewritten.

### GIVEN/WHEN/THEN

- **docs/site intra-set link site-absolute** — GIVEN a `docs/site/` page `advanced/hooks` with
  `[i](../install.md)`; WHEN `rewriteDocsSiteLinks(md, 'idea', 'advanced/hooks')` runs; THEN the target
  becomes `/idea/install` while absolute URLs, prose, and code are untouched.
- **README `docs/site/` link site-absolute** — GIVEN a README slice with `[guide](docs/site/install.md)`;
  WHEN `rewriteReadmeDocsSiteLinks(md, 'idea')` runs; THEN the target becomes `/idea/install`, and a
  nested `docs/site/advanced/hooks.md` becomes `/idea/advanced/hooks`.
- **Rewrite guard holds** — GIVEN a page with an absolute URL containing `docs/site`, prose mentioning
  `docs/site`, and a relative `[x](docs/site/x.md)`; WHEN either transform runs; THEN only the relative
  link target is rewritten; the absolute URL, prose, and any code mention stay verbatim.

## §closure lint — report-only conformance check (change `x0br`)

The puller lints each `docs/site/` page for closure conformance. Any **relative** link/image whose
resolved path climbs **out** of `docs/site/` (a `..` escape), or any **relative image** (images MUST
be absolute, §3), emits a CI `::warning::` naming the offending file + target — and the page is
**still committed** (canonical wins; never withhold). This mirrors the §7 divergence reporter exactly:
a report-only repo-level lint, **not** a publish gate. It turns "self-contained" from a hope into a
checked invariant and tells the tool author precisely which link broke the rule.

Image targets are scanned in **all three forms**: markdown `![](…)`, raw-HTML `<img src=…>`, and
raw-HTML `<source srcset=…>` (each comma-separated `srcset` candidate's URL is checked) — so a relative
image delivered via the §4-recommended `<picture><source srcset>` is caught, not just markdown images.

**Code is masked before scanning (change `715p`).** The lint scans the page with fenced code blocks
and inline `` `code` `` spans **blanked out** (each code character replaced by a space, preserving line
structure so scanner offsets are unchanged), reusing the same CommonMark fence discipline
(`openFence`/`isClosingFence`) the head/tail/strip scanners use. So an **illustrative** link/image
inside a code sample — a backtick-wrapped `` `![alt](…)` `` image-syntax example in prose, or a
`[x](rel.md)` inside a fenced block — is NOT mistaken for a real relative link/image. A relative link
or image in genuine (non-code) prose still flags. This masks the **detector** only; the render-side
rewriter (`rewriteLinkTargets`, §link resolution) keeps its documented no-fence-tracking over-reach
(rendering behavior is frozen — a code sample's relative link rewrites to the same resolved path, a
known display wart, out of scope). The README-slice link lint (`findReadmeLinkViolations`, §8) masks
code the same way, for the same reason.

It is implemented as a pure, single-sourced detector,
`findClosureViolations(relPath, markdown)` in
[`extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts), shared by the
unit test and the CLI ([`extract-docs-site-cli.mjs`](../../sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs)),
so the tested detection and the CI detection cannot drift. The detector returns each violation with a
`kind` (`escape` | `relative-image`); the CLI consumes a non-empty result as a `::warning::` + exit 0
(writes the page), never exit 1.

### GIVEN/WHEN/THEN

- **A closure-escaping link WARNS but still commits** — GIVEN a `docs/site/install.md` with a relative
  link `[x](../../secret.md)` that resolves above `docs/site/`; WHEN the lint runs; THEN a `::warning::`
  naming the file + link is emitted, the page is STILL committed to `content/<slug>/site/install.md`,
  and the CLI exits 0.
- **A relative image WARNS but still commits** — GIVEN a `docs/site/` page with `![y](./diagram.png)`;
  WHEN the lint runs; THEN a `::warning::` naming the relative image is emitted (images must be
  absolute, §3), and the page is still committed.
- **An intra-set link and an absolute link are clean** — GIVEN a relative `[z](./other.md)` (resolving
  inside `docs/site/`) and an absolute `[a](https://x/y)`; WHEN the lint runs; THEN neither is reported.
- **A link/image inside code is not flagged; a real prose one is (change `715p`)** — GIVEN a page whose
  prose has an inline-code `` `![alt](…)` `` example and a fenced block containing `[x](../../secret.md)`;
  WHEN the lint runs; THEN neither is reported (code is masked), while an unmasked prose
  `![diagram](./arch.png)` still reports a `relative-image` violation.

## §Producer conformance directive

> **Canonical entry point moved (2026-07-17).** Tool repos now conform by reading the producer-facing
> standard at [`sahil87/shll` → `docs/site/standards/readme-extraction.md`](https://github.com/sahil87/shll/blob/main/docs/site/standards/readme-extraction.md)
> (rendered at [shll.ai/shll/standards/readme-extraction](https://shll.ai/shll/standards/readme-extraction)), which distills
> this directive. This section remains the detailed, single-sourced reference that standard is
> reconciled against.

This section is the **per-repo conformance work**, written as a ready-to-hand-to-an-agent task — the
README-prose sibling of [`help-dump-contract.md`](./help-dump-contract.md)'s "Teardown directive."
Each of the 7 tool repos conforms by reading the producer-facing standard above, which distills this
section (the maintainer can still point a repo's agent here for the full detail). The four producer rules (§9.1) and the README structure (§1/§2/§3/§5) are **identical
for every tool**; the only per-tool variance is the repo's **slug** and which **reserved static slugs**
that tool already uses — captured in the per-tool table below. One shared directive (not seven copies)
keeps this single-sourced — the same anti-duplication value the contract enforces for content.

**Why this is safe to do now (precondition).** shll.ai's pull + render wiring is **live for all 7
slugs** (§8) and degrades to a neutral placeholder for any not-yet-conformant tool. So conforming is
purely additive — it lights up the tool's `readme` page and any `docs/site/` pages, and breaks nothing
if deferred. There is no ordering dependency between tools.

**Find your slug** in the per-tool table, then run the task below.

| Repo (file slug) | Binary | `content/<slug>/` collector | URL space | Reserved static slugs already used (do NOT name a `docs/site/` page these) |
|---|---|---|---|---|
| `idea` | `idea` | `content/idea/` | `/idea/` | `overview`, `readme`, `commands` |
| `hop` | `hop` | `content/hop/` | `/hop/` | `overview`, `readme`, `commands` |
| `fab-kit` | `fab` | `content/fab-kit/` | `/fab-kit/` | `overview`, `readme`, `commands` |
| `wt` | `wt` | `content/wt/` | `/wt/` | `overview`, `readme`, `commands` |
| `run-kit` | `run-kit` | `content/run-kit/` | `/run-kit/` | `overview`, `readme`, `commands` |
| `tu` | `tu` | `content/tu/` | `/tu/` | `overview`, `readme`, `commands` |
| `shll` | `shll` | `content/shll/` | `/shll/` | `overview`, `readme`, `commands` |

> The reserved set is exactly **`overview`, `readme`, `commands`** (§9.2) — the three site-owned pages
> every tool has (a hand-authored `overview` directory entry, plus the generated `readme` and `commands`
> pages). It is **uniform across all 7 tools**. Naming a `docs/site/` page after one of these silently
> **shadows** the site-owned page (a `::warning::`, not a build failure), so avoid those three names.
>
> **`install` and `workflows` are NOT reserved — they belong to the tool repo.** A tool that wants an
> install guide or a workflows page publishes it as `docs/site/install.md` / `docs/site/workflows.md`,
> and shll.ai renders it at `/<slug>/install` and `/<slug>/workflows`. There is no
> site-authored install/workflows page to collide with — the tool's own `docs/site/` content is the
> single source. (Earlier hand-authored `install`/`workflows` stubs on the site were removed precisely so
> the tool repo controls this depth — see the changelog.)

---

**Task: Conform this repo's `README.md` (+ optional `docs/site/` tree) to the shll.ai README-extraction contract**

shll.ai (the toolkit landing page) renders a **deduced, curated slice** of this repo's `README.md` on
your tool's `readme` page (`/<slug>/readme`), and renders each file in an optional
`docs/site/**/*.md` tree as its own page under `/<slug>/<path>`. It **pulls** both on a daily
schedule and renders them at build time — **nothing is hand-copied, and you push nothing**. Your only
job is to keep your `README.md` (and any `docs/site/` tree) structured so the pull produces a clean,
unbroken result. Do this as a single change.

**Part 1 — `README.md` structure (always do this):**

1. **Head (§1).** The site slice begins *after* the leading GitHub chrome. Keep your top in this exact
   order: the single **`# <Title>` H1**, then a single **`>` blockquote** (the toolkit line), then a
   **contiguous run of badge/image lines**, then your prose. The first non-chrome line is where the site
   slice starts — make it your tagline/intro. The canonical top (all 7 tools today) looks like:

   ```markdown
   # Fab Kit
   > Part of [@sahil87's open source toolkit](https://shll.ai) — see all projects there.
   [![release](…)](…) [![downloads](…)](…) [![stars](…)](…)

   A development toolkit for AI-assisted coding…   ← first pulled line
   ```

   **Canonical toolkit blockquote (write this exact line).** The blockquote MUST be:

   ```markdown
   > Part of [@sahil87's open source toolkit](https://shll.ai) — see all projects there.
   ```

   The link target is **`https://shll.ai`** (the canonical site — **not** `ai.shll.in`). Keep the text
   and URL identical across all 7 repos so the toolkit framing is single-sourced; this is a convention
   the author maintains by hand (the puller does not rewrite it).

   **What the extractor enforces vs. what is convention.** The puller skips the head by **structure, not
   text** — it drops *any* single leading H1 and *any* single leading blockquote, so the H1 text is free
   (`Fab Kit`, `fab-kit`, or `fab` all work) and the blockquote above is a **convention**, not a
   mechanically-checked rule (it's skipped, so its URL never reaches the site — but keep it correct for
   GitHub readers). What the extractor *does* require for the head to be skipped cleanly: a **markdown
   `#` H1**, not an HTML `<h1>`, and **no YAML frontmatter (`---`) or leading HTML comment above the
   H1** — anything the puller doesn't recognize as chrome (an HTML title, a frontmatter block, a stray
   comment) stops the skip and **leaks into the slice as content**.
2. **Tail (§2).** GitHub-native footer sections are dropped at the **first** of these headings
   (`##`/`###`, case-insensitive, exact text): **`Contributing`, `Development`, `Building`, `License`,
   `Acknowledgements`**. Put everything you want on the site *above* the first such heading. Note
   `Install`/`Installation` is **kept** (pulled to the site — your tool-specific install detail
   belongs there), as are `Changelog`, `Roadmap`, `FAQ`.
3. **Images all-absolute (§3).** **Every** image — in `README.md` AND in `docs/site/**` — MUST be an
   **absolute** `https://…` URL (e.g. `https://raw.githubusercontent.com/sahil87/<repo>/main/docs/shot.png`).
   shll.ai vendors **zero** image binaries; a relative image path renders broken on the site (and a
   relative image inside `docs/site/` is a closure violation, §closure-lint). Keep good `![alt](…)` text
   — it travels to the site verbatim.
4. **Mermaid → rendered image (§5).** Astro/Starlight does not render mermaid; inline ```` ```mermaid ````
   fences are **stripped on pull**. If a diagram must appear on the site, commit a **rendered image**
   (SVG preferred) and reference it by absolute URL. Keep the mermaid source too if you want GitHub's
   native rendering — just also ship the rendered image.
5. **No site-escaping relative links (§9.1.2 — absolute-by-author).** A link to anything *outside* what
   the site renders — source files, `docs/specs/`, `CONTRIBUTING.md`, your repo's other internals —
   MUST be written as an **absolute `https://…` URL by you**. The site does **not** rewrite these, so a
   leftover relative link like `[x](docs/specs/y.md)` renders as a live **404** on the site. The puller
   now emits a CI `::warning::` (report-only — the README-slice link lint) naming any such relative link
   or relative image, so the drift is visible in the run log; the canonical slice is still committed, and
   the fix is to make the link absolute in your README. Only two relative forms are auto-handled: a
   link **into** your `docs/site/` tree written as `docs/site/<path>.md` (rewritten to
   `/<slug>/<path>`), and intra-`docs/site/` links (Part 2). Everything else relative → make it
   absolute. Avoid putting a `docs/site/` link **behind a badge/thumbnail** (`[![alt](img)](docs/site/x.md)`)
   or as a **reference-style definition** (`[id]: docs/site/x.md`) — those two shapes are not rewritten
   (a known consumer limitation) and would 404; write them as plain inline links.
6. **Drop GitHub-only theme tricks (§4/§6).** Do **not** use the `#gh-dark-mode-only` /
   `#gh-light-mode-only` URL-fragment trick — it's stripped on pull. For a genuine light/dark pair use a
   theme-agnostic image (covers ~90% of cases) or a `<picture><source media="(prefers-color-scheme:…)">`.
   (Note: the site toggles theme via Starlight's `data-theme`, not `prefers-color-scheme`, so a
   `<picture>` pair tracks the visitor's OS, not the site toggle — prefer theme-agnostic shots.)
7. **Command/flag accuracy (§7 — report-only, but fix it).** The site cross-checks the commands/flags in
   your pulled prose against `help/<slug>.json` and emits a CI `::warning::` on any that don't exist
   (e.g. a renamed or removed command lingering in the README). This does **not** block the pull — your
   README is canonical and ships verbatim — but a fabricated command will render on the site for up to
   one refresh cycle. Treat the warning as a signal to fix the README.
8. **Cross-link the README to your `docs/site/` pages and the generated command reference.** The README
   is the hub; link out to the deeper pages so a reader (on GitHub *and* on the site) can navigate to
   them. Two specific links every conforming tool SHOULD add:
   - **Installation → `docs/site/install.md`.** When you publish an install guide as `docs/site/install.md`
     (Part 2), link to it from the README's install section as the natural repo-relative path
     `[full install guide](docs/site/install.md)`. shll.ai rewrites that to `/<slug>/install`
     automatically (Part 2 rule 4); on GitHub it resolves to the file in your repo. (The README's own
     short install section still ships in the slice — this is an *additional cross-link to the deeper
     page*, not a replacement.) Apply the same pattern for any other `docs/site/<p>.md` page the README
     references (deep-dives, format contracts): write the natural `docs/site/<p>.md` path.
   - **Command reference → `https://shll.ai/<tool>/commands/`.** Point readers at the site's
     generated, always-fresh command reference with the **absolute** URL
     `[command reference](https://shll.ai/<tool>/commands/)` (substitute your tool slug, e.g.
     `https://shll.ai/run-kit/commands/`). It MUST be absolute — it leaves your repo's content set
     (the absolute-by-author rule, §9.1.2), so the puller renders it verbatim (it is not a relative link
     to rewrite). This is the canonical home for the full `-h` tree; the README need not reproduce it.

**Part 2 — `docs/site/` tree (optional — for depth that doesn't belong inline in the README):**

A tool's real documentation is often "a small README plus a few referenced markdowns" (install guides,
deep-dives, format contracts). Put those in a `docs/site/**/*.md` tree and the site renders each file as
its own page: `docs/site/install.md` → `/<slug>/install`, `docs/site/advanced/hooks.md` →
`/<slug>/advanced/hooks` (subtree shape preserved, `docs/site/` prefix dropped). The tree is a
**closed set** — follow these four rules (§9.1):

1. **Closure.** Every *relative* link/image inside `docs/site/**` MUST resolve to a path **inside**
   `docs/site/`. No `..` may escape it. (A relative link to a non-`.md` asset — a sample `config.json`,
   a `.txt` — does **not** render as a page either; reference such assets by absolute URL.)
2. **External links absolute-by-author.** Same as README rule 5 — any link leaving the rendered set is
   written as an absolute `https://…` URL by you.
3. **All images absolute** — same as Part 1 rule 3, everywhere.
4. **README → `docs/site/` links written naturally** — write `[guide](docs/site/install.md)` in your
   README; the site rewrites it to `/<slug>/install` automatically.

Also: a `docs/site/` page MUST NOT be named `overview`, `readme`, or `commands` (the three site-owned
slugs — see the table) — it would shadow a site page. Every other name is yours, **including `install`
and `workflows`** (publish `docs/site/install.md` / `docs/site/workflows.md` and they render at
`/<slug>/install` / `/<slug>/workflows`). **Only `README.md` and `docs/site/**` are pulled
to the site** — everything else in your repo (source, tests, design notes, any other `docs/` subtree) is
invisible to the site by default, so maintainer-only / design notes need no special folder; just keep
them out of `docs/site/`. Note `docs/specs/` and `docs/memory/` already mean something specific in a fab
repo and are **not** pulled.

**Verify before opening the PR:**

- Your `README.md` top is `#` H1 → toolkit blockquote → badges, with no frontmatter/HTML-comment/`<h1>`
  above it, and the first prose line is the intro you want on the site.
- Grep your README + `docs/site/**` for **relative** link/image targets (`](./`, `](../`, `](docs/`,
  `src="./"`, etc.); every one either points **into** `docs/site/` (README) / stays **inside**
  `docs/site/` (tree pages), or has been rewritten to an absolute `https://…` URL. No relative image
  anywhere.
- No `#gh-dark-mode-only` / `#gh-light-mode-only` fragments; any required diagram is a committed rendered
  image referenced absolutely.
- No `docs/site/` page is named `overview` / `readme` / `commands` (the only three reserved slugs).
  `install` and `workflows` ARE allowed — they render at `/<slug>/install` and
  `/<slug>/workflows`.
- The README cross-links to its deeper pages (rule 8): the install section links to
  `docs/site/install.md` (if you publish one), and a `[command reference](https://shll.ai/<tool>/commands/)`
  link points at the generated reference with the **absolute** site URL (your slug).
- (Optional self-check) Run shll.ai's extractor against your README locally if you have the site repo:
  `node sites/astro-starlight-terminal1/scripts/extract-readme-cli.mjs` — it prints the deduced slice and
  any `::warning::`s, so you can see exactly what the site will render.

**Why this is the whole job:** shll.ai's consumer (pull workflow + render) is already built and live;
you change **only your own repo's content structure**. There is no CI to add, no token, no push — the
site pulls daily and on demand. Conforming lights up your `readme` page and your `docs/site/` pages;
deferring leaves a neutral placeholder and breaks nothing.

---

### GIVEN/WHEN/THEN

- **Directive is paste-ready and single-sourced** — GIVEN a maintainer pointing a tool-repo agent at
  this contract; WHEN the agent reads §Producer conformance directive; THEN it has a self-contained task
  (README structure + optional `docs/site/` tree + verification) that is identical for all 7 tools
  except the per-tool slug/reserved-slug row, so no seven-way duplication exists to drift.
- **Per-tool variance is exactly the slug + reserved slugs** — GIVEN two different tools conforming;
  WHEN each follows the directive; THEN the only differences are the `content/<slug>/` path, the
  `/<slug>/` URL space, and which reserved static-page names to avoid — everything else (the four
  producer rules, the README head/tail/image/mermaid rules) is shared verbatim.
- **Conformance is additive and order-free** — GIVEN the puller is live for all 7 slugs; WHEN any single
  tool conforms (or defers); THEN its `readme`/`docs/site` pages light up (or stay neutral placeholders),
  with no dependency on any other tool conforming first.

## §Extraction reference

The single **machine-anchored** definition of the deduction + strip + verify behavior is:

> [`sites/astro-starlight-terminal1/src/lib/extract-readme.ts`](../../sites/astro-starlight-terminal1/src/lib/extract-readme.ts)
> — `extractReadme(markdown)` (§1 head + §2 tail + §6 strips), `findUnknownTokens(slice, helpDoc)`
> (§7 divergence reporter — detection logic; consumed as a non-fatal `::warning::` by
> `extract-readme-cli.mjs`), and the §9 `docs/site/` consumer functions (SITE-ABSOLUTE,
> slug-aware): `rewriteDocsSiteLinks(markdown, slug, mountPath)` (resolves a docs/site page's relative
> targets against its mount path → `/<slug>/<resolved>`) / `rewriteReadmeDocsSiteLinks(markdown, slug)`
> (a README's `docs/site/<p>.md` → `/<slug>/<p>`) — the two transforms + the shared rewrite guard
> — and `findClosureViolations(relPath, markdown)` (§closure lint — detection logic; consumed as a
> non-fatal `::warning::` by `extract-docs-site-cli.mjs`), plus `findReadmeLinkViolations(slice)`
> (the README-slice link lint — relative links not under `docs/site/`, and relative images; consumed as a
> non-fatal `::warning::` by `extract-readme-cli.mjs`), all pinned by
> `scripts/extract-readme.test.mjs` (native `node --test`).

- `extract-readme.ts` is the **authority for the mechanical behavior**. The prose above MUST agree
  with it; on any discrepancy the prose is reconciled to match the code (the code is what the workflow
  and the component actually run).
- It is **pure and dependency-free** (Constitution VI) and runs at **build time** (Constitution I) —
  the same shape `parse-help.ts` established for the command reference (`qemq`).

### GIVEN/WHEN/THEN

- **Code is the single anchor for the mechanics** — GIVEN a discrepancy between this prose and
  `extract-readme.ts`; WHEN resolving which is authoritative for the mechanical deduction; THEN
  `extract-readme.ts` is the anchor and the prose is reconciled to it.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-18 | Reconciled prose to consumer-code fixes (change `715p` — drift-checker false positives). New **§7.1 "Detection mechanics — the false-positive guards"**: `findUnknownTokens` now (1) stops the flag scan at a bare `--` end-of-options separator, (2) stops it at an angle-bracket `<placeholder>` token (angle-only — `[optional]` does not stop), (3) seeds cobra `completion`/`help` as valid leaf root-children (excluded from every dump by `help-dump-contract.md` §4) — **gated on the root already being a cobra parent** (≥1 real subcommand) so a leaf-root dump like `tu` (`commands: []`) is not falsely turned into a non-leaf that flags its own real tails, and (4) applies a checker-only `UNDUMPED_TOKENS` allowlist for tokens real-but-undumped (the fab-kit sibling-binary command set + hop's hidden `--shim-plan`; hiddenness is not representable in `help/<tool>.json`). Merged dumps rejected (upstream-blocked + changes rendered surfaces). **§closure lint** + the §8 **README-slice link lint** now scan **code-masked** text (fenced blocks + inline `` `code` `` spans blanked, reusing the CommonMark fence discipline) so an illustrative link/image inside a code sample is not flagged; the render-side rewriter is unchanged (its no-fence-tracking over-reach stays, rendering frozen). Remaining warning classes (hop launcher positionals, wt aliases, shll legacy/historical/fenced artifacts, `run-kit url`) stay warned — out of scope. `help-dump-contract.md` untouched (no dump-side change). Code-side change; the machine anchor `extract-readme.ts` stays authoritative and the prose is reconciled to it. |
| 2026-07-18 | Link refresh: the producer-facing standards moved into `docs/site/standards/` in the shll repo (sahil87/shll#42 — the same change also added the fourth standard, `skill`, and a scope column to `shll standards`). Banner + §Producer conformance directive links updated to `docs/site/standards/readme-extraction.md` / `shll.ai/shll/standards/readme-extraction` (+ the principles link). Historical changelog rows keep the old paths. No content or mechanical change. |
| 2026-07-17 | Re-scoped (producer/consumer split): the **producer-facing standard** moved to its canonical toolkit home — `sahil87/shll` `docs/site/readme-extraction.md`, rendered at `shll.ai/shll/readme-extraction` (a sibling of the new toolkit CLI principles page). Added the split banner, reframed the Overview symmetry line, and marked the §Producer conformance directive as the detailed reference the standard distills (tool repos now enter via the shll standard). No mechanical/consumer change; `extract-readme.ts` remains the machine anchor. |
| 2026-06-04 | Created (change `w32m`): forward contract for README extraction. §1 head rule (skip H1 + toolkit blockquote + contiguous badge/image lines), §2 tail rule (final denylist `Contributing`/`Development`/`Building`/`License`/`Acknowledgements`; `Install` INCLUDED; `Changelog`/`Roadmap`/`FAQ` kept), §3 image rule (reference-not-copy, alt-text-travels, co-capture, ≤24h transient-404 accepted, vendoring deferred), §4 dark-theme producer/consumer stanzas (`data-theme` not `prefers-color-scheme`; `<picture>` mapping deferred), §5 mermaid Option A (strip inline, require rendered SVG), §6 strips (mermaid fences + `#gh-*-mode-only` images), §7 the `vn39` validation gate (sole install guard; `shll shell-install` failure mode; single-sourced `findUnknownTokens` verifier), §8 pull model (sibling of `scheduled-help-refresh.yml`, `content/<slug>/` repo-root collector, direct-commit-gated-on-validation, off-deploy, per-tool isolation, `ReadmeSlice.astro` build-time render injected into overviews), §9 `docs/site/` escape hatch (audience axis) marked RESERVED / not yet implemented — only `README.md` is pulled today. §Extraction reference anchors `src/lib/extract-readme.ts`. Symmetric with `help-dump-contract.md`. |
| 2026-06-04 | Reframed (change `4s3e`): the §7 `vn39` cross-check flips from a **blocking publish gate** to a **non-fatal divergence reporter** — the tool README is canonical and rendered verbatim; divergence emits a CI `::warning::` and the slice is still committed (`extract-readme-cli.mjs` → warn + write + exit 0, not exit 1; missing `help/<slug>.json` → "unverified" warning + still write). The `vn39` rule stays a hard rule only for *hand-written* site prose. §8 pull model: **always commit, warn-not-skip** on divergence; per-tool isolation now applies ONLY to genuine fetch/read failures (which keep last-good), not to divergence. Install language (§2/§7): the reporter is an accuracy *reporter*, not the *sole guard*. Render model: the slice now renders on a **parallel per-tool `readme` page** (`/tools/<slug>/readme`, sidebar "Readme", sibling of `commands`), NOT injected into `overview.mdx`; each `overview.mdx` is thinned to a directory entry (GithubButton + framing + nav links). `findUnknownTokens` detection logic is unchanged; false-positive tuning deferred to a follow-up. Anti-drift intro reconciled. |
| 2026-06-07 | Activated `docs/site/` (change `x0br`): §9 flips RESERVED → **ACTIVE** as a **closed-set** model — §9.1 publishes the four producer rules (closure: `docs/site/` is fully self-contained, no `..` escape; external links absolute-by-author; all images absolute everywhere; README→`docs/site/` links written naturally); §9.2 records the reserved-slug precedence (`overview`/`readme`/`commands`/`install`/`workflows`). New **§link resolution**: the consumer's entire rewrite surface is two pure context-free transforms on relative link/image targets only — `rewriteDocsSiteLinks` (`.md`-strip) for docs/site pages, `rewriteReadmeDocsSiteLinks` (`docs/site/`→`./` prefix + `.md`-strip) for the README slice — plus the **rewrite guard** (never touch absolute URLs / prose / code; relative-prefix only; suffix preserved). New **§closure lint**: report-only `findClosureViolations` emits a `::warning::` on a `..`-escape or relative image and STILL commits (mirrors §7). §3 refined: **all images absolute everywhere** (README + `docs/site/`); shll.ai vendors zero binaries; a relative image is a closure violation. §8 extended: a sibling **tarball** fetch (`codeload.github.com/.../tar.gz/<branch>`, untar `docs/site/` subtree, main→master fallback) + multi-page render via the FIRST **dynamic route** (`src/pages/tools/[slug]/[...path].astro`, `getStaticPaths` over `content/<slug>/site/**`, one page per file at `/tools/<slug>/<path>`, rendered through the same `@astrojs/markdown-remark` path as `ReadmeSlice` inside Starlight's `<StarlightPage>`) + a build-time-generated **sidebar** group appended per tool. New consumer functions anchored in §Extraction reference; pinned by `scripts/extract-readme.test.mjs`. Conforming the 7 external repos remains out of scope (forward, per-repo). |
| 2026-06-08 | Extended the **§Producer conformance directive** with cross-linking guidance (Part 1 rule 8 + verify checklist): the README SHOULD link its install section to `docs/site/install.md` (natural repo-relative path, auto-rewritten to `/tools/<slug>/install`) and link a `[command reference](https://shll.ai/tools/<tool>/commands/)` at the generated reference using the **absolute** site URL (absolute-by-author, §9.1.2 — rendered verbatim). The README is the hub; deeper pages are cross-linked, not duplicated. Producer-facing guidance only; no consumer/mechanical change. |
| 2026-06-08 | Reconciled prose to consumer-code fixes (change `ng8c`): **§6** now strips gh-theme images in HTML form (`<img>`/`<source srcset>`) and drops emptied `<picture>` wrappers, not just markdown; **§1** head rule now skips a leading YAML frontmatter block, an HTML `<h1>` title, a leading HTML comment, and `<br>`/`<hr>`/`<span>` badge-row separators (so they no longer leak into the slice); **§link-resolution** a `..`-escape now rewrites to a reserved `/tools/<slug>/__unresolved__/…` marker (shared escape predicate with `findClosureViolations`) instead of the old silent clamp to a real page; **§8** the README pipeline gains a report-only **README-slice link lint** (`findReadmeLinkViolations` — warns on a relative link not under `docs/site/`, or a relative image; mirrors §7, always commits). §Extraction reference + the directive's relative-link rule updated. Code-side change; no producer-contract semantics changed. |
| 2026-06-08 | Shrank the **reserved-slug set** to exactly **`overview`, `readme`, `commands`** (was `overview`/`readme`/`commands`/`install`/`workflows`), uniform across all 7 tools (§9.2, §8 render-side, §Producer conformance directive table + verification). **`install` and `workflows` are no longer reserved** — they belong to the tool repo via `docs/site/install.md` / `docs/site/workflows.md` (rendered at `/tools/<slug>/install` / `/tools/<slug>/workflows`). Rationale: the site's prior hand-authored `install`/`workflows` stubs for `idea` and `fab-kit` were site-authored prose with no canonical source — the hand-copied drift *Tool-Page Depth* forbids — and are being **removed** so the tool repo controls that depth. The static-page deletion + the CLI `RESERVED_SLUGS` update + the `astro.config.mjs` sidebar / `overview.mdx` nav-link cleanup are a **separate consumer-code change** (`260608-ng8c`), not this doc edit. Also **removed the `docs/internal/` concept** (§9 intro + GIVEN/WHEN/THEN + directive): the pull surface is exactly `README.md` + `docs/site/**`, so everything else in a repo is un-pulled by default — maintainer/design notes need no blessed folder. The audience axis is restated as **published vs. not**; `docs/specs/` + `docs/memory/` keep their fab meanings and are not pulled. Producer-facing prose only here. |
| 2026-06-08 | Added **§Producer conformance directive**: a ready-to-hand-to-an-agent task (the README-prose sibling of `help-dump-contract.md`'s "Teardown directive") that specifies the per-repo conformance work — README head/tail/image/mermaid structure (§1/§2/§3/§5), the absolute-by-author link rule and its 404 traps (§9.1.2, incl. the unhandled linked-image / reference-style shapes), the report-only command/flag check (§7), and the optional `docs/site/` closed-set tree (§9.1). One shared directive for all 7 tools (no seven-way copies) + a per-tool table of slug / binary / `content/<slug>/` path / URL space / reserved static slugs. The §out-of-scope boundary note now points here. Rule 1 states the **canonical toolkit blockquote** verbatim with the correct **`https://shll.ai`** link (NOT `ai.shll.in`) as the single source; §1's prose + example now defer to / match it (the old loose `> Part of @sahil87's toolkit…` examples are corrected). Clarified that the head is skipped by structure not text (H1/blockquote content is free to the extractor; the canonical blockquote is a hand-maintained convention). No mechanical/consumer behavior changed — this is producer-facing guidance only. |
| 2026-06-07 | Reworked (`x0br` review): link resolution switched from relative-prefix rewrites to **SITE-ABSOLUTE** `/tools/<slug>/<path>` to be correct under trailing-slash directory serving (the relative form resolved one segment too deep — a README at `/tools/<slug>/readme/` + `./install` → `/tools/<slug>/readme/install`, but the page is at `/tools/<slug>/install/`). The two transforms are now **slug-aware**: `rewriteDocsSiteLinks(md, slug, mountPath)` resolves a page's relative targets against its mount path (`.`/`..` normalized) → `/tools/<slug>/<resolved>`; `rewriteReadmeDocsSiteLinks(md, slug)` maps `docs/site/<p>.md` → `/tools/<slug>/<p>`. Both consumers re-wired (`ReadmeSlice.astro` passes its `tool`; the dynamic route passes `slug` + `mountPath`). `#fragment`/`?query` preserved. A reserved-slug `::warning::` was added to the docs/site CLI (§9.2). Two honest **Known limitations** recorded under §link resolution: the OUTER target of a linked image `[![alt](img)](page.md)` and reference-style link definitions `[id]: ./x.md` are not rewritten (rare; deferred). |
