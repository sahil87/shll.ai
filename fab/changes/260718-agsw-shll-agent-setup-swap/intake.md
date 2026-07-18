# Intake: Swap `run-kit agent-setup` → `shll agent-setup` in site-authored content

**Change**: 260718-agsw-shll-agent-setup-swap
**Created**: 2026-07-18

## Origin

> agsw

One-shot invocation via `/fab-new agsw` (backlog ID). Backlog item `[agsw]` (2026-07-18), verbatim:

> Replace `run-kit agent-setup` with `shll agent-setup` across SITE-AUTHORED content, once the shll release shipping `agent-setup` is out. GATE: hand-written site prose must not reference commands absent from help/shll.json (the vn39 hard rule for site-authored prose) — the refreshed help/shll.json carrying `agent-setup` is the green light to merge this. Known occurrence (grepped 2026-07-18, the only site-authored one): sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro ~line 96 — the `followOn` block line `'run-kit agent-setup   # optional, once per machine'`, rendered via the shared component on the homepage (src/content/docs/index.mdx) AND all 7 tools/<tool>/overview.mdx pages; change it to `'shll agent-setup      # optional, once per machine'` (preserve the comment column alignment of the surrounding lines). Re-grep sites/ at execution time for any newer site-authored mentions. Do NOT touch content/** (pulled canonical slices — content/shll/README.md and content/run-kit/** self-heal via the daily refresh once the tool repos' own READMEs update; the shll README half is pre-staged as a gated PR in the shll repo) and do NOT touch fab/changes/** (history). Context for the edit: `shll agent-setup` graduates from `run-kit agent-setup` — it writes the toolkit agent-context stanza into installed agent harnesses (teaching agents the `shll skill` two-step) and DELEGATES run-kit hook installation to `run-kit agent-setup` (slimmed to hooks-only), so the "optional, once per machine" framing is unchanged. Full design: shll repo fab/backlog.md item [agst].

**Intake-time verification (2026-07-18)** — facts established while creating this intake:

- **The merge gate is NOT yet satisfied**: `help/shll.json` (captured `2026-07-17T09:20:26Z` by the daily `refresh-help.yml` pull) contains **zero** mentions of `agent-setup`. The freshly-pulled `content/shll/README.md` likewise still shows `run-kit agent-setup` in its quick-start. The shll release shipping `agent-setup` is not out yet (its README half is pre-staged as a gated PR in the shll repo, per the backlog).
- **The backlog's "only occurrence" claim is stale**: the mandated execution-time re-grep of `sites/` found **three** site-authored occurrences, not one (see What Changes). The two extra ones are in `src/content/docs/getting-started/install.md` — site-authored (the pulled canonical slices live at repo-root `content/**`, a different tree).
- `help/run-kit.json` **does** carry `agent-setup`, so residual `run-kit agent-setup` references in rewritten prose remain vn39-valid.
- The vn39 hard rule for hand-written prose is enforced by review discipline, not by a CI job (CI's `validate-help.mjs` checks `help/*.json` schema; `findUnknownTokens` runs report-only on pulled README slices). Merging early would violate the constitution's Tool-Page Depth constraint without tripping CI — the hold is procedural.

## Why

1. **Pain point**: The toolkit's post-install step is graduating — `shll agent-setup` supersedes `run-kit agent-setup` as the "optional, once per machine" agent-harness setup command. It writes the toolkit agent-context stanza into installed agent harnesses (teaching agents the `shll skill` two-step) and **delegates** run-kit hook installation to `run-kit agent-setup`, which slims down to hooks-only. Site-authored install guidance that still leads with `run-kit agent-setup` will steer users to the narrower command and skip the agent-context half.
2. **Consequence of not fixing**: Once the shll release ships and the pulled canonical slices (`content/shll/README.md`, `content/run-kit/**`) self-heal via the daily refresh, the site's *hand-written* install steps (homepage + all 7 tool overviews via the shared `InstallOneLiner` component, plus the install guide) would contradict the canonical READMEs rendered on the very same site — exactly the drift the `vn39` rule exists to prevent.
3. **Why this approach**: Pre-stage the swap on a branch now (this change), hold the merge until the daily help refresh lands `agent-setup` in `help/shll.json` (the vn39 green light). Pulled content is left untouched — it self-heals mechanically; only the three site-authored occurrences are edited by hand, which is the split the constitution's Tool-Page Depth constraint prescribes.

## What Changes

### 1. `InstallOneLiner.astro` — the shared follow-on block (mechanical swap)

`sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro:96`, inside the `followOn` array (rendered on the homepage `index.mdx` and, via the shared component, all 7 `tools/<tool>/overview.mdx` pages when `tool === 'shll'`):

```diff
 const followOn = [
   'shll shell-setup      # wire your shell integration',
-  'run-kit agent-setup   # optional, once per machine',
+  'shll agent-setup      # optional, once per machine',
   'exec $SHELL           # reload your shell',
 ].join('\n');
```

Exact replacement string per the backlog: `'shll agent-setup      # optional, once per machine',` — the comment column alignment of the surrounding lines (comments start at the same column) MUST be preserved. `shll agent-setup` is 3 chars shorter than `run-kit agent-setup`, so the gap widens from 3 to 6 spaces.

### 2. `install.md` line 16 — the canonical hand-written install block (swap + comment touch-up)

`sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md:16` (the block `InstallOneLiner`'s comment names as the wording it mirrors — "the sole hand-written carrier of the full steps"):

```diff
 shll shell-setup                        # wire your shell integration
-run-kit agent-setup                     # optional, once per machine: agent state in the run-kit dashboard
+shll agent-setup                        # optional, once per machine: agent context + run-kit dashboard state
 exec $SHELL                             # reload so the shell integration takes effect
```

Same alignment rule (comments start at one shared column). The trailing comment is updated because "agent state in the run-kit dashboard" describes only the delegated half — the graduated command's primary job is the agent-context stanza. Exact comment wording is an apply-time choice (see Assumptions #5); it MUST stay a short one-line hint, not a second explanation.

### 3. `install.md` line 52 — the explanatory paragraph (semantic rewrite, not a token swap)

`sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md:52` currently reads:

> The `run-kit agent-setup` line above is optional and once per machine — it lights up live agent state in [run-kit](/run-kit/)'s dashboard: **active** / **waiting** / **idle** for every pane running a coding agent. It installs agent-harness hooks into your user-global agent config (v1: Claude Code) that report each pane's lifecycle state; until it's run, agent state shows `—` in the dashboard. It shows the settings diff and asks before writing, re-running is idempotent, and `run-kit agent-setup --uninstall` removes exactly the run-kit-owned entries. Details in the [run-kit install guide](/run-kit/install/).

A pure token swap here would produce **false prose** (it would attribute run-kit's hook mechanics and `--uninstall` behavior to `shll agent-setup`). Rewrite the paragraph to describe the graduated command per the backlog's design context:

- `shll agent-setup` is optional and once per machine (framing unchanged).
- It writes the **toolkit agent-context stanza** into installed agent harnesses — teaching agents the `shll skill` two-step.
- It **delegates** run-kit hook installation to `run-kit agent-setup` (now hooks-only), which is what lights up the live agent state (**active** / **waiting** / **idle**) in run-kit's dashboard.
- Keep the pointer to the [run-kit install guide](/run-kit/install/) for the dashboard/hooks details; residual `run-kit agent-setup` mentions are fine (`help/run-kit.json` carries `agent-setup`).
- **Claims discipline**: assert only behavior the backlog's design context states. Do NOT carry over run-kit-specific claims (settings diff, idempotent re-run, `--uninstall` semantics) onto `shll agent-setup` unless the refreshed `help/shll.json` confirms them at merge time. When in doubt, say less and link out.

### 4. Execution-time re-grep (repeat at apply)

Apply MUST re-run the sweep (the backlog mandates it — this intake's grep is already one day fresher than the backlog's and found two occurrences the backlog missed):

```bash
grep -rn "run-kit agent-setup" sites/ | grep -v node_modules
```

In scope: everything site-authored under `sites/`. Out of scope (do NOT touch): repo-root `content/**` (pulled canonical slices — self-heal via daily refresh), repo-root `help/**` (puller-owned), `fab/changes/**` (history). The other site variant `astro-tailwind-terminal1` currently has zero occurrences.

### 5. Merge gate (ship-time blocker — not an apply blocker)

The PR from this change MUST NOT merge until `help/shll.json` carries **both** `agent-setup` and `skill` (the vn39 green light — hand-written prose must not reference commands absent from the tool's help doc, and the rewritten line-52 paragraph names both tokens: the command itself plus "the `shll skill` two-step"). Check with:

```bash
grep -c '"name": "agent-setup"' help/shll.json   # ≥1 on the target branch's main = green
grep -c '"name": "skill"' help/shll.json         # ≥1 required too (line-52 prose names `shll skill`)
```

The daily `refresh-help.yml` pull will land them once the shll release ships (or trigger via `workflow_dispatch` on-demand). At merge time, also validate the rewritten line-52 prose against the refreshed `help/shll.json` text — in particular the "(v1: Claude Code)" scoping of the stanza-writing and the "(now hooks-only)" framing of `run-kit agent-setup`, neither of which committed help confirms verbatim; adjust or drop any claim the actual help text contradicts (review finding, 2026-07-18).

## Affected Memory

None — this is a site-content edit (two files, a command-token swap plus one paragraph rewrite). No build behavior, contract, pull pipeline, or page structure changes; the vn39 rule and its two-mode enforcement are already recorded in `conventions/help-collection.md` and are applied here, not modified.

## Impact

- **Files**: 2 — `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro` (1 line), `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md` (1 line + 1 paragraph).
- **Rendered surfaces**: homepage install block, all 7 `/tools/<tool>/` overview install sections (all via the one shared component — single-source, so one edit), and `/getting-started/install/`.
- **No dependencies, no config, no schema changes.** Static content only (Constitution I untouched).
- **Tests/CI**: no test touches these strings; `astro build` in CI validates nothing about them. Verification is visual/grep-based.
- **Timing**: apply/review can complete now on the branch; **merge is gated** on the refreshed `help/shll.json` (see What Changes §5).

## Open Questions

None — the backlog item pre-answers design intent; the merge-gate status was verified at intake time (not yet green, hold the PR).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `InstallOneLiner.astro:96` swap uses the backlog's exact replacement string with comment-column alignment preserved | Backlog specifies the literal line; alignment rule stated verbatim | S:95 R:90 A:95 D:95 |
| 2 | Certain | Scope is all 3 site-authored occurrences (component line + `install.md` lines 16 and 52), not just the backlog's known one | Backlog mandates the execution-time re-grep; `src/content/docs/` is site-authored (pulled slices live at repo-root `content/**`) — grep verified 2026-07-18 | S:85 R:85 A:90 D:85 |
| 3 | Confident | Stage the change now despite the unsatisfied gate; the gate blocks the MERGE, not intake/apply — hold the PR until `help/shll.json` carries `agent-setup` | User invoked `/fab-new agsw` deliberately on the item's creation date; backlog phrases the gate as a merge green-light; pre-staging is fully reversible | S:60 R:85 A:70 D:60 |
| 4 | Confident | `install.md:52` gets a semantic rewrite (stanza-writing + delegation to hooks-only `run-kit agent-setup`), minimal claims, validated against refreshed `help/shll.json` at merge | A pure token swap would produce false prose; backlog supplies the design context; exact wording easily revised | S:75 R:80 A:70 D:65 |
| 5 | Confident | `install.md:16` trailing comment updated to cover the broadened scope (e.g. "agent context + run-kit dashboard state"); exact wording is an apply-time choice | Old comment describes only the delegated half; one-line hint, trivially reversible, low stakes | S:50 R:85 A:65 D:50 |
| 6 | Confident | Change type `docs` — hand-written site copy/prose update, no functional site behavior change | Content-only edit to install guidance; closest taxonomy fit | S:60 R:90 A:80 D:70 |

6 assumptions (2 certain, 4 confident, 0 tentative, 0 unresolved).
