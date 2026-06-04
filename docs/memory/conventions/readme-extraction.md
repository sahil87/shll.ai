# README Extraction

## Overview

Each of the 7 tools in the toolkit (`idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll`) maintains its richest documentation in its own `README.md`. shll.ai **pulls** a *deduced, curated slice* of each README on a schedule, collects the slices at the **repo root** under `content/<slug>/README.md`, and renders them on each tool's `overview` page.

This is the **README-prose counterpart** of [help-collection](./help-collection.md): where `help-collection` pulls the machine-generated *command reference*, this pulls authored *prose* (the "Why", "Usage", screenshots, rendered diagrams). The two are intentionally symmetric — a forward contract in `docs/specs/` + a consumer (a scheduled pull workflow + a build-time render component). README extraction is the second consumer of the help-pull's proven pull architecture (see [Sibling of the help pull](#sibling-of-the-help-pull-shared-patterns)).

The point is anti-drift: the tool repo is **canonical**; shll.ai never hand-copies README prose. A scheduled job pulls the curated slice daily and commits it, so the site's per-tool prose is fresh *by construction* — the precise drift `vn39` had to clean up (fabricated commands/flags hand-copied onto the site) cannot recur, because nothing is hand-copied and a validation gate ([the `vn39` gate](#the-vn39-validation-gate)) rejects any slice that references a command/flag the tool does not have.

This file documents the **consume/pull side** — how shll.ai deduces, validates, collects, and renders the slice. The **forward contract** — how each tool's README MUST be structured — lives in the spec [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md). This memory file does **not** restate the contract — it points to it and documents the implementation.

> **The asymmetry with `help-dump`.** `help-dump` asks each tool to *emit a new artifact*. This contract mostly **constrains an artifact tools already have** — the README. There is no new subcommand and no new file for a tool author to ship; the obligation is to keep the README's top structure conformant and to commit rendered images for any diagram destined for the site. See the contract's Overview.

## The contract (where it lives)

> **Forward contract**: [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md) — §1 head rule, §2 tail rule (denylist; Install included), §3 image rule, §4 dark-theme producer/consumer stanzas, §5 mermaid Option A, §6 strips, §7 the `vn39` validation gate, §8 pull model, §9 the `docs/site/` escape hatch (reserved/future — not yet implemented).

The **single machine-anchored** definition of the deduction + strip + verify behavior is `sites/astro-starlight-terminal1/src/lib/extract-readme.ts`. The prose contract MUST agree with it; on any discrepancy the prose is reconciled to match the code (the code is what the workflow and the component actually run).

## The deduction rules (as implemented)

`extract-readme.ts` exports `extractReadme(markdown)` — a **pure, dependency-free, total** function (never throws on arbitrary input) returning the extracted slice. It applies, in order:

- **Head rule (§1)** — skip a contiguous run of leading GitHub chrome from the top: the single leading **H1** (`# tool-name`), a single leading **`> blockquote`** (the `> Part of @sahil87's toolkit …` line + wrapped continuation lines), and any contiguous run of **image/badge lines** (`![alt](url)`, `[![alt](img)](href)`, `<p align=…><img …></p>`, bare `<img …>`). Blank lines interleaved with these are part of the skipped head. Skipping **stops at the first non-blank line that is none of the above** — that line begins the slice. A no-chrome README (first non-blank line is prose) is returned unchanged from the head.
- **Tail rule (§2)** — the slice ends immediately before the **first denylisted heading** after the head. Denylist: `Contributing`, `Development`, `Building`, `License`, `Acknowledgements` (case-insensitive, `##`/`###`, matched on heading text independent of position). `Install`/`Installation` is **INCLUDED** (pulled, not excluded — its accuracy is guarded by the [`vn39` gate](#the-vn39-validation-gate), not by exclusion). `Changelog`/`Roadmap`/`FAQ` are **NOT denylisted**. No denylisted heading → slice runs to end-of-file.
- **Strips (§6)** — two pure text transforms applied to the slice after the boundary cuts: (1) **mermaid fences** — every ```` ```mermaid ```` … ```` ``` ```` block removed (Starlight does not render mermaid; adding a renderer violates Constitution I/VI — see contract §5); non-mermaid fences left intact. (2) **GitHub theme-only images** — any image whose URL carries `#gh-dark-mode-only` / `#gh-light-mode-only` removed (renders wrong-theme duplicates off GitHub); plain images preserved.

The denylist, mermaid/theme-image markers, and head-chrome patterns are **named constants** (no magic strings). The module imports no npm package (Constitution VI).

## The `content/` collector

`content/` is a top-level directory at the **repo root** (sibling to `help/`, `sites/`, `fab/`, `docs/`), holding `content/<slug>/README.md` per tool. It is **not** nested under any `sites/<name>/`.

**Why the root.** Same rationale as [`help/`](./help-collection.md#the-help-collector): the slice data is project-level, not owned by any one site variant. Keeping it at the root means it **survives a live-site swap** (Constitution III — One Live Site at a Time): changing `SITE_DIR` does not require moving the collector. It is kept **distinct from `help/`** so the two data kinds — JSON command trees vs. markdown prose slices — don't overload one directory.

**Filename.** The slice file is `content/<slug>/README.md` — the directory is fixed by the contract; naming the file `README.md` keeps provenance obvious. Today **only** `README.md` is pulled and rendered; the `docs/site/*.md` siblings the contract sketches (contract §9) are a **reserved/future** extension — there is no `docs/site/` fetch or render path yet. A `content/.gitkeep` is committed so the repo-root collector exists at build time even before any tool's first successful pull.

**No slice data ships in this change.** The slices are produced by the daily workflow against live external repos; the change `w32m` ships only the *machinery*. Every tool renders the placeholder until its first successful pull.

## The `ReadmeSlice.astro` render component

`sites/astro-starlight-terminal1/src/components/ReadmeSlice.astro` (sibling to `CommandReference.astro`) reads the pulled slice at build time and renders it to static HTML. It is **transport-agnostic** — it does not care whether a PR or a cron put the file there.

- **Prop**: `tool` (the slug). The component does the read + render; page authors only pass the slug. A missing-slug prop fails the build loudly (mirrors `GithubButton`/`CommandReference`).
- **Placement**: injected into each tool's existing `overview.mdx` under `<GithubButton>` — **NOT a new dedicated page**. The overview thus becomes `<GithubButton>` + `<ReadmeSlice>` + the original hand-written prose. The `astro.config.mjs` sidebar is **unchanged** (no new page) and the `Reference` group + `CommandReference`/`CommandIndex` (`qemq`) are untouched.
- **Build-time `fs` read via ascend-to-root (NOT glob, NOT fetch, NOT `process.cwd()`, NOT a fixed depth)**: `findRepoRoot` ascends from `import.meta.url`'s directory until it finds the directory that CONTAINS a `content/` folder, then reads `<that-root>/content/<tool>/README.md`. This is the **identical strategy** `CommandReference.astro` uses for `help/` (anchored on `content/` instead) — see [help-collection → Resolution gotcha](./help-collection.md#rendering-consumer-commandreference): a *fixed* relative depth silently ENOENTs under `astro build` because Vite bundles the frontmatter chunk at an unstable depth, so the read must anchor on the module URL and ascend. The ascent is bounded; if no `content/` ancestor exists at all it throws a clear, build-failing error (the repo-root collector is missing — a broken cross-boundary contract, distinct from the per-tool missing-file case below).
- **Render**: the markdown string is rendered to HTML at build time via `@astrojs/markdown-remark`'s `createMarkdownProcessor` (see [Dependency reconciliation](#dependency-reconciliation-astrojsmarkdown-remark)). No client JS for primary content (Constitution I). Styling reuses the terminal `--c-*` tokens (dark-mode parity, Constitution V) with a `:focus-visible` ring (Accessibility).
- **Missing vs. invalid (two distinct failure modes)** — same discipline as `CommandReference`:
  - **MISSING** (`ENOENT`): render a neutral placeholder ("README slice not generated yet — see the GitHub README") and **let the build succeed**. A missing slice is the expected interim state until a tool's first successful pull lands.
  - **PRESENT but unreadable/invalid**: the error propagates so **`astro build` fails** loudly — a committed defect must not deploy. The two cases are never conflated.

## The `scheduled-readme-refresh.yml` pull job

shll.ai pulls README slices via `.github/workflows/scheduled-readme-refresh.yml` — a **sibling** of `scheduled-help-refresh.yml`, deliberately **OFF the deploy path**.

- **Triggers**: a daily `schedule` cron (`41 7 * * *`, offset from help-refresh) + `workflow_dispatch` (on-demand after a README change).
- **Per-tool pipeline** (looped over all 7 tools, a slug:repo table): fetch the repo's `README.md` from `raw.githubusercontent` (main→master fallback) → run `extractReadme` (head/tail deduction + strips) → run the `findUnknownTokens` gate against `help/<slug>.json` → on success commit the slice to `content/<slug>/README.md`. The extraction + gate run via a thin CLI (`scripts/extract-readme-cli.mjs`) over the same module.
- **Commit**: a **direct commit to `main`**, **gated on the `vn39` gate passing** in the same job, using the default `GITHUB_TOKEN` with minimal `contents: write`. No PR, no auto-merge — sound because the committer is a single trusted cron (same reasoning as help-refresh).
- **Per-tool failure isolation**: a failed fetch / failed extraction / failed gate for one tool MUST NOT clobber its last-good committed slice, nor block the others. Each tool is captured into a temp file and only overwrites the committed file on success.
- **Off the deploy path (load-bearing)**: the refresh job does not deploy. When it commits to `main`, the **existing** `deploy.yml` push-to-`main` deploy ships the updated slice — no separate deploy trigger is added (Constitution IV). A flaky fetch or a non-conformant README therefore breaks the REFRESH, not the deploy; the site keeps shipping the last-good slice.
- **Toolchain**: pinned pnpm 10 + Node 22 (reusing the help-refresh / `deploy.yml` setup pattern).

## The `vn39` validation gate

Pulled prose WILL contain command/flag examples — exactly what the [`vn39` binding rule](./help-collection.md#hand-written-prose-must-not-contradict-helpjson-the-binding-rule) polices ("site prose MUST NOT reference commands/flags absent from `help/<tool>.json`"). The pull job runs each slice through this gate **BEFORE commit**, or it would auto-import the very drift `vn39` banned.

- **The gate is now the SOLE guard on install accuracy.** Because `Install` is pulled (not excluded — contract §2), nothing but this gate stops a fabricated install command from reaching the site. The exact `vn39` failure mode — `shll shell-install`, a non-existent alias that lived in install instructions — is caught here: a pulled slice (incl. its Install section) referencing a command/flag absent from `help/<tool>.json` **fails the pull for that tool** (keeping its last-good slice) and surfaces the defect. The fix belongs in the tool's README, never a silent exclusion on the shll.ai side. Install-section command verification is a **first-class gate case**, not an afterthought.
- **Single-sourced verifier**: the gate is `findUnknownTokens(slice, helpDoc)` in `extract-readme.ts` — a pure helper that, given a slice and a parsed `help/<tool>.json` tree, returns the set of referenced command/flag tokens absent from the tree. The **same function** backs both the unit test and the workflow CLI, so the tested behavior and the CI behavior cannot drift (the very class of bug `vn39` itself fixed). Command-path truth comes from the `help/<tool>.json` tree; flag truth from the build-time `parseHelp` decomposition the command reference already trusts.
- **The `childrenOf` positional-arg fix (load-bearing — don't regress).** A naive verifier grows the command path through *every* bare word after the binary, which flags a known leaf command followed by a positional arg (`shll install mytool`) as an "unknown subcommand". The implemented `helpFacts` carries a **parent→children map** (`childrenOf`); the token walk descends only into known children and **stops at a known leaf** (everything after a leaf is treated as args), flagging a token only when the current node HAS children and the token isn't one of them. The test pins both sides: `<known-leaf-command> <positional-arg>` is NOT flagged (`shll install mytool`, `wt create feature`, `hop shell-init zsh`, `hop config add somedir`, `hop clone myrepo`), while true positives STILL flag (`shll shell-install`, `wt summon`, `hop config bogus`).

## The extraction test

`sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` is a native `node --test` (type-stripping — the same toolchain as `validate-help.mjs`/`parse-help.test.mjs`), 21 cases covering: head (chrome skip + no-chrome passthrough), tail (denylist stop, Install kept, Changelog/Roadmap/FAQ kept, no-denylist→EOF), mermaid-strip (mermaid removed, bash kept), theme-image-strip (both `#gh-*` removed, plain kept), and the verifier (unknown token incl. the `shll shell-install` case; clean slice passes against a real `help/*.json`; the `childrenOf` positional-arg regression cases).

This follows the precedent `qemq` set for `parse-help.ts`: a pure, dependency-free, build-time text transform pinned by a native `node --test` (see [help-collection → build-time `parseHelp`](./help-collection.md#rendering-consumer-commandreference)). README extraction is the same class of problem (parse pulled text at build time, no new dependency) and reuses the precedent rather than inventing a parallel one.

> **A full `astro build` is also a gating check.** It is the only thing that catches the phantom-dependency class of bug (a bare import of an undeclared-but-transitive package resolves in `node --test` but fails Vite/Rollup at build) — see [Dependency reconciliation](#dependency-reconciliation-astrojsmarkdown-remark).

## Dependency reconciliation (`@astrojs/markdown-remark`)

Rendering an in-memory markdown string read by `fs` (the contract-mandated read path) needs a markdown→HTML step. The component uses `@astrojs/markdown-remark`'s `createMarkdownProcessor`, **declared explicitly** in the site `package.json` pinned to `7.1.2` (the exact version `astro@6.3.3` core depends on directly; also a dep of `@astrojs/starlight`).

**Honest reconciliation with Constitution VI.** This is a **build-time** dependency **already pulled transitively** by astro/starlight. Declaring it explicitly makes an EXISTING dep **importable**, not a NEW dep — no new runtime dependency, no new transitive weight, no version split. The declaration is required because **under strict pnpm a transitive dep is NOT hoisted** to the site's top-level `node_modules`, so a bare `import '@astrojs/markdown-remark'` does not resolve and `astro build` fails for the whole site (the component is injected into all 7 overviews). This was caught only at full `astro build` (it resolved fine under `node --test`).

> This is **NOT** the `z`-from-`astro:content` case (see [help-collection → Zod module](./help-collection.md#zod-schema-module-the-machine-checkable-contract)): `astro:content` is a Vite **virtual module** Astro injects (needs no `package.json` entry), whereas an npm package import does.

## Sibling of the help pull (shared patterns)

README extraction is the **second consumer** of the pull architecture [help-collection](./help-collection.md) proved. Both reuse, now exercised by two data kinds:

| Shared pattern | help-collection | readme-extraction |
|----------------|-----------------|-------------------|
| Daily scheduled job, off deploy path | `scheduled-help-refresh.yml` | `scheduled-readme-refresh.yml` (sibling) |
| Repo-root data surviving a live-site swap | `help/<slug>.json` | `content/<slug>/README.md` |
| Direct-commit-to-`main`, gated on validation | Zod `validate-help.mjs` | `findUnknownTokens` (`vn39`) gate |
| Per-tool failure isolation (keep last-good) | per-tool capture | per-tool fetch/extract/gate |
| Ascend-to-root `import.meta.url` build-time read | `CommandReference` → `help/` | `ReadmeSlice` → `content/` |
| missing→placeholder / present-but-invalid→build-fail | `CommandReference` | `ReadmeSlice` |
| Pure, dependency-free, native-test-pinned build-time parse | `parse-help.ts` (`qemq`) | `extract-readme.ts` |

They are kept **distinct** (not one merged workflow) because each is a different data kind with a different gate and different failure semantics — see [Design Decisions](#design-decisions).

## Design Decisions

- **Sibling workflow, not extend `scheduled-help-refresh.yml` (change `w32m`).** The README pull is a distinct data kind (markdown slices → `content/`) with a distinct gate (the `vn39` command/flag cross-check vs. the Zod schema validation) and distinct failure semantics; a sibling keeps each workflow single-purpose, leaves help-refresh untouched (lower blast radius), and matches the producer/consumer symmetry. *Rejected*: extending the existing workflow — would overload one job with two unrelated data kinds and two gates, and couple their failure isolation.
- **Render markdown via `@astrojs/markdown-remark`, declared explicitly (Option B) (change `w32m`).** The `fs`-read path needs a string→HTML step; `@astrojs/markdown-remark` is already in the tree transitively, so declaring it (pinned to astro core's version) makes the existing build-time dep importable under strict pnpm — no new runtime dep, no new transitive weight (Constitution VI honored honestly). *Rejected*: a new `marked`/`markdown-it` dep (genuinely new — Constitution VI); a glob content collection / `import.meta.glob` (the contract forbids it for the read path, and `content/` lives OUTSIDE `src/`, so a Starlight content collection can't reach it without large churn that contradicts the locked overview-injection design); a hand-rolled markdown→HTML renderer (too lossy for full README prose).
- **Inject into `overview.mdx`, not a new page (change `w32m`).** Depth is sought first on the overview; fewer pages. The overview becomes `<GithubButton>` + `<ReadmeSlice>` + existing prose. The cross-tool `Reference` axis (`qemq`) is a different surface and is not touched — README prose stays on the per-tool axis.
- **Install is INCLUDED, guarded by the gate — not excluded (change `w32m`).** A per-tool install section carries legit tool-specific detail; `vn39` is satisfied by the validation gate (commands must be real), not by excluding the section. The global quick-start ("install the whole toolkit") and a per-tool install ("install just this tool") coexist, framed differently — both can be simultaneously correct. This makes the `vn39` gate the **sole** guard on pulled-install accuracy.
- **`vn39` verifier is a shared pure helper (change `w32m`).** The same cross-check backs both the unit test and the workflow gate; one implementation avoids the drift class `vn39` itself fixed. The `childrenOf` parent→children walk prevents the positional-arg false positive (`shll install mytool`). *Rejected*: a bash-only grep gate in the workflow (would diverge from the tested logic).
- **Constitution amendment backs this (change `w32m`).** The site now hosting deep synced prose required amending `constitution.md` v2.0.0 → v2.1.0 (the new **Tool-Page Depth** constraint). The anti-drift value of the old "thin directory" stance is preserved and made explicit — content is single-sourced and mechanically synced, never hand-copied. See [tool-page-rubric](./tool-page-rubric.md#pulled-readme-slice-exception-change-w32m).

## Changelog

| Date | Change |
|------|--------|
| 2026-06-04 | Created (change `w32m`): the consume/pull side of README extraction, mirroring [help-collection](./help-collection.md). Documents the deduction rules (head/tail/strips) as implemented in the pure, dependency-free, native-test-pinned `src/lib/extract-readme.ts` (forward contract in [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md)); the `content/<slug>/` repo-root collector (sibling to `help/`, survives a live-site swap); `ReadmeSlice.astro` (ascend-to-`content/` build-time read, `@astrojs/markdown-remark` render, injected into `overview.mdx`, missing→placeholder / invalid→build-fail); the `scheduled-readme-refresh.yml` daily pull (sibling of help-refresh, off deploy path, per-tool isolation, direct-commit gated on the gate); the `vn39` `findUnknownTokens` gate (sole install guard, single-sourced for test + CLI, `childrenOf` positional-arg fix); and the `@astrojs/markdown-remark` dependency reconciliation (declared-but-already-transitive). Constitution amended v2.0.0 → v2.1.0 (Tool-Page Depth). |
