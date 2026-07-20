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

## Verifying conformance

Before shipping a change that touches your tap formula, a sibling invocation, or a README install section:

- The tool's tap formula declares no `depends_on` on a sibling toolkit formula.
- Every runtime sibling invocation sits behind a probe (`command -v` in shell/skill code, `exec.LookPath` in Go).
- Every missing-sibling path skips with an actionable install hint (`<tool> is not installed. Install it: brew install sahil87/tap/<tool>`), never a crash.
- The README's install section (and, for the tap, the tap README) links to https://shll.ai instead of carrying per-formula `brew install` lines.
