# Plan: Fix drift-checker false positives (README/docs-site vs help-dump)

**Change**: 260718-715p-fix-drift-checker-false-positives
**Intake**: `intake.md`

## Requirements

All requirements target the single machine anchor
`sites/astro-starlight-terminal1/src/lib/extract-readme.ts` (the module both CLIs
and the unit test single-source), its test file
`sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs`, and the spec
`docs/specs/readme-extraction-contract.md`. No rendering path, CLI, or workflow
changes. The detectors stay pure, total, and dependency-free (Constitution I/VI).

### Drift checker: code-span masking in the link/image lints

#### R1: Link/image lints skip inline code spans and fenced code blocks
`findClosureViolations` and `findReadmeLinkViolations` SHALL NOT report a
link/image target that appears inside a markdown inline code span (`` `…` ``) or a
fenced code block (```` ``` ````/`~~~`), so an illustrative `` `![alt](…)` `` syntax
example in prose is not treated as a real image. Code-span/fence detection SHALL
reuse the existing CommonMark fence discipline (`openFence`/`isClosingFence`) so
all scanners agree on where code is. A single shared masking helper SHALL back both
detectors so the two stay in lockstep.

- **GIVEN** a docs/site page whose prose contains a backtick-wrapped inline code
  span `` `![alt](…)` `` (shll's `docs/site/standards/readme-extraction.md`)
- **WHEN** `findClosureViolations(relPath, markdown)` runs
- **THEN** no `relative-image` violation is reported for the masked target `…`
- **AND** a genuine prose relative image `![diagram](./arch.png)` (outside any code
  span/fence) STILL reports a `relative-image` violation
- **AND GIVEN** a README slice whose prose contains a backtick-wrapped
  `` `[x](docs/specs/y.md)` `` example; **WHEN** `findReadmeLinkViolations(slice)`
  runs; **THEN** no `relative-link` violation is reported, while an unmasked prose
  `[x](docs/specs/y.md)` STILL reports one.
- **AND GIVEN** a fenced ```` ``` ````-block containing `![alt](./rel.png)`; **WHEN**
  either detector runs; **THEN** no violation is reported for the fenced target.

### Drift checker: flag-scan stops in findUnknownTokens

#### R2: Flag scan stops at a bare `--` end-of-options separator
In `findUnknownTokens`, the statement-wide `FLAG_TOKEN_RE` scan SHALL stop at the
first whitespace-delimited bare `--` token (POSIX end-of-options), so a flag passed
through to a foreign program after `--` is not attributed to the tool.

- **GIVEN** run-kit's README example `` run-kit riff -- --worktree-name pacing-canyon ``
- **WHEN** `findUnknownTokens(slice, doc)` runs
- **THEN** `--worktree-name` is NOT reported (it follows the bare `--` separator)
- **AND GIVEN** a statement with a real fabricated flag BEFORE the `--`
  (`run-kit riff --bogus -- --passthrough`); **WHEN** the scan runs; **THEN**
  `--bogus` IS still reported and `--passthrough` is not.

#### R3: Flag scan stops at an angle-bracket `<placeholder>` token
In `findUnknownTokens`, the flag scan SHALL also stop at the first token matching
`/^<[^>]*>$/` (an angle-bracket placeholder), because the statement's remainder
after a `<placeholder>` is example-shaped and — for launcher tools — typically a
foreign command whose flags belong to another program. A `[optional]`-style
bracket placeholder SHALL NOT stop the scan (real tool flags after optional
positionals keep being checked).

- **GIVEN** hop's passthrough example `` hop <name> git push --force ``
- **WHEN** `findUnknownTokens(slice, doc)` runs
- **THEN** `--force` is NOT reported (it follows the `<name>` placeholder)
- **AND GIVEN** `hop rm --force` (no placeholder before the flag); **WHEN** the scan
  runs; **THEN** `--force` IS reported (fabricated flag on a real command)
- **AND GIVEN** `wt create [branch] --base main` (a `[optional]` placeholder before
  the flag); **WHEN** the scan runs; **THEN** the `--base` flag is still checked
  (the `[optional]` bracket does not stop the scan).

### Drift checker: valid-token seeding in helpFacts

#### R4: Cobra `completion` and `help` are universally-valid root children
In `helpFacts`, `completion` and `help` SHALL be seeded as valid direct children
of the root node (mirroring the existing universal-flag seed
`['--help','-h','--version','-v']`), because help-dump excludes them by contract
(§4) so they never appear in `help/<tool>.json`. They SHALL be registered as leaf
children only (no grandchildren registered), so a `completion <shell>` /
`help <subcommand>` tail is treated as positional args and never flags. The seed is
universal across tools and harmless where a tool has no dump.

- **GIVEN** a README documenting `run-kit completion`, `run-kit help riff`, and
  `fab completion bash`
- **WHEN** `findUnknownTokens(slice, doc)` runs
- **THEN** none of `run-kit completion`, `run-kit help`, `fab completion` are
  reported, and the positional tails (`riff`, `bash`) are not reported either.

#### R5: A per-tool allowlist covers tokens real-but-undumped (hidden nodes/flags, sibling binary)
`extract-readme.ts` SHALL carry one narrow, checker-only constant `UNDUMPED_TOKENS`
keyed by the dump's root path (the binary name), declaring per-binary
`rootCommands?: string[]` and `flags?: string[]`. `helpFacts` SHALL merge the
matching entry's `rootCommands` into the root's children set (leaf semantics, same
as R4) and its `flags` into the flag set — with NO change to the
`findUnknownTokens(slice, doc)` signature. The constant SHALL enumerate the
`fab` binary's FULL visible command set (`init`, `sync`, `doctor`, `upgrade-repo`,
`update`, `migrations-status`) and hop's hidden `--shim-plan` flag. These tokens are
NEVER rendered — the allowlist is checker-only.

- **GIVEN** fab-kit's README documenting `fab init`, `fab sync`, `fab doctor`,
  `fab upgrade-repo` (workspace commands on the `fab-kit` sibling binary, absent
  from `help/fab-kit.json` which dumps only `fab`)
- **WHEN** `findUnknownTokens(slice, doc)` runs
- **THEN** none of those `fab <cmd>` tokens are reported
- **AND** a genuinely fabricated `fab frobnicate` IS still reported
- **AND GIVEN** hop's README documenting the hidden flag `--shim-plan`; **WHEN** the
  scan runs; **THEN** `--shim-plan` is NOT reported.

### Spec reconciliation

#### R6: The spec is reconciled to the new code behavior
`docs/specs/readme-extraction-contract.md` SHALL be reconciled to the code: §7
(divergence-reporter mechanics) gains the two flag-scan stops (`--`,
`<placeholder>`), the universal `completion`/`help` seed, and the
`UNDUMPED_TOKENS` allowlist; the §closure-lint prose (and §8's README-slice link
lint description) gains code-span/fence masking. `docs/specs/help-dump-contract.md`
SHALL NOT be touched (no dump-side change). The spec header declares
`extract-readme.ts` authoritative; this is the mandated reconciliation direction.

- **GIVEN** the implemented checker fixes
- **WHEN** the spec is read for the gate mechanics and the closure/README-slice lint
- **THEN** §7 documents the two flag-scan stops, the `completion`/`help` seed, and
  the `UNDUMPED_TOKENS` allowlist; §closure-lint (+ §8 README-slice link lint)
  documents code-span/fence masking; the prose agrees with the code and cites no
  behavior the code does not implement.

### Non-Goals

- **No rewriter changes** — `rewriteLinkTargets` keeps its documented no-fence-tracking
  over-reach (rendering behavior frozen); only the two *detectors* mask code.
- **No help-dump contract or producer-repo changes** — `help-dump-contract.md`
  untouched; no `fab-kit help-dump` dependency; no cross-repo edits.
- **No CLI / workflow / rendering-path edits** — `extract-readme-cli.mjs`,
  `extract-docs-site-cli.mjs`, `refresh-readme.yml`, and every render component
  single-source the module and are unchanged; blast radius is CI `::warning::`
  volume only.
- **No prose-level NLP** — the checker does not interpret "documents absence"
  sentences; the standalone-inline-span skip (first token ≠ binary) already covers them.
- **Remaining warning classes stay warned** — hop launcher positionals
  (`hop default|dotfiles|…`), wt cobra aliases (`wt ls|new|rm`), shll legacy/historical/
  fenced-artifact mentions (`--trust-tap`, `shll shell-install`, `shll OK`, `shll the`),
  and `run-kit url` (genuine drift). Each is a distinct class out of this scope.

### Design Decisions

1. **Code-span masking in the detectors, not the rewriter**: mask fenced blocks +
   inline code spans in `findClosureViolations`/`findReadmeLinkViolations` via a
   shared helper reusing `openFence`/`isClosingFence`. — *Why*: the two link lints
   have the identical bug shape; a shared helper keeps them in lockstep and reuses
   the proven fence discipline. — *Rejected*: touching `rewriteLinkTargets` (its
   over-reach is documented-as-accepted and rendering is frozen — Non-Goal); a new
   regex-only inline-code strip (would drift from the fence rule the other scanners use).
2. **Angle-only placeholder stop for R3**: stop the flag scan at `<placeholder>`
   only, not `[optional]`. — *Why*: verified the real `--force` source is the
   passthrough example `hop <name> git push --force`, and angle-only avoids
   suppressing real-flag checks after `[branch]`-style optionals. — *Rejected*:
   stopping at all bracket placeholders (would suppress real flags after optionals,
   e.g. `wt create [branch] --base`); prose NLP on the "No `--force`" sentence
   (already handled by the first-token≠binary skip).
3. **Site-side checker-only allowlist for R5, not merged dumps**: `UNDUMPED_TOKENS`
   keyed by dump root path. — *Why*: merging both fab-kit binaries' dumps is upstream
   blocked (`fab-kit help-dump` fails on the installed binary) and would change
   rendered surfaces (commands page, tool cards, `/llms.txt`); a checker-only const
   keeps the API stable and the blast radius CI-warning-only. — *Rejected*: merged
   dumps (blocked + larger blast radius); a generic hidden-node/flag detector
   (hiddenness is not representable in `help/<tool>.json`, so it is undetectable
   site-side).

## Tasks

### Phase 1: Core checker fixes (extract-readme.ts)

- [x] T001 Add a shared code-mask helper to `sites/astro-starlight-terminal1/src/lib/extract-readme.ts`: a pure function that, given markdown, returns the same text with fenced-code-block content and inline `` `code` `` spans replaced by same-length blanks (preserving line structure), reusing `openFence`/`isClosingFence`. Wire it into `findClosureViolations` and `findReadmeLinkViolations` (scan the masked text) so masked link/image targets are not reported. <!-- R1 -->
- [x] T002 In `findUnknownTokens` (extract-readme.ts), truncate the per-statement flag scan at the first whitespace-delimited bare `--` token before running `FLAG_TOKEN_RE`, so post-separator flags are not attributed to the tool. <!-- R2 -->
- [x] T003 In `findUnknownTokens` (extract-readme.ts), also truncate the flag scan at the first token matching `/^<[^>]*>$/` (angle-bracket placeholder), alongside the `--` stop from T002; `[optional]`-style placeholders do NOT stop the scan. <!-- R3 -->
- [x] T004 In `helpFacts` (extract-readme.ts), seed `completion` and `help` as valid leaf children of the root node (mirroring the universal-flag seed), registering no grandchildren so their tails are positional args. <!-- R4 -->
- [x] T005 Add the `UNDUMPED_TOKENS` constant (keyed by dump root path; `{ rootCommands?, flags? }` per binary) to extract-readme.ts with `fab: { rootCommands: ['init','sync','doctor','upgrade-repo','update','migrations-status'] }` and `hop: { flags: ['--shim-plan'] }`, and merge the matching entry into the root's children set + the flag set inside `helpFacts`. Keep `findUnknownTokens`'s signature unchanged. <!-- R5 -->

### Phase 2: Tests (extract-readme.test.mjs)

- [x] T006 Add test cases to `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` pinning each fix: (a) inline-code `` `![alt](…)` `` and a fenced-block relative image produce no violation in BOTH `findClosureViolations` and `findReadmeLinkViolations`, while a real prose relative image/link still does; (b) `run-kit riff -- --worktree-name` not attributed, a fabricated flag before `--` still flagged; (c) `completion`/`help` + subcommand tails pass; (d) `fab init`/`fab sync`/etc. pass under the allowlist while a fabricated `fab frobnicate` still flags, and hop `--shim-plan` passes; (e) `hop <name> git push --force` passes while `hop rm --force` still flags and `wt create [branch] --base main` still checks `--base`. <!-- R1 R2 R3 R4 R5 -->

### Phase 3: Spec reconciliation

- [x] T007 Reconcile `docs/specs/readme-extraction-contract.md`: update §7 (divergence-reporter mechanics) to document the two flag-scan stops (`--`, `<placeholder>`), the `completion`/`help` seed, and the `UNDUMPED_TOKENS` allowlist; update the §closure-lint prose and §8's README-slice link-lint description to document code-span/fence masking; update §Extraction reference if its function-behavior summary needs it. Do NOT touch `help-dump-contract.md`. <!-- R6 --> <!-- rework cycle 1 RESOLVED: §7.1.3 now documents the ≥1-real-subcommand gate (leaf-root dumps like tu with commands:[] are correctly excluded) and its GIVEN/WHEN/THEN + the changelog row corrected — the false "every tool's root / harmless where a tool has no dump" claim removed. Also (should-fix) reworded the extract-readme.ts module header from "vn39 validation gate / workflow fails the pull" to the report-only divergence reporter (change 4s3e). -->

## Execution Order

- T001–T005 are all in `extract-readme.ts` and are independent edits to different
  functions/regions; do them in one focused pass, then T006 (tests) which exercises
  all of them, then T007 (spec). T006 depends on T001–T005; T007 is documentation
  and can follow the code.

## Acceptance

### Functional Completeness

- [ ] A-001 R1: `findClosureViolations` and `findReadmeLinkViolations` skip link/image targets inside inline code spans and fenced code blocks, via one shared masking helper reusing `openFence`/`isClosingFence`.
- [ ] A-002 R2: `findUnknownTokens`'s flag scan stops at the first bare `--` token, so post-separator flags are not attributed to the tool.
- [ ] A-003 R3: `findUnknownTokens`'s flag scan stops at the first `<placeholder>` token; `[optional]` placeholders do not stop it.
- [ ] A-004 R4: `helpFacts` seeds `completion`/`help` as leaf root children; their subcommand/positional tails are not flagged, universally across tools.
- [ ] A-005 R5: `UNDUMPED_TOKENS` (keyed by dump root path) exists with the fab full command set + hop `--shim-plan`; `helpFacts` merges it; `findUnknownTokens`'s signature is unchanged.
- [ ] A-006 R6: `readme-extraction-contract.md` §7 and the §closure-lint (+ §8 README-slice link-lint) prose match the new code; `help-dump-contract.md` is untouched.

### Behavioral Correctness

- [ ] A-007 R1: A genuine prose relative image and a genuine prose relative link (outside any code span/fence) are STILL reported by their respective detectors.
- [ ] A-008 R2: A fabricated flag appearing BEFORE the bare `--` is STILL reported.
- [ ] A-009 R3: `hop rm --force` (no placeholder) STILL reports `--force`; `wt create [branch] --base main` still checks `--base`.
- [ ] A-010 R5: A genuinely fabricated `fab frobnicate` is STILL reported despite the allowlist.

### Scenario Coverage

- [ ] A-011 R1 R2 R3 R4 R5: `node --test scripts/extract-readme.test.mjs` passes (all pre-existing 64 cases plus the new ones), run from `sites/astro-starlight-terminal1/`.
- [ ] A-012 R1 R2 R3 R4 R5: The intake's "Expected post-fix warning state" is confirmed end-to-end — running `extract-readme-cli.mjs` per slug and `extract-docs-site-cli.mjs` (via a temp copy of the committed tree) yields: idea/tu clean; fab-kit clean; run-kit `run-kit url` only; hop `hop default|dotfiles|infra-tf|loom|web|webapp|work` only; wt `wt ls|new|rm` only; shll `--trust-tap`/`shll shell-install`/`shll OK`/`shll the` only; shll docs/site clean. And `git status --porcelain content/` stays empty.

### Edge Cases & Error Handling

- [ ] A-013 R1: The masking helper preserves line structure and a fenced block whose longer outer fence contains a shorter inner fence is masked as one block (CommonMark), matching the existing fence-length discipline.
- [ ] A-014 R1 R2 R3 R4 R5 R6: All detectors remain pure, total (never throw on arbitrary input), and dependency-free (no new npm import — Constitution VI).

### Code Quality

- [ ] A-015 Pattern consistency: New code follows the module's existing patterns — named constants (no magic strings), the shared-helper/single-source discipline (`openFence`/`isClosingFence`, `record`-shape scanning), and the pure/total/build-time contract.
- [ ] A-016 No unnecessary duplication: The code-mask logic is a single shared helper consumed by both detectors (not duplicated); the `--`/`<placeholder>` stops and the `completion`/`help`/`UNDUMPED_TOKENS` seeds reuse existing structures rather than adding parallel machinery.
- [ ] A-017 Composition over inheritance / readability: Fixes are small focused additions to existing functions; no function grows into a god function (>50 lines without clear reason).

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Assumptions

<!-- Graded decisions made while co-generating Requirements from the intake. The
     intake enumerated the scope precisely and pre-graded all nine decisions
     (0 tentative, 0 unresolved); these rows carry that grounding forward at the
     plan level. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | R2: stop the flag scan at the first bare `--` token | User-specified exactly; POSIX end-of-options semantics; reproduced on run-kit line 105 at intake | S:95 R:90 A:95 D:95 |
| 2 | Confident | R1 masks BOTH inline code spans AND fenced blocks, in BOTH detectors, via one shared helper; rewriter untouched | User named inline spans + `findClosureViolations`; fenced blocks and the README lint share the identical bug shape — masking one but not the other leaves the class half-fixed; a shared helper is the single-source discipline the module already uses | S:70 R:85 A:85 D:65 |
| 3 | Certain | R4: seed `completion`+`help` as universal leaf children of the root in `helpFacts` | User specified "same way they're excluded from help-dump generation" (contract §4 names exactly these); mirrors the existing universal-flag seed | S:90 R:85 A:90 D:85 |
| 4 | Confident | R5 via a site-side checker-only allowlist, NOT merged dumps | User's "or otherwise" branch; merge verified blocked (`fab-kit help-dump` fails on installed binary) and would change rendered surfaces (commands page, tool cards, llms.txt) | S:80 R:80 A:85 D:60 |
| 5 | Confident | The allowlist carries the fab binary's FULL visible command set (incl. `update`, `migrations-status`), keyed by dump root path (no `findUnknownTokens` signature change) | A partial list resurfaces the bug on the next README edit; full set read off `fab-kit --help`; root-path keying keeps the API stable | S:60 R:85 A:85 D:70 |
| 6 | Confident | `--shim-plan` via an explicit per-tool hidden-flag allowlist entry — no generic hidden-flag mechanism | Hiddenness is not representable in the dump (contract §2/§4 strips it), so generic detection is impossible site-side; explicit entry is the narrow guard the user asked for | S:70 R:85 A:85 D:70 |
| 7 | Confident | R3: stop the flag scan at an angle-bracket `<placeholder>` token (angle-only; `[optional]` does not stop) | Verified the real `--force` mechanism is the passthrough example `hop <name> git push --force`, NOT the prose-absence line; angle-only avoids suppressing real-flag checks after `[branch]`-style optionals; accepted false-negative documented in the intake | S:70 R:85 A:75 D:55 |
| 8 | Certain | Remaining warning classes (hop launcher positionals, wt aliases, shll legacy/historical/fenced artifacts, `run-kit url`) stay warned — out of scope | User's six-item list treated as exhaustive; each remaining class is structurally different and trivially addressable later | S:80 R:95 A:85 D:80 |
| 9 | Certain | R6: reconcile `readme-extraction-contract.md` §7 + §closure-lint (+ §8 README-slice link-lint); `help-dump-contract.md` untouched | The spec header declares `extract-readme.ts` authoritative and mandates reconciling spec to code; no dump-side behavior changes | S:75 R:90 A:90 D:85 |

9 assumptions (4 certain, 5 confident, 0 tentative).
