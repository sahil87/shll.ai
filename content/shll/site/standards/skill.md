# Standard: skill

The agent skill-bundle contract for every CLI in the [@sahil87 toolkit](https://shll.ai). Each tool exposes a `<tool> skill` subcommand that prints a stable, one-page markdown **skill bundle** for the agent *using* the tool — embedded in the binary, versioned with it, byte-identical to the tool repo's canonical `docs/site/skill.md`. It closes a real gap: nothing else serves an agent operating an installed tool from any repo, offline.

This page is the **producer-facing standard**: what your tool's `skill` bundle must be and how the subcommand must behave. It is a sibling of the [help-dump standard](help-dump.md) — where help-dump serves the *structure* of the command tree, `skill` serves the *usage knowledge* an agent needs to wield the tool well. Together with [readme-extraction](readme-extraction.md) they implement principles №3 and №10 of the [toolkit CLI principles](principles.md). Scope: **binary + repo** (the subcommand ships in the binary; the canonical bundle lives in the repo).

## The gap it fills

Three existing surfaces each fall short for an agent that just wants to *use* an installed tool:

- **`-h` / `help-dump`** is flag reference — the shape of every command, not when to reach for which, or how the tool composes.
- **README / `docs/site`** needs the repo checked out or a network round-trip to shll.ai.
- **`fab/project` context** is repo-*development*-scoped — it orients a contributor, not a caller.

A `<tool> skill` bundle is offline (embedded), present on every machine that has the tool, and **version-locked by construction**: the prose ships inside the same binary as the flags it describes, so it can never document a capability the installed binary lacks.

## Precedent: `run-kit context`

The toolkit's prior art is [`run-kit context`](https://github.com/sahil87/run-kit) (a.k.a. `rk context`) — roughly 102 lines of agent-optimized markdown that a harness loads to learn what run-kit can do. It proves the shape works. One nuance the `skill` genre draws a line on: `run-kit context` mixes **static** capability prose with a small **dynamic** Environment header (current session, pane, server URL) computed at invocation. The `skill` bundle is **static-only** — embedded, byte-identical across invocations, drift-guarded. Dynamic, environment-derived state stays in separate commands like `run-kit context`; a `skill` bundle never varies with where or when it runs.

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
- **Bounded — ≤150 lines.** A hard budget, per principle №9. Agents load this bundle into context every session, and bundles will later be **aggregated** across every installed tool (see [Forward design](#forward-design-shll-agent-setup)); a bloated bundle taxes every conversation that pays for it. If it doesn't fit in 150 lines, it is trying to be a README.
- **Byte-identical to the canonical file.** `<tool> skill` stdout MUST equal `docs/site/skill.md` byte-for-byte. The content is embedded at build time via a **sync + drift-guard** pattern — committed embedded copies, a sync script that refreshes them from the canonical `docs/site/` source, and a drift-guard test that fails the build when they diverge. This is the exact mechanism `shll standards` established for the standards documents; reuse it.
- **Renders on the site for free.** Because `docs/site/skill.md` is part of the pulled `docs/site/**` tree, the bundle also renders at `/<tool>/skill` on shll.ai automatically — the same page an agent reads offline via `<tool> skill`.

## Name rationale

The subcommand is `skill`, deliberately not `agent`. `agent` was rejected: it collides with `fab agent` (which launches an agent *session*), it reads as an imperative ("run an agent") rather than "the tool's skill bundle", and run-kit's `agent-*` family already means harness wiring. `skill` is collision-free across all seven command trees and is the [anc.dev](https://anc.dev) P8 vocabulary — SKILL.md skill bundles — that agents already recognize.

## Adoption

Phased, per-repo — like help-dump's rollout was. **No tool ships `skill` today**; this standard is the contract each repo conforms to as it adopts, on its own release cadence (no seven-repo flag-day). A tool without a `skill` subcommand is not yet in violation — principle №10 is a SHOULD, and the bundle is its most forward-leaning obligation.

## Forward design: `shll agent-setup`

*(Planned, not yet built — recorded here because it is why bundles must stay small and static.)* A future `shll agent-setup` will graduate from `run-kit agent-setup`: it will **aggregate every installed tool's `<tool> skill` output** into the agent's context, and **delegate run-kit hook installation to `run-kit agent-setup`** (whose context-injection responsibility will be removed, leaving it to do only hook wiring). When N bundles are concatenated into one context payload, every wasted line is paid N times — which is the whole reason for the static-only rule and the ≤150-line budget above.

## Verifying conformance

Before shipping a change that touches your tool's `skill` bundle:

- `<tool> skill` exits 0, writes the bundle to stdout only, stderr empty.
- stdout is byte-identical to the repo's canonical `docs/site/skill.md` (a drift-guard test pins this).
- The bundle is ≤150 lines and carries no dynamic, environment-derived content.
- The bundle stays in genre — usage briefing, not a README clone or a flag table.
- `docs/site/skill.md` renders at `/<tool>/skill` on shll.ai (it is part of the pulled tree).
