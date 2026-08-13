# Toolkit CLI principles

The ten principles every CLI in the [shll toolkit](https://shll.ai) is built against — `shll`, `hop`, `wt`, `tu`, `idea`, `run-kit`, and `fab`. They exist because these tools are operated at least as often by AI agents as by humans, and an agent cannot squint at ambiguous output, answer a surprise prompt, or guess what a tool meant.

Each principle is a testable contract: an **obligation** (MUST/SHOULD, in the [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) sense), a named **failure mode**, and an **enforcement receipt** — where the toolkit already implements or checks it. The receipt is what separates a standard from a wish list: a principle with no shipped mechanism behind it is marked as such.

The set builds on [anc.dev](https://anc.dev)'s eight principles for agent-native CLIs, adapted where the toolkit's experience disagreed — most notably the confirmation/automation reconciliation in №1 and №5, and idempotency in №6.

Seven companion standards make these principles concrete for every tool repo. Three cover documentation and help: [help-dump](help-dump.md) (the machine-readable help contract), [readme-extraction](readme-extraction.md) (README and `docs/site/` structure), and [skill](skill.md) (the offline, embedded `<tool> skill` agent bundle). Four cover how `shll` composes the toolkit: [update](update.md) (the in-place upgrade contract — prompt-free unconditionally, with the brew-handling safety rules), [version](version.md) (the `--version` shape shll probes), [shell-init](shell-init.md) (the eval-safe `shell-init` output shll concatenates), and [install-composition](install-composition.md) (no inter-tool formula dependencies, probed runtime siblings, install docs centralized on shll.ai).

| # | Principle | Obligation |
|---|-----------|------------|
| 1 | Non-interactive by default | MUST |
| 2 | stdout is data, stderr is diagnostics | MUST |
| 3 | Help is a published contract | MUST |
| 4 | Fail fast with actionable errors | MUST |
| 5 | Visible mutation boundaries | MUST |
| 6 | Stateless, therefore retry-safe | MUST |
| 7 | Compose, don't reinvent | MUST |
| 8 | Graceful degradation | MUST |
| 9 | Bounded, high-signal output | MUST |
| 10 | Agent-discoverable documentation | SHOULD |

## The contracts

The set is two-tiered. This page is the **foundation** — the principles every tool is built against. Below it sit the **mechanical contracts**: narrow, testable standards that make a specific principle concrete for every repo, each pinned by a shipped enforcement mechanism.

| Contract | Implements | Scope | What it standardizes |
|----------|-----------|-------|----------------------|
| [help-dump](help-dump.md) | №3 | binary | The JSON command tree every tool emits from `help-dump` |
| [readme-extraction](readme-extraction.md) | №10 | repo | README + `docs/site/` structure shll.ai pulls and renders |
| [skill](skill.md) | №3, №10 | binary + repo | The offline, embedded `<tool> skill` agent usage bundle |
| [update](update.md) | №7, №6, №1 | binary | The in-place `update` upgrade contract — prompt-free unconditionally (tightening №1 for this subcommand), the `--skip-brew-update` probe, and brew-handling safety rules |
| [version](version.md) | №4, №2 | binary | The `--version` shape shll probes — 2s budget, first-line token, name-equals-tool install probe |
| [shell-init](shell-init.md) | №2, №4 | binary | The eval-safe `shell-init` output shll concatenates into every shell |
| [install-composition](install-composition.md) | №7, №8 | binary + repo | No sibling `depends_on` between toolkit formulas; probed runtime siblings with install hints; install docs centralized on shll.ai |

**Scope** names where a contract lives: **binary** obligations are satisfied by the compiled tool at runtime; **repo** obligations are satisfied by the repo's file structure; **binary + repo** spans both (the `skill` bundle ships in the binary *and* is canonically a repo file). A tool conforms to a contract when both its scope halves are met.

## 1. Non-interactive by default

**Obligation (MUST).** Every command MUST be runnable end-to-end without a human at the keyboard. Where a confirmation is genuinely warranted (see №5), it MUST be satisfiable by a flag (`--yes`/`-y`), and when stdin is not a TTY the command MUST refuse with an error naming that flag — never block on a prompt that no one will answer.

**Failure mode.** An agent invokes the tool, an invisible prompt waits for input, and the operation hangs until it times out — the worst outcome, because nothing tells the caller *why*.

**Note on the confirmation tension.** "Always non-interactive" and "destructive writes need confirmation" contradict as absolutes. The reconciliation is exactly the contract above: interactive confirmation when a TTY is present, flag-based consent always available, and a fast refusal — not a hang — when neither is given.

**Enforced by.** `shll uninstall` is the reference implementation: `Proceed? [y/N]` on a TTY, `--yes`/`-y` for automation, refusal with the flag hint when stdin is not a TTY, and `--dry-run` requiring no consent at all.

## 2. stdout is data, stderr is diagnostics

**Obligation (MUST).** Data the caller asked for goes to stdout; status, progress, hints, and errors go to stderr. Commands whose output is meant to be consumed programmatically MUST offer a machine-readable format (`--json`). Machine formats MUST be stable: schema changes are versioned, and new fields are added as optional so consumers never break on upgrade.

**Failure mode.** Mixed streams force agents into regex extraction that breaks on the next wording change; an unversioned JSON shape breaks every cached parser the day it shifts.

**Enforced by.** The stream split is specified per-subcommand in each tool's CLI-surface spec (hop's is the template). `shll list`, `shll doctor`, and `wt list` carry `--json`. The extreme case is `shll shell-init`, whose stdout must be *eval-safe* — safe to pipe into a live shell — no matter which sub-tools are missing. Format stability is enforced by the [help-dump](help-dump.md) schema's evolution rule: `schema_version` is explicit and new fields land as optional.

## 3. Help is a published contract

**Obligation (MUST).** Help text is layered — a short summary at the top, concrete usage examples after the flags — so a reader can drill from "what is this" to "how do I invoke it" without a manual. And help is not just text on a terminal: every tool MUST expose a hidden `help-dump` subcommand that emits the full command tree as JSON, produced by programmatically walking the command tree (never by parsing `-h` output), per the [help-dump standard](help-dump.md). That dump is pulled by shll.ai and rendered as each tool's command reference — help text is a **release artifact**, fresh by construction.

**Failure mode.** Hand-maintained docs drift from the real CLI; agents learn commands that no longer exist.

**Enforced by.** `help-dump` conformance is pinned by tests in each tool repo (byte-for-byte fidelity against real `-h` output in shll), and shll.ai validates every pulled dump against a Zod schema before rendering. Beyond the machine tree, the [skill standard](skill.md) defines a one-page `<tool> skill` bundle — the agent-facing *usage* contract, embedded in the binary and versioned with it — as the human-readable companion to `help-dump`'s structure.

## 4. Fail fast with actionable errors

**Obligation (MUST).** Detect invalid state early and exit non-zero with three things: what failed, why, and what to do next. Exit codes are documented per subcommand and mean something — `0` success, `1` operational failure, `2` usage error is the toolkit convention. Aggregating commands define their aggregation rule explicitly (worst check wins; any failure → exit 1).

**Failure mode.** "Operation failed" gives an agent nothing to branch on; an undocumented exit code turns every script's error handling into guesswork.

**Enforced by.** Per-subcommand exit-code tables in each tool's CLI-surface spec; the shared `errSilent`/`errExitCode` sentinel pattern (exit codes without double-printed messages); `shll doctor`'s worst-check-wins markers and any-FAIL→exit-1 rule.

## 5. Visible mutation boundaries

**Obligation (MUST).** Whether a command reads or writes MUST be clear from its name and help alone. Destructive writes MUST support `--dry-run` (an accurate preview, sharing the real code path — a dry-run that drifts from the live path is worse than none) and MUST require explicit consent per №1's contract.

**Failure mode.** An agent that cannot tell a safe read from a dangerous write either avoids the tool or mutates blindly — both are failures.

**Enforced by.** `shll uninstall --dry-run` previews with the same single-sourced command builder the live run executes (`brewUninstallArgv` threads into both); `shll doctor` is read-only by contract.

## 6. Stateless, therefore retry-safe

**Obligation (MUST).** Tools re-derive state at request time instead of caching it, and commands are idempotent: re-running after a partial failure converges instead of double-applying. Agents retry on error as a reflex — the toolkit's answer is that retrying is always safe, which no `--dry-run` flag can substitute for.

**Failure mode.** A cached state file goes stale and every subsequent run acts on a world that no longer exists; a non-idempotent command applied twice corrupts what it managed.

**Enforced by.** shll's constitution makes statelessness non-negotiable (no database, no state files; versions come from `brew list`, shell-init from the sub-tools, at every invocation). `shll install` and `shll shell-setup` are idempotent by contract — re-running installs only what's missing, the rc-file block is sentinel-wrapped and written once.

## 7. Compose, don't reinvent

**Obligation (MUST).** When one tool integrates with another, it shells out to the other tool's CLI — it never reimplements or reaches into the other tool's internals. Capability differences are negotiated by **advertised flags, probed not assumed**: the caller checks the callee's `--help` for the capability before using it, so old and new versions coexist without a flag-day. Every tool remains fully usable standalone.

**Failure mode.** Duplicated logic drifts; a hardcoded capability assumption breaks the moment one tool in the fleet is a version behind.

**Enforced by.** shll's constitution (wrap `brew`, never parse formulas; delegate to each tool's own `update`/`shell-init`). The probe pattern is live in `shll update`: it passes `--skip-brew-update` only to tools whose `update --help` advertises it. `hop ls --trees` composes `wt list --json` rather than reading wt's data.

## 8. Graceful degradation

**Obligation (MUST).** A missing optional dependency is a skip, not an error: absent sub-tools are omitted from composition, reported as `not installed`, never a crash. Output degrades with its environment — color is TTY-gated, box-drawing falls back to ASCII, and informational extras (release notes, digests) degrade to a typed "unavailable" result without failing the operation that carried them.

**Failure mode.** A tool that errors on a missing peer makes the whole toolkit only as reliable as its least-installed member.

**Enforced by.** shll's constitution (Principle V) and its enforcement in review: `shll shell-init` output must stay eval-safe regardless of which sub-tools exist. `shll changelog`'s fetch layer returns a typed `Unavailable` result and always exits 0 — a missing release feed never fails an update.

## 9. Bounded, high-signal output

**Obligation (MUST).** Output volume has mechanisms of control: unbounded surfaces carry explicit caps, and what survives `--quiet` is the data and the errors — never progress, decoration, or chatter. Agent context windows are finite; a tool that dumps ten thousand unfiltered lines taxes every conversation that invokes it.

**Failure mode.** One verbose invocation evicts the context an agent needed to act on the result.

**Enforced by.** `shll changelog` caps at 10 releases per tool with an explicit notice when truncated; `shll update` prints per-tool sections with a summary tail rather than raw brew output. Where a surface is capped, the cap is stated in the output — silent truncation reads as completeness.

## 10. Agent-discoverable documentation

**Obligation (SHOULD).** A fresh agent in a tool's repo — or using its binary — should not have to rediscover the toolkit's idioms from `--help` round-trips. Each repo publishes its documentation through filesystem convention: a README structured for mechanical extraction and a `docs/site/` tree of depth pages, per the [readme-extraction standard](readme-extraction.md), both pulled and rendered on shll.ai without hand-copying. Any agent entry file (`CLAUDE.md`/`AGENTS.md`) a repo ships points at these standards rather than restating them — an anti-drift rule, not an existence requirement; no repo is obliged to carry one. And an agent *using* an installed tool — from any repo, offline — SHOULD be able to read a one-page usage bundle via `<tool> skill`, per the [skill standard](skill.md) (SHOULD, phased per-repo).

**Failure mode.** Every agent session starts from zero: pull `--help`, infer, try, parse the error, try again — a loop paid on every invocation, forever.

**Enforced by.** The shll.ai pull pipeline is live for all seven tools (daily, mirror-and-prune), with report-only lints that flag structural violations in CI. This is the toolkit's weakest principle today by design — SHOULD, not MUST — because per-repo skill bundles are still being rolled out.

## Consuming these standards

This page and its seven companion standards ([help-dump](help-dump.md), [readme-extraction](readme-extraction.md), [skill](skill.md), [update](update.md), [version](version.md), [shell-init](shell-init.md), [install-composition](install-composition.md)) are canonical here, in the [shll repo](https://github.com/sahil87/shll)'s `docs/site/standards/` tree, and render on [shll.ai](https://shll.ai) at `/shll/standards/…`. The implementation-anchored consumer contracts (schemas, extraction code, pull workflows) live in the [shll.ai repo's specs](https://github.com/sahil87/shll.ai/tree/main/docs/specs) and link back here.
