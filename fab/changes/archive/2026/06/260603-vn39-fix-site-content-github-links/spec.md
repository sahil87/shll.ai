# Spec: Fix site content accuracy + per-tool GitHub affordance

**Change**: 260603-vn39-fix-site-content-github-links
**Created**: 2026-06-03
**Affected memory**: `docs/memory/conventions/tool-page-rubric.md`, `docs/memory/conventions/help-collection.md`

## Non-Goals

- Implementing `shll doctor` / `shll list` — those are backlogged in the `sahil87/shll` repo (`[d0ct]`, `[lst7]`); this change only *removes* references to them from the site.
- Swapping the live site (`SITE_DIR` in `deploy.yml` stays `sites/astro-starlight-terminal1`).
- Touching the non-live tailwind site (`sites/astro-tailwind-terminal1`) or `_playground`.
- Building install/workflows pages for the 5 thin tools — only the stale "coming soon" copy is corrected, not the missing pages authored.
- Adding any new runtime/build dependency (Constitution VI).

## Command Accuracy: Site prose vs. machine-generated help

### Requirement: No content references a command or flag absent from help/*.json
Site content under `sites/astro-starlight-terminal1/src/content/` SHALL NOT reference any CLI command or flag that does not exist in the corresponding `help/<tool>.json` at the repo root (the machine-generated source of truth). Specifically, `shll doctor`, `shll list`, `shll shell-install` (as a command — it is only a legacy alias), `wt create --from-idea`, `fab change new --from-idea`, and `idea list --tag` MUST be removed or replaced with real equivalents.

#### Scenario: shll command audit
- **GIVEN** `help/shll.json` lists subcommands `install`, `shell-init`, `shell-setup`, `update`, `version`
- **WHEN** the site content is grepped for `shll doctor`, `shll list`, or `shll shell-install`
- **THEN** zero matches remain in any `.md`/`.mdx` content file
- **AND** the canonical command `shll shell-setup` (with `--trust-tap`) is used wherever shell wiring is described

#### Scenario: idea/wt/fab flag audit
- **GIVEN** `--from-idea` is absent from `help/wt.json` and `help/fab-kit.json`, and `--tag` is absent from `help/idea.json`
- **WHEN** the workflow/tool pages are grepped for `--from-idea` and `idea list --tag`
- **THEN** zero matches remain in any `.md`/`.mdx` content file
  <!-- clarified: enumerated exact affected files vs live site (grep). `--from-idea` appears in THREE files (not the two the intake listed): `workflows/daily-flow.md`, `workflows/new-change.md` (5 occurrences incl. the prose at L69), AND `tools/idea/workflows.md` (L37 `fab change new --slug … --from-idea qu1d`). `idea list --tag` appears in TWO files: `tools/idea/workflows.md` (L75) AND `workflows/daily-flow.md` (L19). All must be scrubbed — the intake's per-file enumeration under "What Changes #4" omitted `--from-idea` on `tools/idea/workflows.md`; the binding rule is grep-zero across all content. -->
- **AND** the idea→fab-kit handoff uses `fab change new --slug <slug>` and tag filtering is shown as plain `idea list` (tags are `#word` substrings in the backlog text, not a flag)
- **AND** the prose at `workflows/new-change.md` L69 ("`fab change new` without `--from-idea` …") is reworded to drop the non-existent flag

### Requirement: Canonical install block site-wide
Every "install everything" snippet SHALL be the canonical `shll` quick-start, verified against `help/shll.json` (v0.0.11) and `github.com/sahil87/shll#quick-start`:

```bash
brew install sahil87/tap/shll       # or: brew install sahil87/tap/all
shll install                        # brew-installs every roster tool you're missing
shll shell-setup --trust-tap        # wire your shell + record trust for sahil87/tap
exec $SHELL                          # reload so the shell integration takes effect
```

The three current divergent blocks — `index.mdx` (bare `shll install`), `getting-started/install.md` (`shll install` + `eval "$(shll shell-init zsh)"`), and `tools/shll/overview.md` (`shll shell-install` + `exec $SHELL`) — MUST all be replaced with this block. `exec $SHELL` MUST remain as the last visible line (commented inline); it SHALL NOT be dropped.

#### Scenario: install block consistency
- **GIVEN** the three pages above currently show three different install sequences
- **WHEN** a reader compares the "install everything" block on any of the three pages
- **THEN** all three show the identical canonical 4-line block
- **AND** no page shows `shll shell-install` or a manual `eval "$(shll shell-init …)"` as the toolkit-wide wiring step

### Requirement: Homepage terminal mock uses only real commands
The homepage (`index.mdx`) SHALL retain its terminal-session mock aesthetic but depict only real commands. The fabricated `shll list` block MUST be replaced by a real-command depiction: `shll install` output followed by `shll version` listing installed tools + versions. Per-tool repo links currently rendered in the mock (`github.com/sahil87/<tool>`) MUST be preserved (they are correct).

#### Scenario: homepage mock
- **GIVEN** the homepage currently mocks `$ shll list` (a non-existent command)
- **WHEN** a reader views the homepage terminal block
- **THEN** it shows `$ shll install` output and `$ shll version` output (both real commands)
- **AND** the per-tool GitHub links inside the mock still resolve to `github.com/sahil87/<tool>`
- **AND** illustrative tool/version values are acceptable (the block is a depiction, not live output)

### Requirement: Verify step uses a real command
The post-install "Verify" step in `getting-started/install.md` and the verification reference in `tools/idea/install.md` SHALL use `shll version` (which exists) instead of `shll doctor` (which does not).

#### Scenario: verify step
- **GIVEN** `shll doctor` is not a real command
- **WHEN** a reader follows the Verify section after installing
- **THEN** the documented verification command is `shll version`
- **AND** it does not reference `shll doctor`

## GitHub Affordance: Per-tool jump from overview pages

### Requirement: Reusable GitHub link component
A reusable Astro component (`sites/astro-starlight-terminal1/src/components/GithubButton.astro`) SHALL accept a `tool` slug prop and render a link to `https://github.com/sahil87/{tool}`. It MUST do all work at build time (no client-side fetch — Constitution I), render correctly in both light and dark themes using the terminal `--c-*` CSS tokens (Constitution V), and provide a visible keyboard focus state (Constitution Accessibility).

#### Scenario: component renders correct link
- **GIVEN** `<GithubButton tool="wt" />`
- **WHEN** the page is built
- **THEN** the rendered anchor's href is `https://github.com/sahil87/wt`
- **AND** the link is reachable by keyboard with a visible focus ring
- **AND** the component introduces no client-side JS and no new dependency

### Requirement: GitHub affordance on every tool overview, near the top
Every tool overview page (`tools/{idea,hop,fab-kit,wt,run-kit,tu,shll}/overview`) SHALL render the GitHub affordance near the top of the page. Because component import requires MDX, these 7 overview files SHALL be converted from `.md` to `.mdx`. The sidebar slugs in `astro.config.mjs` are unaffected (slug is extension-agnostic). The `idea` and `fab-kit` overviews, which currently have no GitHub link, MUST gain one.

#### Scenario: overview has top-of-page GitHub link
- **GIVEN** any of the 7 tool overview pages
- **WHEN** a reader opens it
- **THEN** a GitHub link to that tool's repo appears near the top
- **AND** the page still builds (the `.md`→`.mdx` rename did not break routing or the sidebar)
- **AND** the existing redirect `/{tool}` → `/tools/{tool}/overview/` still resolves

## Site Copy Accuracy

### Requirement: "Coming soon" footer reflects reality
The overview footers on `hop`, `wt`, `run-kit`, `tu`, `shll` SHALL NOT claim the Commands page is "coming soon", because `commands.mdx` exists for all 7 tools and the sidebar lists a Commands entry for each. The footer copy MUST be updated to reflect that Commands pages exist; it MAY note that install/workflows pages are still pending for tools that lack them.
<!-- clarified: `tu` is the one tool with NO `help/tu.json` at the repo root (only fab-kit, hop, idea, run-kit, shll, wt exist). `tu/commands.mdx` therefore renders `CommandReference`'s neutral placeholder ("Command reference not generated yet — see the GitHub README"), not a populated reference — by design (ENOENT → placeholder, build still succeeds). The Commands *route* nonetheless exists and is in the sidebar, so the "coming soon" claim is still false for `tu`; the corrected footer wording for `tu` should point to the Commands page without implying a fully-populated reference. This does not block the change. -->
<!-- clarified: per-tool `eval "$(tu shell-init zsh)"` (tu/overview.md L12) is a tool-local completion line, NOT the toolkit-wide wiring step the install-block requirement targets — it is correctly out of scope and SHALL be left as-is. -->
The footer-copy correction also applies to `tu` even though its Commands page is a placeholder.

#### Scenario: footer copy
- **GIVEN** `commands.mdx` exists for hop/wt/run-kit/tu/shll and the sidebar lists Commands for each
- **WHEN** a reader reads the bottom of one of those overviews
- **THEN** it does not say the commands page is "coming soon"
- **AND** the GitHub link (the new affordance) remains present

## Contact: Discord

### Requirement: Discord in header social + light content mention
The Discord invite `https://discord.gg/32XHh5mJYn` SHALL be added to Starlight's `social` config in `astro.config.mjs` (using Starlight's `discord` social icon, beside the existing `github` entry). Additionally, a single terse content mention ("Questions or feedback? → Join the Discord") SHALL be surfaced in a visible spot (homepage and/or Overview). The mention MUST NOT include the line "The author hangs out there."

#### Scenario: header social icon
- **GIVEN** the Starlight `social` array currently has only a github entry
- **WHEN** the site header renders
- **THEN** a Discord icon linking to `discord.gg/32XHh5mJYn` appears beside the GitHub icon

#### Scenario: content mention
- **GIVEN** Discord is the author's only contact channel
- **WHEN** a reader scans the homepage (or Overview)
- **THEN** a short one-line "Questions or feedback? → Join the Discord" pointer is present
- **AND** it does not contain the phrase "The author hangs out there"

## Repo Config

### Requirement: fab source_paths points at the live site
`fab/project/config.yaml` `source_paths` SHALL point at the live site `sites/astro-starlight-terminal1/src/`, not the dead tailwind site.

#### Scenario: source_paths
- **GIVEN** `SITE_DIR` in `deploy.yml` is `sites/astro-starlight-terminal1`
- **WHEN** `fab/project/config.yaml` `source_paths` is read
- **THEN** it lists `sites/astro-starlight-terminal1/src/`
- **AND** it no longer lists `sites/astro-tailwind-terminal1/src/`

## Design Decisions

1. **Single-source command claims against `help/*.json`, not the GitHub READMEs.**
   - *Why*: the `help/*.json` are machine-generated from each binary's `-h` output and already the build-time source of truth (`CommandReference.astro`). They cannot drift from the actual CLI.
   - *Rejected*: trusting READMEs (can lag the binary) or hand-verifying (re-introduces drift).
2. **Reusable `<GithubButton>` component over per-page links or Starlight `editUrl`.**
   - *Why*: one place to maintain, consistent placement + dark-mode parity, semantically correct ("go to repo", not "edit page").
   - *Rejected*: per-page Markdown links (drift, inconsistent placement); `editUrl` (wrong semantics).
3. **Convert 7 overviews `.md` → `.mdx` to enable component import.**
   - *Why*: MDX is required to `import` an Astro component; `commands.mdx` already establishes this pattern on-site; slug is extension-agnostic so routing/sidebar are unaffected.
   - *Rejected*: Starlight content-component injection without MDX (more machinery than a rename).
4. **Keep the homepage terminal mock, depict real commands.**
   - *Why*: preserves the site's visual identity while making every depicted line real (`shll install`, `shll version`).
   - *Rejected*: dropping the mock to a plain code block (loses the "here's what you got" payoff).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Live site is `sites/astro-starlight-terminal1`; repoint `source_paths` there | Confirmed from intake #1; `SITE_DIR` + memory both confirm | S:98 R:80 A:95 D:95 |
| 2 | Certain | Canonical install block = the 4-line `shll` quick-start; replace all 3 variants | Confirmed from intake #2; verified vs `help/shll.json` v0.0.11 + README | S:95 R:75 A:92 D:90 |
| 3 | Certain | Remove `shll doctor`/`shll list` from content; verify → `shll version` | Confirmed from intake #3; 0 matches in `help/shll.json` | S:95 R:80 A:95 D:88 |
| 4 | Certain | Remove `--from-idea` / `idea list --tag`; use real `fab change new --slug` / plain `idea list` | Confirmed from intake #4; flags absent from help docs | S:92 R:78 A:95 D:82 |
| 5 | Confident | GitHub jump = reusable `<GithubButton tool>` component, top of each overview | Confirmed from intake #5; user chose recommended | S:90 R:70 A:80 D:85 |
| 6 | Confident | 7 overview `.md` → `.mdx` to allow component import | Confirmed from intake #6; mirrors existing `commands.mdx` | S:85 R:55 A:85 D:80 |
| 7 | Certain | Re-add Discord `discord.gg/32XHh5mJYn` to Starlight `social` | Confirmed from intake #7; only contact channel; exact invite reused | S:95 R:85 A:90 D:88 |
| 8 | Confident | Update stale "coming soon" footer copy | Confirmed from intake #8; factual correction | S:88 R:85 A:90 D:82 |
| 9 | Certain | Discord = header social icon + ONE light content mention; no "author hangs out there" line | Upgraded from intake #10 (Tentative→Certain via /fab-clarify) | S:95 R:80 A:60 D:55 |
| 10 | Certain | Keep homepage terminal mock; depict `shll install` + `shll version` (real) | Upgraded from intake #11 (Tentative→Certain via /fab-clarify) | S:95 R:80 A:65 D:50 |
| 11 | Confident | Discord content mention placed on homepage (primary entry point) | Spec-level refinement of intake #9; homepage is highest-traffic surface | S:80 R:85 A:80 D:70 |
| 12 | Confident | Illustrative tool/version values in the homepage mock are acceptable | The block is a depiction not live output; values need not be byte-exact | S:82 R:88 A:80 D:78 |

12 assumptions (6 certain, 6 confident, 0 tentative, 0 unresolved).
