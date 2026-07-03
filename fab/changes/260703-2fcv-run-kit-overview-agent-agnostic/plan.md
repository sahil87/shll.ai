# Plan: run-kit overview — agent-agnostic reframe

**Change**: 260703-2fcv-run-kit-overview-agent-agnostic
**Intake**: `intake.md`

## Requirements

### Content: run-kit overview framing

#### R1: Overview leads with the agent-agnostic remote-tmux-console framing
The site-authored `overview.mdx` for run-kit SHALL present run-kit as an agent-agnostic remote console for tmux, dropping the disowned "Claude Code dashboard" / agent-wrapper characterization. This applies to both the `description:` frontmatter (the hand-authored SEO/social/`/tools`-index one-liner) and the body lead paragraph. Framing prose MUST NOT reference any CLI token other than `rk riff` and `rk serve` (the `vn39` hard rule; both verified present in `help/run-kit.json`). The `## How it fits` and `## Where to next` sections SHALL remain byte-for-byte unchanged.

- **GIVEN** the run-kit README canonically repositions the tool as agent-agnostic ("the agent is one of the things you run, not the thing run-kit is")
- **WHEN** the site-authored `overview.mdx` is edited
- **THEN** the `description:` frontmatter reads the new agent-agnostic one-liner
- **AND** the body lead paragraph is replaced with the new agent-agnostic paragraph (retaining `rk riff` / `rk serve` and the mobile-over-Tailscale hook)
- **AND** no CLI token other than `rk riff` and `rk serve` appears in the framing prose
- **AND** `## How it fits` and `## Where to next` are unchanged, the `GithubButton` import is intact, and the frontmatter/MDX remain well-formed

### Non-Goals
- Editing `readme.mdx` — mechanically synced; picks up the new framing on the next scheduled `refresh-readme.yml` pull.
- Editing `commands.mdx` (generated) or `help/run-kit.json`.
- Any structural/shape change to the overview page (the reframe is wording-only).

## Tasks

### Phase 1: Content Edit

- [x] T001 Replace the `description:` frontmatter in `sites/astro-starlight-terminal1/src/content/docs/tools/run-kit/overview.mdx` with the agent-agnostic one-liner from intake §1 <!-- R1 -->
- [x] T002 Replace the body lead paragraph (the "`run-kit` is a browser dashboard for tmux and Claude Code workspaces…" paragraph) in the same file with the new agent-agnostic lead paragraph from intake §2; leave `## How it fits` and `## Where to next` verbatim <!-- R1 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: The `description:` frontmatter matches the new agent-agnostic one-liner verbatim; no "Claude Code" / dashboard framing remains in it.
- [x] A-002 R1: The body lead paragraph matches the new agent-agnostic paragraph verbatim, retaining `rk riff` and `rk serve` and the mobile-over-Tailscale hook.

### Behavioral Correctness

- [x] A-003 R1: `## How it fits` and `## Where to next` are byte-for-byte unchanged; the `GithubButton` import and `<GithubButton tool="run-kit" />` usage are intact.

### Edge Cases & Error Handling

- [x] A-004 R1: No CLI token other than `rk riff` and `rk serve` appears in the framing prose (vn39 hard rule); the MDX is well-formed (frontmatter delimiters intact, no broken import).

### Code Quality

- [x] A-007 Pattern consistency: The tool name and commands are backticked as the existing file does; prose style matches the surrounding overview.
- [x] A-008 No unnecessary duplication: Only `overview.mdx` is edited; no hand-copy of the canonical README.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Reframe both the `description:` frontmatter and body lead to agent-agnostic tmux-console wording, verbatim from intake §1/§2 | Intake supplies exact before/after text; canonical README disowns the agent-wrapper framing — matching it is single-sourcing, not a judgment call | S:95 R:90 A:95 D:95 |
| 2 | Certain | Keep `## How it fits` and `## Where to next` byte-for-byte; edit only `overview.mdx` | Intake + constitution Tool-Page Depth: reframe is wording-only; `readme.mdx` is mechanically synced and never hand-edited | S:95 R:90 A:100 D:95 |

2 assumptions (2 certain, 0 confident, 0 tentative).
