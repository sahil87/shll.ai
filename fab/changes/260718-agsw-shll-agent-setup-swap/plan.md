# Plan: Swap `run-kit agent-setup` → `shll agent-setup` in site-authored content

**Change**: 260718-agsw-shll-agent-setup-swap
**Intake**: `intake.md`

## Requirements

<!-- Derived from the intake's What Changes sections. This is a docs/site-content
     change: three site-authored occurrences of `run-kit agent-setup` are updated
     (two mechanical token swaps with column alignment preserved, one semantic
     paragraph rewrite with minimal claims), plus a mandated execution-time
     re-grep of sites/ to catch any newer occurrences. Pulled canonical content
     (repo-root content/**), puller-owned help/**, and fab/changes/** are OUT OF
     SCOPE — they self-heal or are history. -->

### Site content: install-command swap

#### R1: Shared `InstallOneLiner` follow-on block swaps to `shll agent-setup` with alignment preserved
The `followOn` array in `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro` MUST replace the line `'run-kit agent-setup   # optional, once per machine',` with `'shll agent-setup      # optional, once per machine',`. The comment column alignment of the surrounding follow-on lines (all `#` at the same column) MUST be preserved — since `shll agent-setup` is 3 chars shorter than `run-kit agent-setup`, the gap before the comment widens from 3 to 6 spaces so the `#` stays at the shared column.

- **GIVEN** the `followOn` block renders on the homepage (`index.mdx`) and, via the shared component, all 7 `tools/<tool>/overview.mdx` pages when `tool === 'shll'`
- **WHEN** the swap is applied
- **THEN** the follow-on block reads `shll agent-setup      # optional, once per machine` with its `#` aligned to the same column as the `shll shell-setup` and `exec $SHELL` comment columns
- **AND** no other line in the component changes

#### R2: Hand-written `install.md` install block swaps to `shll agent-setup` with alignment preserved and comment touch-up
Line 16 of `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md` MUST replace `run-kit agent-setup` with `shll agent-setup`, preserving the block's shared comment column (all three lines' `#` at the same column). The trailing comment MUST be updated from "optional, once per machine: agent state in the run-kit dashboard" (which describes only the delegated half) to a short one-line hint covering the broadened scope (agent context + run-kit dashboard state). The comment MUST remain a single short hint, not a second explanation.

- **GIVEN** the install block's three lines share one comment column
- **WHEN** the swap + comment touch-up is applied
- **THEN** line 16 reads `shll agent-setup` followed by spaces to the shared comment column, then a short updated one-line comment
- **AND** the `shll shell-setup` and `exec $SHELL` lines are unchanged, and their comment column is preserved

#### R3: The `install.md` explanatory paragraph is semantically rewritten, not token-swapped, with minimal claims
Line 52 of `install.md` MUST be rewritten to describe `shll agent-setup` accurately rather than swapping the token in place (a pure token swap would falsely attribute run-kit's hook mechanics, settings-diff/idempotent-re-run behavior, and `--uninstall` semantics to `shll agent-setup`). The rewrite MUST state that `shll agent-setup` is optional and once per machine (framing unchanged), writes the toolkit agent-context stanza into installed agent harnesses (teaching agents the `shll skill` two-step), and delegates run-kit hook installation to `run-kit agent-setup` (now hooks-only) which is what lights up live agent state (**active** / **waiting** / **idle**) in run-kit's dashboard. It MUST keep the pointer to the run-kit install guide for the dashboard/hooks details. It MUST NOT carry over run-kit-specific claims (settings diff, idempotent re-run, `--uninstall`) onto `shll agent-setup` unless the refreshed `help/shll.json` confirms them; when in doubt, say less and link out. Residual `run-kit agent-setup` mentions are permitted because `help/run-kit.json` carries `agent-setup`.

- **GIVEN** the current paragraph attributes run-kit hook mechanics and `--uninstall` to `run-kit agent-setup`
- **WHEN** the paragraph is rewritten for the graduated `shll agent-setup`
- **THEN** the prose asserts only the agent-context-stanza + delegation behavior the backlog design context states, keeps the run-kit install-guide link, and carries no unverified run-kit-specific claims on `shll agent-setup`
- **AND** the paragraph stays a single explanatory paragraph in the `## Optional: run-kit agent state` section

#### R4: Execution-time re-grep confirms scope; any newer site-authored occurrence is covered
Apply MUST re-run `grep -rn "run-kit agent-setup" sites/ | grep -v node_modules` and cover every site-authored occurrence it reports. Repo-root `content/**`, repo-root `help/**`, and `fab/changes/**` MUST NOT be touched. The other site variant (`astro-tailwind-terminal1`) has zero occurrences and needs no edit.

- **GIVEN** the backlog's "only one occurrence" claim is stale (the intake found three)
- **WHEN** the re-grep runs at apply time
- **THEN** every site-authored `run-kit agent-setup` occurrence surfaced is either edited (R1–R3) or, if it is a legitimate residual mention (e.g. an accurate reference to `run-kit agent-setup` as the delegated hooks-only command), consciously retained as vn39-valid
- **AND** no file under repo-root `content/**`, `help/**`, or `fab/changes/**` is modified

### Non-Goals

- Satisfying the merge gate — `help/shll.json` carrying `agent-setup` is a ship-time blocker, not an apply blocker. Apply/review complete on the branch; the PR merge is held (out of this change's execution scope).
- Editing pulled canonical slices (`content/shll/README.md`, `content/run-kit/**`) — they self-heal via the daily `refresh-help.yml` / `refresh-readme.yml` pulls once the tool repos' READMEs update.
- Editing the `astro-tailwind-terminal1` variant — it has zero occurrences.
- Any build/config/schema/page-structure change — this is static content only.

### Design Decisions

1. **Semantic rewrite for `install.md:52`, mechanical swap for the two command lines**: The two command-block lines are literal install steps a user copies, so the token swap + alignment is exactly right; the paragraph is prose *describing* the command, so a token swap would produce false claims — *Why*: the graduated command's behavior genuinely differs (agent-context stanza + delegation, not run-kit's own hook mechanics/`--uninstall`) — *Rejected*: pure token swap on line 52 (would attribute run-kit-only behavior to `shll agent-setup`).
2. **Retain residual `run-kit agent-setup` mentions where accurate**: The line-52 rewrite still names `run-kit agent-setup` as the delegated hooks-only command and links the run-kit install guide — *Why*: `help/run-kit.json` carries `agent-setup`, so these mentions are vn39-valid and describe real delegated behavior — *Rejected*: scrubbing all `run-kit agent-setup` mentions (would lose accurate delegation detail and the dashboard/hooks pointer).

## Tasks

### Phase 2: Core Implementation

- [x] T001 Re-grep `sites/` for `run-kit agent-setup` (`grep -rn "run-kit agent-setup" sites/ | grep -v node_modules`); enumerate every site-authored occurrence and confirm scope against R1–R3 before editing <!-- R4 -->
- [x] T002 In `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro`, swap the `followOn` line to `'shll agent-setup      # optional, once per machine',` preserving the shared comment column (6 spaces before `#`) <!-- R1 -->
- [x] T003 [P] In `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md` line 16, swap `run-kit agent-setup` → `shll agent-setup` (24 spaces to the shared comment column) and update the trailing comment to a short one-line hint covering agent context + run-kit dashboard state <!-- R2 -->
- [x] T004 In `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md` line 52, rewrite the explanatory paragraph to describe `shll agent-setup` (agent-context stanza + delegation to hooks-only `run-kit agent-setup`), keep the run-kit install-guide link, carry no unverified run-kit-specific claims on `shll agent-setup` <!-- R3 -->

### Phase 3: Integration & Edge Cases

- [x] T005 Re-grep `sites/` again to verify no site-authored `run-kit agent-setup` remains except intended residual delegation mentions; confirm the `#` comment columns still align in both edited blocks; confirm no repo-root `content/**`, `help/**`, or `fab/changes/**` file was touched <!-- R4 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `InstallOneLiner.astro`'s `followOn` block reads `shll agent-setup      # optional, once per machine` with the `#` aligned to the surrounding lines' comment column
- [x] A-002 R2: `install.md` line 16 reads `shll agent-setup` with its `#` at the block's shared comment column and a short updated one-line comment covering agent context + run-kit dashboard state
- [x] A-003 R3: `install.md` line ~52's paragraph accurately describes `shll agent-setup` (agent-context stanza + delegation to hooks-only `run-kit agent-setup`) and keeps the run-kit install-guide link
- [x] A-004 R4: An execution-time re-grep of `sites/` was run and every site-authored occurrence is accounted for (edited or intentionally retained)

### Behavioral Correctness

- [x] A-005 R1: The comment-column alignment in the `InstallOneLiner` follow-on block is preserved (all three `#` at the same column) — the swap widened the gap from 3 to 6 spaces, not misaligned
- [x] A-006 R2: The comment-column alignment in the `install.md` install block is preserved (all three `#` at the same column)
- [x] A-007 R3: The line-52 rewrite carries no run-kit-specific claims (settings diff, idempotent re-run, `--uninstall`) attributed to `shll agent-setup`; residual `run-kit agent-setup` mentions remain vn39-valid (present in `help/run-kit.json`)

### Scenario Coverage

- [x] A-008 R4: Repo-root `content/**`, repo-root `help/**`, and `fab/changes/**` (outside this change's own folder) are untouched; the `astro-tailwind-terminal1` variant is unchanged (zero occurrences)

### Code Quality

- [x] A-009 Pattern consistency: The edited command blocks keep the existing column-aligned comment style; the rewritten paragraph matches the surrounding prose voice and link conventions
- [x] A-010 No unnecessary duplication: The swap uses the single-source `InstallOneLiner` component (one edit fans out to homepage + 7 overviews); no new hand-copied install blocks were introduced

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- Merge gate (ship-time, not apply): the PR MUST NOT merge until `help/shll.json` carries **both** `agent-setup` and `skill` (`grep -c '"name": "agent-setup"' help/shll.json` ≥ 1 AND `grep -c '"name": "skill"' help/shll.json` ≥ 1 on the target branch's main) — the rewritten line-52 prose names both tokens. At merge time also validate the "(v1: Claude Code)" and "(now hooks-only)" claims against the refreshed help text (review finding, 2026-07-18). Verified not-yet-green at intake time.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | R1/R2 command-line swaps use the backlog's exact replacement string and preserve the shared comment column (widening the pre-comment gap to keep `#` aligned) | Backlog specifies the literal line and the alignment rule verbatim; measured columns (index 26 in the component, index 41 in install.md) confirm the spacing | S:95 R:90 A:95 D:95 |
| 2 | Confident | R2 trailing comment reworded to "agent context + run-kit dashboard state" (the intake's suggested wording) — a short one-line hint | Intake flags the old comment as describing only the delegated half; exact wording is an explicit apply-time choice, trivially reversible, low stakes | S:60 R:85 A:70 D:60 |
| 3 | Confident | R3 paragraph rewritten from the backlog's design context with minimal claims (agent-context stanza + delegation), dropping run-kit-only mechanics/`--uninstall` from `shll agent-setup`, keeping residual accurate `run-kit agent-setup` delegation mentions + the install-guide link | Intake mandates the semantic rewrite and claims discipline; `help/run-kit.json` carries `agent-setup` so residual mentions stay vn39-valid; wording easily revised at merge-time validation against refreshed `help/shll.json` | S:75 R:80 A:70 D:65 |
| 4 | Certain | Scope is exactly the three site-authored occurrences the re-grep confirms (component:96, install.md:16, install.md:52); pulled/puller-owned/history trees untouched | Execution-time re-grep returned the same three occurrences the intake found — no newer ones; content/**, help/**, fab/changes/** are explicitly out of scope | S:90 R:85 A:90 D:90 |

4 assumptions (2 certain, 2 confident, 0 tentative).
