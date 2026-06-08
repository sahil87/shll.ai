# Intake: Prune stale docs/site pages (the pull must mirror, not accumulate)

**Change**: 260608-e52v-prune-stale-docs-site-pages
**Created**: 2026-06-08
**Status**: Draft

## Origin

Surfaced when the user spotted a live page at `https://shll.ai/tools/fab-kit/README`
(`content/fab-kit/site/README.md` on `main`) and asked if it was a stray that could be deleted.
Investigation found:

1. The file is a **stale explainer** (`docs/site/README.md`) that fab-kit's repo carried *before* the
   `x0br` docs/site activation — its content literally says "§9 pull path is RESERVED / NOT YET
   IMPLEMENTED". fab-kit has **since deleted it** (`origin/main` `498ec57f` carries only
   `docs/site/install.md` + `docs/site/workflows.md`).
2. The agent initially claimed it would "self-heal on the next pull." The user corrected this: **the
   README/docs-site pull jobs are additive — they do not remove files that were deleted upstream.**
   Confirmed against the workflow + CLI (see Why). The stale page will persist **indefinitely** until
   something explicitly deletes it.

**Interaction mode**: conversational. The user chose (option 2) to **delete the stray AND fix the
puller** so this class of bug — a renamed/removed upstream docs/site page stranding a ghost page on the
site — cannot recur as the 7 tool repos churn their docs/site trees during conformance.

> Fix the docs/site pull so it mirrors the upstream tree instead of accumulating: `extract-docs-site-cli.mjs`
> must clear `content/<slug>/site/` before writing the freshly-pulled pages, so a page deleted/renamed
> upstream is removed locally and `git add -A` stages the deletion. Also delete the existing stray
> `content/fab-kit/site/README.md`.

## Why

**The problem (root cause, confirmed in code).** The docs/site mount in
`sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs` is **purely additive**:

- It `collectMarkdown(docsSiteDir)` over the freshly-extracted tarball subtree, then for each page does
  `mkdir -p` + `writeFile` to `content/<slug>/site/<path>.md` (lines ~111–142). It **never removes**
  anything already in `content/<slug>/site/`.
- The tarball extracts into a fresh `mktemp -d` each run, so "what is upstream now" and "what is already
  committed under `content/<slug>/site/`" are **never reconciled**. A page that existed last run but is
  gone upstream this run is simply *not re-written* — its old copy remains on disk.

**Why `git add -A` does not save it.** The workflow's commit step (`.github/workflows/scheduled-readme-refresh.yml`)
runs `git add -A content/` with a comment claiming `-A` handles upstream deletions. `-A` *would* stage a
deletion **if the file were removed from the working tree** — but the CLI never removes it from the
working tree, so `git` sees an unchanged file and stages nothing. `-A` correctly handles a page the CLI
*overwrites*; it does nothing for a page the CLI simply *stops producing*.

**Scope: docs/site tree only, not the README slice.** The README slice (`content/<slug>/README.md`) is a
single fixed path that is always overwritten — a tool cannot "delete its README" — so it never strands.
The bug is specific to the **variable-shape docs/site tree**, where an upstream rename/delete leaves a
ghost (e.g. `fab-kit/site/README.md`, mounting at `/tools/fab-kit/README`).

**The consequence if we don't.** Every future docs/site rename or deletion across the 7 conforming repos
strands a permanent ghost page on the live site — wrong/stale content at a real URL, accumulating
silently. This directly erodes the *Tool-Page Depth* value (the site should mirror the tool's canonical
docs) and the "mechanically synced, never hand-copied" invariant (an accumulating mount is not a mirror).
The `fab-kit/site/README.md` ghost is the first instance; it will not be the last.

**Why this approach over alternatives.**

- **Clear-then-write (mirror) over per-file diff/prune.** Making the mount a faithful mirror is the
  invariant we want; the simplest correct realization is to remove `content/<slug>/site/` at the start of
  a mount and then write the fresh pages. A page-by-page "compute what's missing and `rm` it" prune is
  more code for the same result and easier to get subtly wrong. The committed tree is regenerated from
  canonical every run regardless, so a clear-then-write loses nothing.
- **Clearing on an empty/no-tree pull is SAFE (load-bearing reasoning).** The workflow invokes the CLI
  **only when the tarball fetch SUCCEEDED** — a genuine fetch failure does `site_failed+=($slug); continue`
  *before* the CLI call (workflow lines ~247–256), keeping the last-good tree. Therefore "the CLI runs and
  finds zero `*.md` files" means **the repo genuinely has no docs/site tree now**, and the correct mirror
  is empty — so clearing a previously-committed tree is exactly right (it removes a tree the tool deleted
  wholesale). The CLI must NOT early-exit on zero files without clearing (today it `process.exit(0)` on
  empty — that is precisely the additive bug for the "tree went from N pages to 0" case).
- **Fix in the consumer, not a workflow `rm`.** A `rm -rf content/<slug>/site` step in the YAML before
  the CLI would also work, but the CLI is the single machine-anchor for the mount and is unit-testable;
  keeping the mirror semantics *in the CLI* keeps the workflow a thin driver and lets a test pin the
  behavior. (The workflow's stale "-A handles deletions" comment is corrected to match.)

## What Changes

Two deliverables: **(A)** fix the consumer so the mount mirrors; **(B)** delete the existing stray page.

### A. `extract-docs-site-cli.mjs` — clear `content/<slug>/site/` before mounting

Make the mount a **mirror** of the freshly-pulled tree:

1. **Clear the destination first.** Before writing any page, remove the existing `content/<slug>/site/`
   directory tree (`rm -rf`-equivalent via `node:fs/promises` `rm(outRoot, { recursive: true, force: true })`).
   `force: true` makes a missing dir a no-op (first-ever pull). Then proceed to write the fresh pages
   (the existing `mkdir -p` per-file path recreates the structure).
2. **The empty-tree case clears too (the key fix).** When `collectMarkdown` returns zero files, the CLI
   MUST still clear `content/<slug>/site/` (the repo's tree went to empty) and then exit 0 — NOT
   early-`exit(0)` while leaving the stale tree, as it does today. After this change, "fetch succeeded,
   no docs/site upstream" yields an **empty** `content/<slug>/site/` (the prior pages removed), which
   `git add -A` then stages as deletions.
3. **Safety boundary (must hold):** the clear targets ONLY `content/<slug>/site/` (the per-tool docs/site
   mount), never `content/<slug>/README.md` (the README slice — a different step owns it) and never any
   other path. The path is built from the existing `outRoot = join(repoRoot, 'content', slug, 'site')` —
   reuse it; do not broaden.
4. Behavior otherwise unchanged: report-only closure + reserved-slug lints still run per page; verbatim
   copy; exit 0 except a genuine I/O error.

GIVEN `content/idea/site/` already holds `old.md` + `install.md` and the fresh pull contains only
`install.md`; WHEN the CLI mounts; THEN `content/idea/site/old.md` is gone and only `install.md` remains
(the mount mirrors upstream). GIVEN the fresh pull contains zero `*.md` (repo removed its whole
`docs/site/`); WHEN the CLI runs; THEN `content/<slug>/site/` is emptied (prior pages removed) and the CLI
exits 0. GIVEN a first-ever pull (no `content/<slug>/site/` yet); WHEN the CLI runs; THEN the clear is a
no-op (`force: true`) and the fresh pages are written.

### B. Delete the stray `content/fab-kit/site/README.md`

The fab-kit source `docs/site/README.md` is already gone upstream, so this page would be pruned by the
fixed CLI on the next scheduled run anyway — but delete it now in this change so `main` is clean
immediately (and so the fix's intent is demonstrably realized, not deferred to a cron). `git rm
content/fab-kit/site/README.md`. (The legitimate `content/fab-kit/site/{install,workflows}.md` and all
other tools' pages stay — they have live upstream sources.)

### C. Reconcile the workflow comment + memory

- `.github/workflows/scheduled-readme-refresh.yml`: the commit step's comment claims `-A` handles
  upstream deletions; correct it to note the CLI now mirrors (clears stale pages) so `-A` stages the
  resulting deletions.
- `docs/memory/conventions/docs-site-tree.md`: the CLI section currently says it "copies each file
  verbatim" (additive); add that it **clears `content/<slug>/site/` first** so the mount mirrors the
  upstream tree (stale/renamed/removed pages are pruned). Hydrate-stage update.

## Affected Memory

- `conventions/docs-site-tree`: (modify) the CLI now **mirrors** the upstream docs/site tree — it clears
  `content/<slug>/site/` before writing the fresh pages, so an upstream rename/delete prunes the stale
  mounted page (was purely additive). Note the empty-tree-clears case and the fetch-failure safety
  (CLI only runs on a successful fetch, so clear-on-empty cannot wipe a last-good tree).

## Impact

- **Code**: `sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs` (clear-before-write +
  clear-on-empty), `scripts/extract-readme.test.mjs` (new test — but the CLI's filesystem effect is not
  currently unit-tested; see Open Questions on test shape).
- **Content**: delete `content/fab-kit/site/README.md`.
- **Workflow**: `.github/workflows/scheduled-readme-refresh.yml` comment correction (no behavior change —
  the CLI does the work).
- **Docs**: `docs/memory/conventions/docs-site-tree.md` (hydrate).
- **No new dependency.** Uses `node:fs/promises` `rm` (already importing from that module).

## Open Questions

- Test shape: the existing `extract-readme.test.mjs` pins the **pure** detectors, not the CLI's
  filesystem side effects (the CLI has no unit test today — its behavior is verified out-of-band). Options
  for pinning the mirror behavior: (a) a small focused test that runs the CLI against a temp
  `content/<slug>/site/` with a pre-seeded stale file and asserts it's gone; (b) accept out-of-band
  verification (a local CLI run) consistent with the current no-CLI-test precedent. Lean (a) if it's
  low-friction with a temp dir; confirm in plan.

## Non-Goals

- **Not changing the README-slice step** — it does not strand (single fixed overwritten path).
- **Not touching the tool repos** — fab-kit already removed its `docs/site/README.md`; conforming the
  repos is their own forward work.
- **Not adding a workflow `rm` step** — the mirror semantics live in the CLI (single anchor, testable).
- **Not changing the report-only lint posture** or any rendering/route behavior.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Root cause is the additive CLI mount (mkdir+writeFile, never removes); `git add -A` can't stage a deletion the CLI never makes in the working tree | Confirmed by reading `extract-docs-site-cli.mjs` (lines 111–148) + the workflow commit step; the user independently confirmed the additive behavior | S:96 R:80 A:95 D:95 |
| 2 | Certain | Fix = clear `content/<slug>/site/` before writing the fresh pages (mirror), in the CLI | Simplest correct realization of the mirror invariant; the tree is regenerated from canonical every run so clearing loses nothing | S:90 R:75 A:90 D:88 |
| 3 | Certain | Clearing on a zero-file pull is safe — the workflow only calls the CLI when the tarball fetch SUCCEEDED (fetch failure → continue, keeps last-good) | Verified: workflow lines ~247–256 `continue` before the CLI call on fetch failure. So zero files ⟺ repo genuinely has no docs/site now ⟺ correct mirror is empty | S:92 R:70 A:92 D:90 |
| 4 | Certain | The clear targets ONLY `content/<slug>/site/` (the existing `outRoot`), never the README slice or any other path | Safety boundary; reuse the already-computed `outRoot`, do not broaden — a too-wide `rm` is the one real hazard here | S:95 R:55 A:95 D:92 |
| 5 | Confident | Delete the stray `content/fab-kit/site/README.md` in THIS change (not defer to the cron) | The fix would prune it on the next run, but deleting now makes `main` clean immediately and demonstrates the intent; low risk (source already gone upstream) | S:82 R:78 A:85 D:80 |
| 6 | Confident | Correct the workflow's stale "-A handles deletions" comment + update the docs-site-tree memory | The contract/memory discipline requires prose to match code; an additive→mirror change makes the old comment misleading | S:85 R:82 A:88 D:85 |
| 7 | Tentative | Pin the mirror behavior with a focused CLI filesystem test (temp dir + pre-seeded stale file) rather than out-of-band only | The CLI has no unit test today (precedent), but this fix is *about* a filesystem side effect, so a test is worth more here than for the pure detectors; confirm low-friction in plan | <!-- assumed: add a temp-dir CLI test for the prune; fall back to out-of-band if it needs heavy harness --> S:60 R:68 A:65 D:58 |

7 assumptions (4 certain, 2 confident, 1 tentative, 0 unresolved).
