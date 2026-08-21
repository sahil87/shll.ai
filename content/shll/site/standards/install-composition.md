# Standard: install-composition

How the [shll toolkit](https://shll.ai) composes at install time. Every tool installs as an independent tap formula, and [`shll install`](https://shll.ai) is the single composition point — it installs the full roster and accepts a subset. Nothing else expresses "these tools belong together": not a formula dependency edge, not a per-repo install snippet.

This page is the **producer-facing standard**, in two halves: **Policy A** — no inter-tool Homebrew dependencies; a sibling invoked at runtime is probed, never assumed — and **Policy B** — install documentation is centralized on shll.ai. It implements principles №7 (compose, don't reinvent — sibling capability is probed, never assumed via a package edge) and №8 (graceful degradation — a missing sibling is a skip with a hint, not a crash) of the [toolkit CLI principles](principles.md).

Scope is **binary + repo**. Policy A binds all **seven tap formulas** — including `shll`'s, whose formula must equally avoid sibling edges (the formula half lives in the tap repo) — and every binary that invokes a sibling. Policy B binds the **six roster-tool repos plus the tap README**; `shll`'s own README is out of Policy B's producer scope because it, together with shll.ai, *is* the centralized install documentation the policy points at — shll is the consumer here, exactly as in the [update](update.md) standard's scope carve-out.

## No inter-tool formula dependencies (Policy A)

- **Toolkit formulas MUST NOT declare `depends_on` on sibling toolkit formulas.**
- `shll install` is the composition point: it installs the full roster and accepts a subset. A formula edge duplicates that roster knowledge in the tap, forces lockstep installs (installing one tool drags in others the user didn't ask for), and complicates uninstalls (brew refuses to remove a dependency of an installed formula).

**Precedent.** `fab-kit` and `hop` previously declared `depends_on` on `wt`/`idea`; those edges are removed, and the `all` meta-formula is retired in favor of `shll install`.

## Probe siblings at runtime, degrade gracefully (Policy A, binary half)

A tool MAY invoke a sibling tool at runtime — composition is the toolkit's idiom (№7) — but with no formula edge, presence is never a package guarantee:

- **MUST probe before invoking**: `command -v <tool>` in shell and skill code, `exec.LookPath` in Go. Never assume a sibling is installed.
- **MUST degrade gracefully when the sibling is missing**: skip the sibling-dependent behavior and emit an actionable install hint — never crash. Example message, verbatim:

```
wt is not installed. Install it: brew install sahil87/tap/wt
```

**Failure mode.** An unprobed sibling call turns one tool's absence into another tool's crash — the whole toolkit becomes only as reliable as its least-installed member (№8's exact failure mode, at the inter-tool seam).

## Install documentation is centralized (Policy B)

- **Per-tool READMEs and the tap README MUST NOT carry per-formula `brew install` instructions.** They link to [https://shll.ai](https://shll.ai) for install steps — the curl bootstrap or `shll install`.
- **The supported-vs-unsupported line.** Individual formula installs remain **supported**: `brew install sahil87/tap/<tool>` works, and `shll install` accepts a subset. What is unsupported is **documenting** them per-repo — seven copies of the install dance drift, and every change to the install story (a tap-trust requirement, a bootstrap change) has to be chased across every repo plus the tap.

## Install runs the machine wiring in-process (the shll half)

`shll install` does not stop at brew: it ends by running the machine setup **in-process** (Go function calls into the same internals the CLI faces wrap — no subprocesses) at the end of every non-`--dry-run` install:

1. **The shell half** — the `eval "$(shll shell-init <shell>)"` block is appended to the rc file (sentinel-managed, idempotent).
2. **The agent half** — the `shll-toolkit` Agent Skill is placed at the harnesses' global skill paths, and run-kit's dashboard-hook wiring is delegated to `run-kit agent setup --yes` (`--yes` forwarded so nothing can prompt on an unattended `curl | sh` bootstrap).

Both steps are **best-effort**: a failure warns on stderr and prints the step's manual nudge, and never changes the install's exit code — a setup failure must not fail an install. Opt-outs: `--no-shell-setup` (dotfile-manager users) and `--no-agent-setup`.

**`shll setup` is the consolidated, re-runnable entry point** — the recovery path when a shell or an agent harness is added later, without re-running a brew-touching install. Bare `shll setup` runs both halves (both always run; the exit code is the worst of the two — unlike install's warn-and-continue), and `shll setup shell [shell]` / `shll setup agent` run one half each with the halves' full flag surfaces. All three are thin faces over the same internals `shll install` calls in-process. The pre-consolidation spellings `shll shell-setup` (alias `shll shell-install`) and `shll agent-setup` remain registered — hidden and silent — for one release cycle, because an older binary's end-of-`shll update` agent-skill refresh executes `shll agent-setup --yes` against the freshly upgraded binary across the release boundary.

This half documents shll's own behavior as the manager; it imposes no obligation on the six roster tools.

## Verifying conformance

Before shipping a change that touches your tap formula, a sibling invocation, or a README install section:

- The tool's tap formula declares no `depends_on` on a sibling toolkit formula.
- Every runtime sibling invocation sits behind a probe (`command -v` in shell/skill code, `exec.LookPath` in Go).
- Every missing-sibling path skips with an actionable install hint (`<tool> is not installed. Install it: brew install sahil87/tap/<tool>`), never a crash.
- The README's install section (and, for the tap, the tap README) links to https://shll.ai instead of carrying per-formula `brew install` lines.
