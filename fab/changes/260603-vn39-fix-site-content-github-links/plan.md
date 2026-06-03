# Plan: Fix site content accuracy + per-tool GitHub affordance

**Change**: 260603-vn39-fix-site-content-github-links
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

## Tasks

### Phase 1: Setup

- [x] T001 Repoint `fab/project/config.yaml` `source_paths` from `sites/astro-tailwind-terminal1/src/` to `sites/astro-starlight-terminal1/src/`; leave `true_impact_exclude` and all other keys untouched.
- [x] T002 Create `sites/astro-starlight-terminal1/src/components/GithubButton.astro` — prop `tool` (string slug), build-time-only anchor to `https://github.com/sahil87/{tool}`, styled with terminal `--c-*` tokens, dark-mode parity via Starlight `data-theme`, visible `:focus-visible` ring, small labeled affordance ("View on GitHub ↗" + `github.com/sahil87/{tool}`). Mirror `CommandReference.astro` conventions (`not-content`, scoped `<style>` with `--c-*` tokens).

### Phase 2: Core Implementation — command/flag accuracy

- [x] T003 [P] `getting-started/install.md`: replace the install block with the canonical 4-line `shll` quick-start (brew install / `shll install` / `shll shell-setup --trust-tap` / `exec $SHELL` as commented last line); replace the `shll doctor` Verify step with `shll version` and reword surrounding prose.
- [x] T004 [P] `tools/shll/overview.md`: replace the `## Install` block (`shll shell-install` + `exec $SHELL`) with the canonical 4-line block; in `## At a glance`, swap the `shll shell-install` line for `shll shell-setup` (the real canonical command). Keep `exec $SHELL` as the commented last visible line in the install block.
- [x] T005 [P] `tools/idea/install.md`: replace `shll doctor` with `shll version` in the "As part of shll" snippet and reword the inline comment to match.
- [x] T006 [P] `workflows/daily-flow.md`: drop `idea list --tag bug` → plain `idea list` (prose may mention `#bug` tag substrings); rewrite `wt create flaky-tz-test --from-idea a7q2` to create the worktree (`wt create flaky-tz-test`) then run `fab change new --slug flaky-tz-test` separately, keeping the flow coherent.
- [x] T007 [P] `workflows/new-change.md`: remove every `--from-idea` occurrence — the headline flow `wt create csv-export --from-idea k3m1`, the "in detail" list item, the init-script default `fab change new --slug … --from-idea k3m1`, the `## Without wt` `fab change new --slug csv-export --from-idea k3m1`, and reword the bottom prose ("`fab change new` without `--from-idea` …") to drop the non-existent flag while staying truthful. <!-- rework: review cycle 1 (fix-code) — the "in detail" init line had replaced `--from-idea` with `fab sync`, itself a non-existent command (help/fab-kit.json has only `fab hook sync`). Reworded to describe the per-worktree init script generically without naming a fabricated command (new-change.md:33). Same `fab sync` claim fixed in the T012-converted tools/wt/overview.mdx:31 (was pre-existing, carried through the rename). -->
- [x] T009b [P] `index.mdx`: align the homepage `shll version` mock — `run-kit` version `v0.3.0` → `v2.2.1` (the value in `help/run-kit.json`); the other 6 tools already matched their help docs. <!-- rework: review cycle 1 (should-fix) — stale version is inconsistent with the change's single-source-of-truth thesis and trivially aligned. tu stays illustrative (no help/tu.json). -->
- [x] T008 [P] `tools/idea/workflows.md`: drop `--from-idea` from `fab change new --slug auth-middleware-jwt --from-idea qu1d` and change `idea list --tag bug` → plain `idea list`.

### Phase 3: Core Implementation — homepage mock + Discord + GitHub affordance

- [x] T009 `index.mdx`: replace the fabricated `$ shll list` block in the terminal mock with a real-command depiction — `$ shll install` output followed by `$ shll version` output listing installed tools + versions, preserving the per-tool `github.com/sahil87/<tool>` links on the version lines. Keep the `shell-line`/`shell-prompt`/`shell-dim`/`shell-cursor` markup style. The hero "Install everything" action already points to `/getting-started/install/`.
- [x] T010 `index.mdx`: add one terse content line "Questions or feedback? → Join the Discord" (link `https://discord.gg/32XHh5mJYn`) in a visible spot below the diagram captions, matching the page's `shell-comment` MDX markup; no "author hangs out there" phrasing.
- [x] T011 `astro.config.mjs`: add `{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/32XHh5mJYn' }` to the Starlight `social` array beside the existing github entry. Do NOT edit the sidebar.
- [x] T012 Convert 7 tool overviews `.md` → `.mdx` via `git mv` (preserves history): `tools/{idea,hop,fab-kit,wt,run-kit,tu,shll}/overview.md`. Add `import GithubButton from '../../../../components/GithubButton.astro';` and place `<GithubButton tool="<slug>" />` near the top (just under the H1/first line) in each. Verify the 4-`../` relative depth against `commands.mdx` in the same dirs. Restore the GitHub link affordance to idea and fab-kit (previously absent).

### Phase 4: Polish — footer copy

- [x] T013 Reword the stale "**Install**, **commands**, and **workflows** pages coming soon." footer in `hop`, `wt`, `run-kit`, `tu`, `shll` overviews (now `.mdx`) so it does NOT claim the Commands page is coming soon (Commands pages exist + are in the sidebar). It MAY note install/workflows are still pending. For `tu`, point to the Commands page without implying a fully-populated reference. Keep a brief GitHub README "full docs" pointer; avoid awkward duplication with the top GithubButton.

## Execution Order

- T002 (GithubButton component) blocks T012 (overviews import it).
- T012 (`.md`→`.mdx` rename) blocks T013 (footer edits land in the renamed `.mdx` files for the 5 affected tools; shll overview footer is edited post-rename).
- T003–T008 are independent of each other and of the component/config work.
- T009–T011 are independent.

## Acceptance

### Functional Completeness

- [x] A-001 fab source_paths: `fab/project/config.yaml` `source_paths` lists `sites/astro-starlight-terminal1/src/` (L10) and no longer lists `sites/astro-tailwind-terminal1/src/`; `true_impact_exclude` unchanged (L15).
- [x] A-002 Canonical install block: `getting-started/install.md` (L6-11), `tools/shll/overview.mdx` (L14-19), and `index.mdx` (conceptually — `shll install` + `shll version`, L21/L26) all present the canonical sequence; `exec $SHELL` is the commented last visible line in both code blocks.
- [x] A-003 No non-existent shll commands: grep returns zero `shll doctor`/`shll list`/`shll shell-install`; verify step uses `shll version` (`getting-started/install.md` L18, `tools/idea/install.md` L19).
- [x] A-004 No fabricated flags: zero `--from-idea`/`idea list --tag`; handoff uses `fab change new --slug …` (`idea/workflows.md` L37, `new-change.md` L21); tag filtering shown as plain `idea list` + grep (`daily-flow.md` L19, `idea/workflows.md` L75).
- [x] A-005 Homepage mock: terminal mock retained, depicts `shll install` (L21) + `shll version` (L26), per-tool `github.com/sahil87/<tool>` links preserved (index.mdx L27-33).
- [x] A-006 GithubButton component: `src/components/GithubButton.astro` accepts `tool` prop (L14-17), anchors to `https://github.com/sahil87/${tool}` (L28), build-time only (no client `<script>`), no new dependency, `:focus-visible` ring (L65-68), `--c-*` token styling.
- [x] A-007 GitHub affordance on every overview: all 7 `tools/*/overview.mdx` exist, no leftover `.md`; each imports + renders `<GithubButton tool="<slug>" />` near top (L6-8); idea (L8) and fab-kit (L8) now have a GitHub link.
- [x] A-008 Footer copy: hop (L37), wt (L35), run-kit (L41), tu (L36), shll (L37) overview footers no longer claim Commands is "coming soon"; GitHub pointer remains.
- [x] A-009 Discord header: `astro.config.mjs` `social` array (L60-63) contains github + discord entry linking `https://discord.gg/32XHh5mJYn`.
- [x] A-010 Discord content mention: homepage `index.mdx` L56 carries "Questions or feedback? → Join the Discord" linking the invite; no "author hangs out there" phrasing anywhere.

### Behavioral Correctness

- [x] A-011 `.md`→`.mdx` rename preserves routing: build emitted all 7 `tools/<tool>/overview/index.html` and the `/{tool}` redirect pages; sidebar unedited; static build succeeded.

### Scenario Coverage

- [x] A-012 Build passes: `pnpm build` succeeded in `sites/astro-starlight-terminal1` (exit 0, 25 pages); no broken `.mdx` import paths. (Ran `pnpm build`; deps pre-installed per dispatch note, so `--frozen-lockfile` install step skipped.)
- [x] A-013 Grep-zero gate: `grep -rnE 'shll (doctor|list|shell-install)|--from-idea|idea list --tag' sites/astro-starlight-terminal1/src` returns zero matches (verified).

### Edge Cases & Error Handling

- [x] A-014 Tool-local lines preserved: `hop` `eval "$(hop shell-init zsh)"` (overview.mdx L16), `wt` `eval "$(wt shell-init)"` (L16), `tu` `eval "$(tu shell-init zsh)"` (L16) left intact; only toolkit-wide wiring uses `shll shell-setup`.
- [x] A-015 tu Commands placeholder: `tu/overview.mdx` L36 points to the Commands page noting the generated reference "isn't published yet" — does not imply a populated reference.

### Code Quality

- [x] A-016 Pattern consistency: `GithubButton.astro` follows `CommandReference.astro` conventions — `not-content` class (L31), scoped `<style>` with `--c-*` tokens, frontmatter `interface Props` (L14-17), `:focus-visible` (L65-68), and the same missing-slug build-time guard (L24-26).
- [x] A-017 No unnecessary duplication: reuses existing `--c-*` terminal tokens / `not-content` pattern; no new runtime/build dependency (package.json untouched); build stays fully static (Constitution I/VI).

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Deletion Candidates

- Bottom-of-page GitHub README pointers in `tools/{hop,wt,run-kit,tu,shll}/overview.mdx` footers (e.g. `shll/overview.mdx:39`, `hop/overview.mdx:39`, `wt/overview.mdx:37`, `run-kit/overview.mdx:43`, `tu/overview.mdx:38`) — partially redundant with the new top-of-page `<GithubButton>`. They are RETAINED on purpose (they carry extra "deepest reference / full README" context the button does not), so not auto-deleted; flagged for the human reviewer to decide whether the duplication is worth keeping. Note `idea/overview.mdx` and `fab-kit/overview.mdx` correctly do NOT carry a bottom GitHub pointer (their footers link to install/commands pages), so the top button is their only repo link — no redundancy there.
