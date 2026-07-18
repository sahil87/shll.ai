# Intake: Fix drift-checker false positives (README/docs-site vs help-dump)

**Change**: 260718-715p-fix-drift-checker-false-positives
**Created**: 2026-07-18

## Origin

One-shot `/fab-new` invocation with a detailed six-item bug list (no prior conversation). User's raw input:

> Fix 4 bugs in the README-vs-help-dump drift checker (findClosureViolations / findUnknownTokens in sites/astro-starlight-terminal1/src/lib/extract-readme.ts, per repo help-refresh workflow): (1) the relative-image check false-positives on illustrative inline-code spans like backtick-wrapped `![alt](...)` syntax examples in prose — skip matches inside inline code spans; (2) the unknown-token flag scanner treats flags appearing after a shell '--' separator (e.g. run-kit's README example 'run-kit riff -- --worktree-name ...') as if they belong to the tool being checked — stop flag-scanning a shell statement at a bare '--' token; (3) cobra's auto-generated 'completion' and 'help' subcommands should be excluded from the unknown-token check the same way they're excluded from help-dump generation; (4) fab-kit ships two binaries (fab-kit for init/sync/doctor/upgrade-repo, fab for pipeline commands) but help/fab-kit.json is only sourced from the 'fab' binary's dump — merge both binaries' command trees into help/fab-kit.json, or otherwise stop flagging fab-kit's own binary's commands as unknown. Also two false positives worth guarding narrowly if low-risk: hop's --shim-plan is a deliberately hidden flag (exclude hidden flags from the check), and hop's README documents --force's ABSENCE in prose ('No --force on...') which the flag-regex misreads as usage.

**Intake-time grounding** (all six items reproduced against the committed `content/` + `help/` state on 2026-07-18):

- Running `extract-readme-cli.mjs` per tool currently warns: **hop** (`--force`, `--shim-plan`, `hop default|dotfiles|infra-tf|loom|web|webapp|work`), **fab-kit** (`fab completion|doctor|init|sync|upgrade-repo`), **wt** (`wt ls|new|rm`), **run-kit** (`--worktree-name`, `run-kit completion|help|url`), **shll** (`--trust-tap`, `shll OK`, `shll shell-install`, `shll the`). idea and tu are clean.
- Running `extract-docs-site-cli.mjs` per tool currently warns once: **shll** `docs/site/standards/readme-extraction.md → …: relative image` — the backtick-wrapped `` `![alt](…)` `` inline-code span in prose (item 1's concrete instance).
- **One mechanism correction vs. the user's framing**: the hop `--force` false positive does NOT come from the prose-absence sentence. Verified with a direct `findUnknownTokens` call: `` No `--force` on the `push` / `sync` batch verbs. `` produces `[]` (the standalone inline span's first token `--force` ≠ binary `hop`, so it is skipped). The actual source is the **passthrough example** later in the same bullet: `` `hop <name> git push --force` `` — the statement starts with `hop`, so the statement-wide flag regex picks up git's `--force`. The fix designed below targets that mechanism.
- `fab init --help` on the local brew install works and prints `Usage: fab-kit init` — the `fab` binary carries fab-kit's workspace commands as **hidden** cobra nodes, which help-dump excludes by contract (§4 noise filtering). `fab-kit help-dump` **fails** (exits non-zero, no output) on the installed binary, so the "merge both dumps" option is upstream-blocked today.

## Why

1. **The pain point**: the vn39 divergence reporter (constitution § Tool-Page Depth: report-only for pulled README prose) and the §9 closure lint are drowning in false positives. 5 of 7 tools warn on every daily `refresh-readme.yml` run; of the ~18 warned tokens, at least 11 are false positives caused by four checker bugs plus two known-hidden upstream facts. A reporter that is mostly wrong trains the reader to ignore it.
2. **If not fixed**: real drift (e.g. `run-kit url`, which is genuinely absent from the shipped binary's dump) is invisible among the noise, and the fix-the-tool-README feedback loop the report-only design depends on never happens.
3. **Why this approach**: all fixes land site-side in the single machine anchor `src/lib/extract-readme.ts` (the module both CLIs and the unit test single-source), keeping the detectors conservative-but-quieter. No help-dump contract or producer-repo changes: the alternative for item 4 (merging both fab-kit binaries' dumps into `help/fab-kit.json`) is blocked upstream (`fab-kit help-dump` fails on the installed binary) and would also change rendered surfaces (`help/fab-kit.json` feeds the commands page, the homepage tool cards, and `/llms.txt`) — far larger blast radius than a checker-only guard.

## What Changes

All edits in `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` (+ its test file + the spec it anchors). No behavior change to any rendering path.

### 1. Link/image detectors skip code spans (bug 1)

`findClosureViolations` and `findReadmeLinkViolations` currently regex-scan the raw markdown (`MD_LINK_RE`, `HTML_ATTR_RE`, `HTML_SRCSET_RE`) with no code tracking, so an illustrative `` `![alt](…)` `` inside an inline code span (or a fenced block) is treated as a real image. Reproduced: shll's `docs/site/standards/readme-extraction.md` line 17 warns `relative-image` for target `…` today.

- Before scanning, **mask fenced code blocks and inline code spans** (replace their content with same-length whitespace or split-and-skip), reusing the existing `openFence`/`isClosingFence` CommonMark fence discipline already used by `codeSpans`. Both detectors get the masking; extract a small shared helper so the two stay in lockstep (they already share `record`-shape scanning).
- **The rewriter (`rewriteLinkTargets`) is deliberately NOT changed.** Its no-fence-tracking over-reach is documented in-code as accepted (a code sample's relative link rewrites to the same resolved path). Known consequence, out of scope: the rendered shll standards page shows `![alt](/shll/standards/…)` inside that code span — a pre-existing display wart this change does not touch.

### 2. Flag scan stops at a bare `--` token (bug 2)

In `findUnknownTokens`, the statement-wide `FLAG_TOKEN_RE` scan attributes post-separator flags to the tool. Reproduced: run-kit README line 105 `` run-kit riff -- --worktree-name pacing-canyon `` warns `--worktree-name` (a `wt create` flag passed through verbatim).

- Truncate the scanned statement at the first **whitespace-delimited bare `--` token** (POSIX end-of-options) before running `FLAG_TOKEN_RE`. The command-path walk already stops there (`t.startsWith('-')` → break); only the flag scan needs the stop.

### 3. Cobra's auto-generated `completion`/`help` are always-valid (bug 3)

help-dump excludes `completion`, `help`, and `Hidden` nodes from every dump (help-dump-contract §4), so READMEs documenting them warn. Reproduced: `run-kit completion`, `run-kit help` (README command table lines 253–254), and `fab completion` (line 74).

- In `helpFacts`, seed `completion` and `help` as **valid children of the root node**, mirroring the existing universal-flag seeding (`['--help', '-h', '--version', '-v']`). Do **not** register children for them: the walk then treats them as leaves, so `fab completion <shell>` / `run-kit help riff` tails are positional args and never flag. Universal across tools (harmless for tu, which has no dump).

### 4. Known-undumped token allowlist: fab-kit's sibling binary + hop's hidden flag (bugs 4 + 5)

Both are the same class: **tokens real on the tool but deliberately absent from its dump** (hidden cobra nodes / hidden flags — hiddenness is not representable in `help/<tool>.json`, so the checker cannot infer it). Add one narrow, checker-only constant, keyed by the dump's root path so `findUnknownTokens(slice, doc)` keeps its signature:

```ts
/** Tokens that are REAL on the tool but deliberately absent from its help dump
 *  (hidden cobra nodes, hidden flags, sibling-binary commands). Checker-only —
 *  never rendered. Keyed by the dump's root path (the binary name). */
const UNDUMPED_TOKENS: Record<string, { rootCommands?: string[]; flags?: string[] }> = {
  // fab-kit ships two binaries; help/fab-kit.json dumps only `fab`. The
  // workspace commands live on the `fab-kit` binary and are invocable via
  // hidden aliases on `fab` (verified: `fab init --help` works, printing
  // "Usage: fab-kit init"). Full visible command set of the fab-kit binary:
  fab: { rootCommands: ['init', 'sync', 'doctor', 'upgrade-repo', 'update', 'migrations-status'] },
  // `hop --shim-plan` is a deliberately hidden internal flag documented in
  // hop's README ("an internal call").
  hop: { flags: ['--shim-plan'] },
};
```

- `helpFacts` merges `rootCommands` into the root's children set (leaf semantics, same as fix 3) and `flags` into the flag set.
- Fixes the current fab-kit warnings `fab init|sync|doctor|upgrade-repo` (+ `fab completion` via fix 3) and hop's `--shim-plan`.
- The allowlist enumerates the fab-kit binary's **full** visible command set (`fab-kit --help` today: init, sync, doctor, upgrade-repo, update, migrations-status), not just the four currently warned, so a future README mention of `fab update` doesn't resurface the bug. Drift cost if upstream renames a command: one stale allowlist entry whose worst case is a suppressed warning — acceptable for a report-only surface, and trivially replaced by a merged dump if upstream ever ships `fab-kit help-dump`.

### 5. Flag scan stops at an angle-bracket placeholder token (bug 6, narrow guard)

The hop `--force` warning's real source is the passthrough example `` `hop <name> git push --force` `` (see Origin — the prose-absence line does not flag). After a `<placeholder>` token, the statement's remainder is example-shaped and, for launcher tools like hop, typically a *foreign* command whose flags belong to another program.

- Truncate the flag scan at the first token matching `/^<[^>]*>$/` (angle-bracket placeholder), alongside the `--` stop from fix 2. Angle-only — `[optional]`-style placeholders (e.g. `wt create [branch] --base main`) do NOT stop the scan, so real tool flags after optional positionals keep being checked.
- Accepted false-negative: a real fabricated flag after a `<placeholder>` goes unchecked. For a deliberately conservative, report-only detector, fewer false positives is the right trade.

### 6. Test + spec reconciliation

- `scripts/extract-readme.test.mjs`: add cases pinning each fix — (a) inline-code `` `![alt](…)` `` and a fenced ```` ``` ````-block relative image produce no violation in both detectors, while a real prose relative image still does; (b) `-- --flag` not attributed; (c) `completion`/`help` + subcommand tails pass; (d) `fab init` etc. pass under the allowlist while a genuinely fabricated `fab frobnicate` still flags; (e) `hop --shim-plan` passes; (f) `hop <name> git push --force` passes while `hop rm --force` (no placeholder) still flags.
- `docs/specs/readme-extraction-contract.md`: reconcile §7 (gate mechanics: the two flag-scan stops, the universal `completion`/`help` seed, the `UNDUMPED_TOKENS` allowlist) and the §9 closure-lint description (code-span masking). The spec header declares the code authoritative; this is the mandated reconciliation direction. `docs/specs/help-dump-contract.md` is untouched (no dump-side changes).

### Expected post-fix warning state (acceptance grounding)

Re-running both CLIs against today's committed `content/` + `help/`:

| Tool | Today | After this change |
|------|-------|-------------------|
| idea, tu | clean | clean |
| fab-kit | 5 tokens | **clean** |
| run-kit | 4 tokens | `run-kit url` only (true drift — absent from the shipped binary's dump) |
| hop | 9 tokens | `hop default|dotfiles|infra-tf|loom|web|webapp|work` (launcher positionals — out of scope, see Non-Goals) |
| wt | 3 tokens | `wt ls|new|rm` (cobra aliases not in dump — out of scope) |
| shll | 4 tokens | `--trust-tap` (historical-usage sentence), `shll shell-install` (legacy alias), `shll OK`/`shll the` (fenced-block prose artifacts) — out of scope |
| shll docs/site | 1 relative-image | **clean** |

### Non-Goals

- **No help-dump contract or producer-repo changes** — no cross-repo edits, no schema evolution, no `fab-kit help-dump` dependency.
- **No rewriter changes** — `rewriteLinkTargets`'s documented code-fence over-reach stays (rendering behavior frozen).
- **Remaining warning classes stay warned**: hop's `hop <project> [command…]` launcher positionals (structural: the root has both children and positional args), wt's cobra aliases (`ls`/`new`/`rm` — aliases aren't in dump `commands[]`), shll's legacy-alias/historical-flag mentions, and prose-shaped fenced-block lines (`shll OK`, `shll the`). Each is a distinct class needing its own design; none was in the requested scope.
- **No prose-level NLP** — the checker does not try to understand "documents absence" sentences; the standalone-inline-span skip (first token ≠ binary) already covers them.

## Affected Memory

- `conventions/readme-extraction`: (modify) vn39 reporter mechanics — the two flag-scan stops (`--`, `<placeholder>`), the universal `completion`/`help` seed, the `UNDUMPED_TOKENS` allowlist, README-lint code-span masking
- `conventions/docs-site-tree`: (modify) closure lint (`findClosureViolations`) now masks fenced/inline code before scanning
- `conventions/help-collection`: (modify) minor — the cross-check description gains the undumped-token carve-out (hidden nodes/flags, sibling binary)

## Impact

- **Code**: `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` only (one module; `helpFacts`, `findUnknownTokens`, `findClosureViolations`, `findReadmeLinkViolations`, one new constant + one masking helper).
- **Tests**: `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` (~6 new cases).
- **Spec**: `docs/specs/readme-extraction-contract.md` (§7, §9-lint prose).
- **Consumers unchanged**: `extract-readme-cli.mjs`, `extract-docs-site-cli.mjs`, `refresh-readme.yml` — all single-source the module; zero rendering-path or workflow edits. Blast radius is CI `::warning::` volume only.
- **Verification note for apply**: `extract-docs-site-cli.mjs` CLEARS its dest `content/<slug>/site/` before writing — when smoke-testing locally, copy the committed tree to a scratch dir as the source; never pass `content/<slug>/site` itself (doing so deletes the committed pages from the working tree).

## Open Questions

None — the input enumerated the scope precisely, and every item was reproduced and mechanism-verified at intake.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Fix 2: truncate the flag scan at the first bare `--` token | User-specified exactly; POSIX end-of-options semantics; reproduced on run-kit line 105 | S:95 R:90 A:95 D:95 |
| 2 | Confident | Fix 1 masks BOTH inline code spans and fenced blocks, in BOTH `findClosureViolations` and `findReadmeLinkViolations`; rewriter untouched | User named inline spans + `findClosureViolations`; fenced blocks and the sibling README lint have the identical bug shape — masking one but not the other would leave the class half-fixed | S:70 R:85 A:85 D:65 |
| 3 | Certain | Fix 3: seed `completion`+`help` as universal leaf children of the root in `helpFacts` | User specified "same way they're excluded from help-dump generation" (contract §4 names exactly these); mirrors the existing universal-flag seed | S:90 R:85 A:90 D:85 |
| 4 | Confident | Bug 4 via site-side checker-only allowlist, NOT merged dumps | User's "or otherwise" branch; merge verified blocked (`fab-kit help-dump` fails on installed binary) and would change rendered surfaces (commands page, tool cards, llms.txt) | S:80 R:80 A:85 D:60 |
| 5 | Confident | Allowlist carries the fab-kit binary's FULL visible command set (incl. `update`, `migrations-status`), keyed by dump root path (no `findUnknownTokens` signature change) | Partial list resurfaces the bug on the next README edit; full set read off `fab-kit --help`; root-path keying keeps the API stable | S:60 R:85 A:85 D:70 |
| 6 | Confident | `--shim-plan` via explicit per-tool hidden-flag allowlist entry — no generic hidden-flag mechanism | Hiddenness is not representable in the dump (contract §2/§4 strips it), so generic detection is impossible site-side; explicit entry is the narrow guard the user asked for | S:70 R:85 A:85 D:70 |
| 7 | Confident | Fix for `--force`: stop the flag scan at an angle-bracket `<placeholder>` token (angle-only; `[optional]` does not stop) | Verified the real mechanism is the passthrough example `hop <name> git push --force`, NOT the prose-absence line the user cited; angle-only avoids suppressing real-flag checks after `[branch]`-style optionals; accepted false-negative documented | S:70 R:85 A:75 D:55 |
| 8 | Certain | Remaining warning classes (hop launcher positionals, wt aliases, shll legacy/historical/fenced artifacts, `run-kit url`) stay warned — out of scope | User's six-item list treated as exhaustive; each remaining class is structurally different and trivially addressable later | S:80 R:95 A:85 D:80 |
| 9 | Certain | Spec reconciliation (`readme-extraction-contract.md` §7 + §9-lint) is part of this change; `help-dump-contract.md` untouched | The spec header declares `extract-readme.ts` authoritative and mandates reconciling spec to code; no dump-side behavior changes | S:75 R:90 A:90 D:85 |

9 assumptions (4 certain, 5 confident, 0 tentative, 0 unresolved).
