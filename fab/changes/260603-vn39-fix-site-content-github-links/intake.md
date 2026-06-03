# Intake: Fix site content accuracy + per-tool GitHub affordance

**Change**: 260603-vn39-fix-site-content-github-links
**Created**: 2026-06-03
**Status**: Draft

## Origin

> Initiated from a `/fab-discuss` content audit of the live shll.ai site. The audit
> first targeted `sites/astro-tailwind-terminal1` (what `fab/project/config.yaml`
> `source_paths` points at) but discovered that site is **no longer live** —
> `.github/workflows/deploy.yml` has `SITE_DIR: sites/astro-starlight-terminal1`
> (Starlight, swapped 2026-05-31). Re-audited the live Starlight site against the
> machine-generated `help/*.json` at the repo root (the anti-drift source of truth)
> and the canonical `shll` README quick-start.

Interaction mode: conversational. The user reviewed a 7-point findings report and
explicitly approved fixes #1–#7, choosing the recommended option at each decision
point:
- shll backlog framing → "add the commands" (done directly in `~/code/sahil87/shll/fab/backlog.md` as `[d0ct]` doctor + `[lst7]` list; out of scope for this change).
- GitHub affordance → reusable `<GithubButton>` component, top of each tool overview.
- Packaging → one combined `fix` change (this one).
- Discord → re-add; it is the author's only contact channel today.

## Why

1. **Problem.** The live site documents CLI commands and flags that **do not exist**
   in the tools' actual help output: `shll doctor`, `shll list`, `shll shell-install`
   (legacy alias, not the canonical command), `wt create --from-idea`,
   `fab change new --from-idea`, and `idea list --tag`. It also shows **three different
   "install everything" stories** across three pages, none matching the canonical
   `shll` quick-start. Separately, `fab/project/config.yaml` still points fab tooling
   at the dead tailwind site, and the live site has **no Discord link** (the author's
   only contact channel) and **no consistent per-tool GitHub jump** from overview pages.

2. **Consequence if unfixed.** Visitors copy-paste commands that fail
   (`shll doctor` → "unknown command"), erode trust in the toolkit the site advertises,
   and have no reliable path to a tool's repo or to contacting the author. The stale
   `source_paths` means future fab audits keep inspecting the wrong site. This directly
   violates the constitution's **External Links** rule (accuracy is the site's core value)
   and the **anti-drift** intent behind `help/*.json`.

3. **Approach over alternatives.** Single-source all command/flag claims against the
   committed `help/*.json` (already the build-time source of truth via
   `CommandReference.astro`) and the canonical `shll` quick-start. For the GitHub jump,
   a reusable component beats per-page copy (one place to maintain, consistent placement,
   dark-mode parity in one spot) and beats Starlight's `editUrl` (which reads as
   "edit this page", semantically wrong). Packaged as one `fix` change because every
   item is a content-correctness fix on the same site — cheaper to review as one pass.

## What Changes

### 1. Repoint fab source_paths (repo-level config)

`fab/project/config.yaml` → `source_paths` from `sites/astro-tailwind-terminal1/src/`
to `sites/astro-starlight-terminal1/src/` (the live site per `SITE_DIR`). The
`true_impact_exclude` list and `SITE_DIR` in `deploy.yml` are unchanged.

### 2. One canonical install block, site-wide

Replace every "install everything" snippet with the canonical `shll` quick-start
(verified against `help/shll.json` v0.0.11 and `github.com/sahil87/shll#quick-start`):

```bash
brew install sahil87/tap/shll       # or: brew install sahil87/tap/all
shll install                        # brew-installs every roster tool you're missing
shll shell-setup --trust-tap        # wire your shell + record trust for sahil87/tap
exec $SHELL                          # reload so the shell integration takes effect
```

Locations:
- `src/content/docs/index.mdx` — homepage hero/shell mock; depicted install matches the canonical block.
- `src/content/docs/getting-started/install.md` — currently `shll install` + `eval "$(shll shell-init zsh)"`.
- `src/content/docs/tools/shll/overview.md` — currently `shll shell-install` + `exec $SHELL`.

`exec $SHELL` stays as the last visible line (commented inline), not dropped.

### 3. Remove non-existent shll commands from content

`shll` has only `install`, `shell-init`, `shell-setup`, `update`, `version` (per `help/shll.json`).
- `shll doctor` (in `getting-started/install.md` "Verify" + `tools/idea/install.md`) → replace verify step with `shll version` (exists).
- `shll list` (homepage mock in `index.mdx`) → **keep the terminal-session mock** (preserve the visual identity) but depict only real commands: `shll install` output followed by `shll version` listing installed tools + versions. No fabricated `shll list` line.
  <!-- clarified: homepage mock — keep terminal aesthetic, show `shll install` + `shll version` (both real); tool/version values illustrative -->
  Target shape:
  ```text
  $ shll install
  ==> tapping sahil87/tap
  ==> installing idea, hop, fab-kit, wt, run-kit, tu
  ==> done in 12.3s

  $ shll version
  shll     v0.0.11
  idea     v0.0.6     fab-kit  2.0.3
  hop      ...        wt       1.4.2
  run-kit  ...        tu       ...
  $ ▊
  ```
  The `shll version` output must keep the existing per-tool `[git]`-style repo links where they currently appear (those link to `github.com/sahil87/<tool>` and are correct).

(The real `doctor`/`list` commands are backlogged in the `shll` repo; the site must not reference them until they ship.)

### 4. Remove fabricated flags from workflow examples

Verified absent: `--from-idea` (not on `wt create`; `fab change new` has only `--slug`/`--change-id`/`--log-args`), `idea list --tag`.
- `src/content/docs/workflows/daily-flow.md`, `src/content/docs/workflows/new-change.md`: rewrite `wt create <slug> --from-idea <id>` and the init-script default to use real commands; idea→fab-kit handoff uses `fab change new --slug <slug>`.
- `src/content/docs/tools/idea/workflows.md`: drop `idea list --tag bug` → plain `idea list` (tags remain `#word` substrings in text, no `--tag` flag).

### 5. Per-tool GitHub affordance (reusable component)

New `src/components/GithubButton.astro`: prop `tool` (slug) → links `https://github.com/sahil87/{tool}`,
styled with terminal `--c-*` tokens (dark-mode parity), visible focus state (Accessibility),
build-time only (no client JS). Rendered near the **top** of every tool overview.
Because overview pages are `.md` and a component import requires MDX, the 7 overview
files become `.mdx` (mirroring existing `commands.mdx`); sidebar slugs in
`astro.config.mjs` are unaffected (slug = path, extension-agnostic). Restores the
GitHub link to `idea`/`fab-kit` overviews (currently absent).

### 6. Fix stale "coming soon" footer copy

`hop`, `wt`, `run-kit`, `tu`, `shll` overviews say "Install, commands, and workflows
pages coming soon" — but `commands.mdx` exists for all 7 and the sidebar lists Commands.
Update footer to reflect reality (Commands pages exist; install/workflows still pending
for some tools).

### 7. Re-add Discord

Add `https://discord.gg/32XHh5mJYn` (same invite the prior live tailwind site used) to
the Starlight `social` config in `astro.config.mjs` (Starlight `discord` icon, beside the
existing `github` entry). **Also** surface a light content mention so the channel is
discoverable beyond the small header glyph (it is the author's only contact channel):
a short one-line "Questions or feedback? → Join the Discord" pointer in a visible spot
(homepage footer area or Overview). Keep it terse — do **not** add the
"The author hangs out there" line.
<!-- clarified: Discord — header social icon + ONE light content mention; wording trimmed (no "author hangs out there" line) -->

## Affected Memory

- `conventions/tool-page-rubric`: (modify) overview pages now carry a top-of-page GitHub affordance; 7 overviews move `.md` → `.mdx` to import the component; the rubric body should reflect the GitHub-link requirement and the install block referencing canonical `shll` quick-start.
- `conventions/help-collection`: (modify) note that site prose is now reconciled to be consistent with `help/*.json` command/flag names (no content may reference a command/flag absent from the relevant help doc).

## Impact

- **Content**: `index.mdx`, `getting-started/install.md`, `getting-started/overview.md` (references `shll doctor`? verify), 7 `tools/*/overview.{md→mdx}`, `tools/idea/install.md`, `tools/idea/workflows.md`, `workflows/daily-flow.md`, `workflows/new-change.md`.
- **Components/config**: new `src/components/GithubButton.astro`; `astro.config.mjs` (social entry; no sidebar change needed).
- **Repo config**: `fab/project/config.yaml` (`source_paths`).
- **Dependencies**: none added (Constitution VI). **SITE_DIR**: unchanged. **Build**: must stay fully static (Constitution I).
- **External links**: GitHub repos verified 200; Discord invite reused from prior live site.

## Open Questions

_All resolved via `/fab-clarify` (2026-06-03) — see `## Clarifications`._

- ~~Discord in page content vs. header icon only?~~ → **Resolved**: header social icon **plus** one light "Questions? → Join the Discord" content mention (wording trimmed; no "author hangs out there" line).
- ~~Homepage `shll list` mock: keep a shell-session mock or simplify?~~ → **Resolved**: keep the terminal mock, depicting real commands (`shll install` output + `shll version`).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Live site is `sites/astro-starlight-terminal1`; repoint `source_paths` there | `SITE_DIR` in `deploy.yml` + memory both confirm; deterministic | S:98 R:80 A:95 D:95 |
| 2 | Certain | Canonical install block = the 4-line `shll` quick-start; replace all 3 variants | User stated `shll` is the source of truth; verified vs `help/shll.json` v0.0.11 + README | S:95 R:75 A:92 D:90 |
| 3 | Certain | Remove `shll doctor`/`shll list` from content; verify step → `shll version` | Commands absent from `help/shll.json` (0 matches); user approved removal | S:95 R:80 A:95 D:88 |
| 4 | Certain | Remove `--from-idea` and `idea list --tag`; use real `fab change new --slug` / plain `idea list` | Flags absent from `help/{idea,wt,fab-kit}.json`; user approved | S:92 R:78 A:95 D:82 |
| 5 | Confident | GitHub jump = reusable `<GithubButton tool>` component, top of each overview | User chose recommended option; component beats per-page copy / editUrl | S:90 R:70 A:80 D:85 |
| 6 | Confident | 7 overview `.md` → `.mdx` to allow component import (mirrors `commands.mdx`) | MDX required for `import`; slug unaffected by extension; established pattern on-site | S:85 R:55 A:85 D:80 |
| 7 | Certain | Re-add Discord `discord.gg/32XHh5mJYn` to Starlight `social` in `astro.config.mjs` | User confirmed it's the only contact channel; exact invite reused from prior live site | S:95 R:85 A:90 D:88 |
| 8 | Confident | Update stale "coming soon" footer copy to reflect existing Commands pages | `commands.mdx` exists for all 7 + sidebar lists them; factual correction | S:88 R:85 A:90 D:82 |
| 9 | Confident | Package as one combined `fix` change (not split fix+feat) | User chose recommended option; all items are content correctness on one site | S:90 R:75 A:85 D:80 |
| 10 | Certain | Discord = header social icon + ONE light content mention; trimmed wording (no "author hangs out there") | Clarified — user confirmed header + light content mention | S:95 R:80 A:60 D:55 |
| 11 | Certain | Keep homepage terminal mock, depicting real commands (`shll install` + `shll version`) | Clarified — user confirmed keep mock with real commands | S:95 R:80 A:65 D:50 |

11 assumptions (9 certain, 2 confident, 0 tentative, 0 unresolved).

## Clarifications

### Session 2026-06-03

| # | Action | Detail |
|---|--------|--------|
| 10 | Confirmed (changed) | Discord: header social icon **+** one light content mention; wording trimmed — drop "The author hangs out there" line |
| 11 | Confirmed | Homepage: keep terminal-session mock, depict real commands (`shll install` output + `shll version`); tool/version values illustrative |
