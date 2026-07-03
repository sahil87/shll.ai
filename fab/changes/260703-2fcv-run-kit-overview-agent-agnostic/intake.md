# Intake: run-kit overview — agent-agnostic reframe

**Change**: 260703-2fcv-run-kit-overview-agent-agnostic
**Created**: 2026-07-03

## Origin

Conversational — followed a `/fab-discuss` session. The user asked to check the "new overview" in the run-kit repo (`hop run-kit where` → `/home/sahil/code/sahil87/run-kit`) and decide whether the static overview in shll.ai needs updating.

> Check the new overview in run-kit repo. Do you think the static overview in shll.ai needs to be updated? … yes [to drafting a revised overview.mdx leading with the agent-agnostic framing, run through /fab-new]

**Key findings from the conversation:**

- The run-kit **README** (canonical source) has been deliberately repositioned. It now leads with an **agent-agnostic** framing — *"Your tmux, in the browser and on your phone"* — a remote console for tmux, and explicitly **rejects** the agent-wrapper characterization:
  > "run-kit never wraps the agent … **The agent is one of the things you run, not the thing run-kit is.**"
  It stresses agent-agnosticism is the headline value: *"outlives whatever coding agent you're running this month"*; a pane is *"equally a build, a REPL, an ssh session, `htop`."*
- The shll.ai static `overview.mdx` still leads with *"a browser dashboard for tmux and **Claude Code** workspaces"* — precisely the framing the canonical README now disowns.
- `readme.mdx` (mechanically synced) will pick up the new framing on the next scheduled pull; it is **not** hand-edited here. Only the site-authored `overview.mdx` (body + `description` frontmatter) is in scope.
- `vn39` verification: the only CLI tokens the framing needs are `rk riff` and `rk serve`, both confirmed present in `help/run-kit.json` (`commands` list). No new command references introduced.

## Why

1. **Problem** — the site-authored `overview.mdx` leads with the one characterization the tool's own canonical source now explicitly disowns ("Claude Code dashboard" / agent-wrapper framing). This is stale positioning, not a cosmetic nit: a visitor reads the overview first, and it currently contradicts the README rendered one click away on the sibling `readme` page.
2. **Consequence if unfixed** — the overview and the (soon-to-refresh) synced `readme` page will actively disagree on what run-kit *is*. The overview's `description` frontmatter also feeds the SEO/social meta and the `/tools` index one-liner (a hand-authored surface per `seo-social-meta`), so the stale framing propagates into search results and the tools directory.
3. **Why this approach** — the fix is a targeted rewrite of the site-authored framing to match the canonical repositioning (single-source + mechanical sync keeps `readme.mdx` canonical; only the site's own framing prose is our responsibility). We reframe from "Claude Code dashboard" to "agent-agnostic remote tmux console," while preserving the `## How it fits` cross-tool graph and the `## Where to next` nav, which remain correct.

## What Changes

Single file: `sites/astro-starlight-terminal1/src/content/docs/tools/run-kit/overview.mdx`. Two edits.

### 1. `description:` frontmatter

**Current:**
```
description: Browser dashboard for tmux + Claude Code workspaces. Mobile-friendly via Tailscale.
```

**New (agent-agnostic, hand-authored SEO one-liner — feeds social meta + `/tools` index):**
```
description: An agent-agnostic remote console for your tmux — every session and pane as a live terminal, in the browser and on your phone.
```

Rationale: drops "Claude Code" (the disowned framing), leads with "agent-agnostic remote console for your tmux," keeps the phone/mobile hook that the README also emphasizes. No CLI tokens, so `vn39` is trivially satisfied for this line.

### 2. Lead paragraph (body)

**Current:**
> `run-kit` is a browser dashboard for tmux and Claude Code workspaces — one place to watch every AI coding agent you have running. `rk riff` spawns agents in parallel git worktrees; `rk serve` opens the dashboard that lets you watch them all, from your desk or your phone (mobile-friendly over Tailscale). When you're running many agents at once, `run-kit` is the cross-session view that turns a wall of tmux panes into a single screen.

**New (agent-agnostic framing; matches README repositioning; retains `rk riff`/`rk serve` — both `vn39`-verified):**
> `run-kit` is an agent-agnostic remote console for your tmux — every session and pane as a live terminal, in a sidebar, from your desk or your phone (mobile-friendly over Tailscale). It never wraps what's in the pane: a pane is equally an AI coding agent, a dev server, a REPL, or an ssh session. `rk riff` spawns each parallel workspace in its own git worktree; `rk serve` opens the dashboard that watches them all. Because it exposes your tmux rather than any one agent's protocol, it outlives whatever coding agent you're running this month.

Rationale: mirrors the README's headline value (agent-agnostic; "the agent is one of the things you run, not the thing run-kit is"), keeps the phone-first hook and the two-command mental model (`rk riff` spawn / `rk serve` dashboard), and preserves the worktree link intent that `## How it fits` reinforces.

### 3. Unchanged sections

`## How it fits` and `## Where to next` stay verbatim — the cross-tool link graph (`wt`, `tu`) is still accurate, and the nav links to `readme`/`commands` are correct. No edits.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) The overview-body shape entry currently describes the run-kit overview under the `bees`-era site-authored framing. If hydrate deems the agent-agnostic reframe a shape change worth recording, this file's description of the overview lead may need a light touch. **Likely no change** — the rubric describes the *shape* (GithubButton + job-framed lead + `## How it fits` + nav), which this change preserves; only the lead's *wording* changes. Flag for hydrate to confirm; do not assume a memory edit is required.

## Impact

- **Code area**: `sites/astro-starlight-terminal1/src/content/docs/tools/run-kit/overview.mdx` (site-authored MDX, live Starlight site).
- **Downstream surfaces** (via the `description` frontmatter, per `seo-social-meta`): the page `<meta name="description">`, the og/twitter description, and the `/tools` index one-liner (`ToolsIndex.astro`) — all update from the single frontmatter edit. No separate hand-copy to chase.
- **Not touched**: `readme.mdx` (mechanically synced — will carry the new framing on the next scheduled `refresh-readme.yml` pull), `commands.mdx` (generated), `help/run-kit.json`.
- **Dependencies**: none added (Constitution VI). Static-only (Constitution I).
- **Build**: MDX content change; standard Astro build. No route/schema changes.

## Open Questions

- None. The canonical framing is unambiguous (verified against the run-kit README), the editable surface is well-defined, and `vn39` safety is verified. Scope is one file, two edits.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Reframe overview from "Claude Code dashboard" to "agent-agnostic remote tmux console" | Canonical run-kit README explicitly disowns the agent-wrapper framing; matching it is single-sourcing, not a judgment call | S:95 R:90 A:95 D:95 |
| 2 | Certain | Edit only `overview.mdx` (body + `description`); leave `readme.mdx` untouched | Constitution Tool-Page Depth + memory: `readme.mdx` is mechanically synced, never hand-edited | S:95 R:85 A:100 D:95 |
| 3 | Certain | Use only `rk riff` and `rk serve` as CLI tokens in framing prose | `vn39` HARD rule binds this prose; both tokens verified present in `help/run-kit.json`, no new references introduced | S:90 R:80 A:100 D:95 |
| 4 | Confident | Update the `description` frontmatter too (not just the body) | `seo-social-meta` convention: this line is a hand-authored surface feeding social meta + `/tools` index; leaving it stale would defeat the reframe | S:85 R:85 A:90 D:85 |
| 5 | Confident | Keep `## How it fits` and `## Where to next` verbatim | Cross-tool link graph (`wt`, `tu`) and nav are still accurate; the reframe is about the lead's wording, not page structure | S:80 R:90 A:85 D:85 |
| 6 | Tentative | No memory edit required (flag `tool-page-rubric` for hydrate to confirm) | The rubric describes overview *shape*, which is preserved; only wording changes — but hydrate is the authority on whether the recorded framing needs a refresh | S:70 R:85 A:70 D:65 |

6 assumptions (3 certain, 2 confident, 1 tentative, 0 unresolved).
