# Standard: version

How every binary in the [shll toolkit](https://shll.ai) reports its own version. `<tool> --version` is the one probe shll runs to answer three questions at once: what version is installed, is the tool healthy, and — because the probe doubles as an install check — is the tool installed at all. [shll](https://shll.ai) parses it under a tight timeout with a first-line-only token scan, so the output shape is a contract, not a courtesy.

This page is the **producer-facing standard**: what your `--version` must emit. The consumer side — `shll version`'s aligned table, `shll doctor`'s health check, and the shared install probe — is shll's job and lives in its own memory. A tool author's entire obligation is keeping `--version` conformant to this page.

Scope is **all seven binaries** — the six roster tools (`wt`, `idea`, `tu`, `run-kit`, `hop`, `fab-kit`) **and `shll` itself**. Unlike `update` and `shell-init`, shll is a producer here too: `shll version` prints its own row — read from the version string linked into the binary at build time (via `-ldflags`) and run through the exact same first-line parse this page requires of everyone else — so shll holds itself to the shape it enforces on the tools it probes.

This standard implements principle №4 of the [toolkit CLI principles](principles.md) (fail fast with actionable errors — an unparseable or slow `--version` makes a healthy tool read as broken or absent), and its stdout discipline serves principle №2 (stdout is data).

## Invocation contract

`<tool> --version` is uniform across all seven binaries:

- **MUST support `--version`** and **exit `0`**.
- Writes the version to **stdout** (it is data — principle №2).

## Respond within 2 seconds

`shll version`, `shll doctor`, and the shared install probe run `<tool> --version` under a **2-second timeout** (`versionTimeout`), and the worst case for `shll version` is `len(roster) × versionTimeout` — so a slow tool taxes the whole table.

- **MUST respond within 2 seconds.** This is a hard consumer bound: exceed it and shll's probe kills the call. In `shll version` and the shared install probe that collapses to **not installed** — the same row as a missing binary. `shll doctor` keeps the two apart: a timeout is an **unreportable** tool (installed but `--version` failed), distinct from a genuinely missing binary — see the failure mode below.
- **This implies no network I/O on the version path.** A `--version` that phones home (checks for updates, resolves a remote manifest) will intermittently blow the 2-second budget on a slow network and flap between "installed" and "not installed" across runs. The version path MUST be purely local.

## The version is on the first non-empty line

shll parses the version by scanning the **first non-empty line only** and never looks past it:

- **The version token MUST appear on the first non-empty line** of output, as either:
  - a bare token matching `v?\d+(\.\d+)*([.-][\w.+-]+)?` (an optional leading `v`, at least one numeric component, optional dotted components, optional `[.-]<suffix>` for pre-release / build metadata) — shll's `versionTokenRE`; or
  - a line of the shape `<word> version <rest>` (`version` case-insensitive), from which shll takes `<rest>` — shll's `versionPrefixRE`.
- **A banner-first layout is non-conformant.** The parser does not scan past line 1, so an ASCII-art banner, a copyright line, or a "checking for updates…" notice printed *above* the version breaks the parse — shll reads that first line as the version. If it holds no version token and isn't a `<word> version <rest>` line, shll falls back to the trimmed first line **verbatim**, so `shll version` prints the banner text where the version belongs.
- **RECOMMENDED canonical shape: `<tool> version vX.Y.Z`** — cobra's stable default form, which satisfies both the prefix and token rules and is exactly what fab-kit's self-update post-check parses (last whitespace field, strip a leading `v`).

**Failure mode.** A version buried below a banner, or emitted with decorative framing, makes `shll version` print the wrong first line in the tool's row. And if the version path errors, times out, or emits nothing on the first line at all, `shll doctor` flags an otherwise-healthy tool as **unreportable** ("installed but `--version` failed").

## The binary name on PATH equals the tool name

The version probe is also shll's **install-mechanism-agnostic install probe**: shll runs `<tool> --version` by the tool's name, and a `proc.ErrNotFound` (binary not on `PATH` under that name) is how shll concludes "not installed" — without querying brew, a package DB, or anything install-mechanism-specific.

- **The binary name on `PATH` MUST equal the tool name** shll knows the tool by (the same one-string identity the [update standard](update.md) requires across repo / formula / binary). A differently-named binary reads as **not installed** everywhere — `shll version`, `shll doctor`, and every install check — even when it is present and healthy.

The one sanctioned exception is a **rename in flight**: when a tool declares a legacy name (the `rk` → `run-kit` precedent), shll retries the probe under the old binary name if the new one is absent from `PATH`, so a pre-rename install still reads as installed. This is transitional migration-guard machinery, not a licence for a lasting name mismatch — see the [update standard](update.md)'s `formula_renames.json` rule.

## Verifying conformance

Before shipping a change that touches `--version`:

- `<tool> --version` exits `0` and writes the version to stdout.
- It returns in well under 2 seconds with the network unplugged (no network I/O on the version path).
- The version token is on the **first non-empty line** — no banner, copyright, or update-check line above it — and matches the token regex or the `<word> version <rest>` prefix shape (the RECOMMENDED `<tool> version vX.Y.Z` satisfies both).
- The binary's name on `PATH` is exactly the tool name (== repo == formula leaf).
- Keep (or add) a minimal test pinning the above — exit 0, version on line 1, matches the shape — so the contract stays protected.
