# Standard: skill

The agent skill-bundle contract for every CLI in the [shll toolkit](https://shll.ai). Each tool exposes a `<tool> skill` subcommand that prints a stable, one-page markdown **skill bundle** for the agent *using* the tool — embedded in the binary, versioned with it, byte-identical to the tool repo's canonical `docs/site/skill.md`. It closes a real gap: nothing else serves an agent operating an installed tool from any repo, offline.

This page is the **producer-facing standard**: what your tool's `skill` bundle must be and how the subcommand must behave. It is a sibling of the [help-dump standard](help-dump.md) — where help-dump serves the *structure* of the command tree, `skill` serves the *usage knowledge* an agent needs to wield the tool well. Together with [readme-extraction](readme-extraction.md) they implement principles №3 and №10 of the [toolkit CLI principles](principles.md). Scope: **binary + repo** (the subcommand ships in the binary; the canonical bundle lives in the repo).

## The gap it fills

Three existing surfaces each fall short for an agent that just wants to *use* an installed tool:

- **`-h` / `help-dump`** is flag reference — the shape of every command, not when to reach for which, or how the tool composes.
- **README / `docs/site`** needs the repo checked out or a network round-trip to shll.ai.
- **`fab/project` context** is repo-*development*-scoped — it orients a contributor, not a caller.

A `<tool> skill` bundle is offline (embedded), present on every machine that has the tool, and **version-locked by construction**: the prose ships inside the same binary as the flags it describes, so it can never document a capability the installed binary lacks.

## Precedent: `run-kit context`

The toolkit's prior art is [`run-kit context`](https://github.com/sahil87/run-kit) (a.k.a. `rk context`) — roughly 102 lines of agent-optimized markdown that a harness loads to learn what run-kit can do. It proves the shape works. One nuance the `skill` genre draws a line on: `run-kit context` mixes **static** capability prose with a small **dynamic** Environment header (current session, pane, server URL) computed at invocation. The `skill` bundle is **static-only** — embedded, byte-identical across invocations, drift-guarded. Dynamic, environment-derived state stays in separate commands like `run-kit context`; a `skill` bundle never varies with where or when it runs.

## Deliberately not absorbed (agentskills.io)

The [agentskills.io Agent Skills specification](https://agentskills.io/specification) and this standard are **complementary, not converging**: the open spec governs the *placed*, harness-side `SKILL.md` format — which the one skill this standard's design places, the `shll-toolkit` bootstrap, conforms to (see [Landed design](#landed-design-shll-setup-agent)) — while the bundle genre stays binary-embedded and version-locked. The staleness problem placed files have is exactly what version-locking solves, so four of the open spec's features are deliberately NOT absorbed for bundles:

- **Their ~500-line budget** — ours is deliberately tighter (≤150): bundles are pulled per-conversation via `shll skill <tool>`, so every line taxes every conversation that pulls it.
- **Frontmatter on the bundles themselves** — bundles are stdout payloads, not placed files; there is no loader to read frontmatter.
- **The experimental `allowed-tools` field** — not applicable to a stdout payload.
- **The `scripts/`/`references/`/`assets/` folder conventions** — bundles defer executable behavior to the tool itself; the binary is the "script".

## Invocation contract

`<tool> skill` is uniform across every tool that adopts it:

- The command name is exactly `skill` — not `agent`, not `context` (see [Name rationale](#name-rationale)).
- Prints the bundle as **raw markdown to stdout**, byte-identical to the repo's canonical `docs/site/skill.md`.
- **stderr is empty on success**, and the exit code is **0**.
- No rendering, no pager, no added framing — the agent consumes the bytes directly (principle №2: stdout is data).

## Content: what belongs in the bundle

The bundle is a **usage briefing**, not a second README and not flag reference. Cover, in agent-first language:

- **When to use** — the situations this tool is the right reach for, and when it isn't.
- **Capabilities map** — the handful of things the tool does, one line each, keyed to the subcommand that does it.
- **Composition patterns** — how the tool plays with the rest of the toolkit (what it shells out to, what shells out to it) per principle №7.
- **Output & exit-code contracts** — stdout-vs-stderr split, `--json` availability, the exit-code convention (`0`/`1`/`2`) a caller branches on.
- **Gotchas** — the non-obvious traps an agent hits on first use.

Explicitly **out** of the bundle: exhaustive flag tables (defer to `-h`), full command trees (defer to `help-dump` and the [shll.ai commands page](https://shll.ai)), and installation prose (that is README / `docs/site/install.md`).

## Rules with teeth

- **Static only.** The bytes are identical on every invocation, on every machine, for a given release. No timestamps, no environment lookups, no session state (contrast `run-kit context`).
- **Bounded — ≤150 lines.** A hard budget, per principle №9. Agents pull a bundle into context at use time via `shll skill <tool>` (see [Landed design](#landed-design-shll-setup-agent)), and the bare `shll skill` glossary lists one line per installed tool; a bloated bundle taxes every conversation that pulls it. If it doesn't fit in 150 lines, it is trying to be a README — or it is a large-scope tool whose depth belongs in [topic pages](#topic-pages-large-scope-tools), never in a bigger core.
- **Byte-identical to the canonical file.** `<tool> skill` stdout MUST equal `docs/site/skill.md` byte-for-byte. The content is embedded at build time via a **sync + drift-guard** pattern — committed embedded copies, a sync script that refreshes them from the canonical `docs/site/` source, and a drift-guard test that fails the build when they diverge. This is the exact mechanism `shll standards` established for the standards documents; reuse it.
- **Enforced by failing tests, not review.** In each adopting repo, the ≤150-line budget (core bundle and every topic page) and the reserved [`skill topics` contract](#topic-pages-large-scope-tools) MUST be pinned by a test that fails on violation — extending the drift-guard test or adding a small conformance test both conform. The outcome (a failing test) is mandated; the mechanism is the repo's choice. Prose checklists drift between audits; tests don't.
- **Renders on the site for free.** Because `docs/site/skill.md` is part of the pulled `docs/site/**` tree, the bundle also renders at `/<tool>/skill` on shll.ai automatically — the same page an agent reads offline via `<tool> skill`.

## Topic pages (large-scope tools)

The ≤150-line budget prices the use-time pull — each `shll skill <tool>` serves exactly one core bundle (see [Landed design](#landed-design-shll-setup-agent)) — so it deliberately does not scale with tool size. A tool whose usage knowledge genuinely exceeds one page — run-kit and fab-kit are the expected cases — does not get a bigger budget; it splits depth into **topic pages**:

- **`<tool> skill <topic>`** prints one topic page (e.g. `rk skill windows`, `fab skill dispatch`) under the same invocation contract: raw markdown to stdout, stderr empty on success, exit 0.
- Each topic page is canonical at **`docs/site/skill/<topic>.md`** and independently bounded at ≤150 lines, with the same rules with teeth — static-only, byte-identical to its canonical file, embedded via the sync + drift-guard pattern. (The core stays `docs/site/skill.md`; the file and the `skill/` directory coexist, and each topic renders at `/<tool>/skill/<topic>` on shll.ai as part of the pulled tree.)
- The core bundle carries a **topic index** — one line per topic naming what it covers and the command that serves it — so depth is discovered from the core and pulled at use time by the agent that needs it.
- The `skill` subcommand's **help text MUST enumerate the shipped topic names** — e.g. a `Topics: code, display, mux, tutorial` line in the long help. The mandate is that the names appear; the exact format is illustrative, not prescribed. The enumeration is static by construction (topics are embedded at build time — no runtime lookups), and a core-bundle-only tool's help text is unaffected. This covers the surfaces a caller consults *before* paying the core bundle's context cost: `--help` is where you look first, and "Pass a topic" prose that names none is a blind spot.
- Bare `<tool> skill` never inlines topic pages, and the runtime two-step (`shll skill <tool>`) serves **core bundles only**, never topic pages — a tool's ambient context cost stays ≤150 lines no matter how many topics it ships.
- An unknown topic fails fast: non-zero exit, an error on stderr naming the valid topics — never a silent empty stdout.
- **Reserved topic `topics` — machine-readable enumeration (every adopting tool).** `<tool> skill topics` prints the tool's content-topic names, one per line, raw to stdout — stderr empty, exit 0. It is mandated for **all** tools adopting this standard, topic pages or not: a tool shipping zero topic pages prints empty stdout (zero bytes) and exits 0, so "what topics do you have?" always has a scriptable answer. The name `topics` is **reserved in every tool's topic namespace** — no tool may ship a content topic named `topics`. Ordering is left to the tool (matching the core bundle's topic index order is natural). The reserved name is a machine affordance defined by this standard, not a topic page: it has no canonical `docs/site/skill/topics.md`, no line budget, and it is not listed in the `Topics:` help line or the core bundle's topic index (those enumerate content topics only). The positional-reserved-topic form is deliberate — a `--list` flag was rejected because the shll composer (`shll skill <tool> <topic>`) forwards positional args verbatim, so `shll skill <tool> topics` composes with zero composer changes, where a flag would be intercepted by the composer's own flag parsing.
- **Sprawl guard.** Topics carry depth a caller reaches for deliberately — a subsystem's contract, a composition recipe — not a mirror of the command tree. A tool SHOULD ship a handful of topics at most; a topic page is still a briefing, and flag reference still defers to `-h` / `help-dump`.

## Name rationale

The subcommand is `skill`, deliberately not `agent`. `agent` was rejected: it collides with `fab agent` (which launches an agent *session*), it reads as an imperative ("run an agent") rather than "the tool's skill bundle", and run-kit's `agent-*` family already means harness wiring. `skill` is collision-free across all seven command trees and is the [anc.dev](https://anc.dev) P8 vocabulary — SKILL.md skill bundles — that agents already recognize.

## Adoption

Phased, per-repo — like help-dump's rollout was. This standard is the contract each repo conforms to as it adopts, on its own release cadence (no seven-repo flag-day). A tool that has not yet adopted is not in violation — principle №10 is a SHOULD, and the bundle is its most forward-leaning obligation. Topic pages are equally per-tool: a tool adds them when its bundle presses the budget, and a tool shipping only a core bundle is fully conformant.

## Landed design: `shll setup agent`

`shll setup agent` wires a machine's agent harnesses to the toolkit, graduating that responsibility up from `run-kit agent setup`. It ships today (renamed from the hidden-deprecated `shll agent-setup`), and it is recorded here because it is why bundles must stay small and static. It landed as **skills placement plus a runtime two-step**, not as context aggregation:

- **Skills placement, not context aggregation.** `shll setup agent` places one thin bootstrap Agent Skill (`shll-toolkit`) into the harnesses' global skills directories (`~/.agents/skills/` and `~/.claude/skills/`). The skill's description is roster-driven — it front-loads the tool names as trigger words so the skill activates when an agent is about to reach for a toolkit tool — and its body teaches the runtime two-step below. Aggregating every tool's bundle into the agent's context, and placing per-tool bundles as their own skill files, were both **rejected**: placed copies go stale between updates, and per-tool skills multiply listing lines.
- **The runtime two-step.** Bare `shll skill` prints an installed-only glossary — one line per tool. `shll skill <tool>` then streams that tool's core bundle on demand, byte-identical from the installed binary, so bundle content stays version-locked by construction and is fetched only when an agent actually needs it.
- **Hook-wiring delegation.** `shll setup agent` **delegates run-kit's dashboard-hook wiring to `run-kit agent setup`**, which is hook-only — its context-injection responsibility was removed as designed, leaving it to do only hook wiring.

### The placed skill conforms to the Agent Skills spec

The bootstrap skill is the one artifact this design places into harness-owned skills directories (`~/.agents/skills/`, `~/.claude/skills/`) — paths read by every [agentskills.io](https://agentskills.io/specification)-compatible client (Claude Code, Codex, Gemini CLI, Cursor, OpenCode, and any future adopter of the open standard). A placed file that violates that spec silently fails to load on some clients, so conformance is a requirement:

- **Valid YAML frontmatter** carrying the portable `name` + `description` fields.
- **Name rule**: 1–64 characters matching `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase alphanumeric + hyphens; no leading, trailing, or consecutive hyphens), equal to the skill directory name.
- **Description ≤1024 characters**, strictly — no exemption for roster-driven vocabulary.

Scope: only the **placed** skill is bound by agentskills.io. Bundles (`<tool> skill` stdout) are not placed files and are deliberately exempt (see [Deliberately not absorbed](#deliberately-not-absorbed-agentskillsio)).

### Description-writing rules (the activation contract)

The placed skill's `description` frontmatter is the only text in an agent's context *before* the skill is invoked — activation quality lives or dies there. The roster-driven description MUST be written as:

- **Tool names front-loaded** — every roster tool's name (and legacy alias, e.g. `run-kit/rk`) appears as trigger vocabulary.
- **Task-shaped trigger phrases, not just nouns** — each tool contributes a task-domain phrase ("git worktrees", "tmux sessions"): agents match task-shaped requests ("create a worktree"), not tool names alone.
- **What + when structure** — the description states what the skill does AND when to use it.
- **≤1024 characters** — the agentskills.io cap above, restated here because it is the binding budget on trigger vocabulary: compression prioritizes trigger coverage over prose completeness.
- **Triggers in the description; operations in the body** — the description carries activation vocabulary (what + when); operational/recipe prose belongs in the skill body, which is read at activation.

The mechanism changed from the original sketch, but the budget and static-only motive survives it: every `shll skill <tool>` call pulls the core bundle into a paying context, and the glossary lists every installed tool — so a bloated bundle still taxes every conversation that pulls it, which is the whole reason for the static-only rule and the ≤150-line budget above.

## Verifying conformance

Before shipping a change that touches your tool's `skill` bundle:

- `<tool> skill` exits 0, writes the bundle to stdout only, stderr empty.
- stdout is byte-identical to the repo's canonical `docs/site/skill.md` (a drift-guard test pins this).
- The bundle is ≤150 lines and carries no dynamic, environment-derived content.
- The bundle stays in genre — usage briefing, not a README clone or a flag table.
- `docs/site/skill.md` renders at `/<tool>/skill` on shll.ai (it is part of the pulled tree).
- If the tool ships topic pages: each `<tool> skill <topic>` meets the same contract (stdout-only, static, ≤150 lines, byte-identical to `docs/site/skill/<topic>.md`), the core's topic index lists every shipped topic, and an unknown topic exits non-zero with the valid topics on stderr.
- If the tool ships topic pages: the `skill` subcommand's help text names every shipped topic.
- `<tool> skill topics` prints the shipped topic names one per line, raw to stdout, stderr empty, exit 0 — empty output when the tool ships no topic pages (binds every adopting tool).
- No content topic is named `topics`.
- The ≤150-line budget and the `skill topics` contract are pinned by tests that fail on violation (see Rules with teeth) — not checklist-only items.
- If the tool places Agent Skills into harness skills directories (today: shll's `setup agent`): the placed skill validates against the agentskills.io spec — `skills-ref validate` (github.com/agentskills/agentskills) is the reference method; equivalent in-repo tests (frontmatter validity, the name rule, the ≤1024-char description) satisfy the intent where the validator is not practically installable in CI.
