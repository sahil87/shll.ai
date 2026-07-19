# Standard: help-dump

The machine-readable help contract for every CLI in the [shll toolkit](https://shll.ai). Each tool exposes a hidden `help-dump` subcommand that emits its full command tree as JSON; [shll.ai](https://shll.ai) pulls that output on a schedule and renders it as the tool's command reference. Help text is a release artifact, fresh by construction — nothing is hand-copied, and the tool pushes nothing.

This page is the **producer-facing standard**: what your tool must emit. The consumer side — capture, `captured_at` stamping, Zod validation, rendering — is shll.ai's job, specified with its machine-checkable schema anchor in the [shll.ai help-dump contract](https://github.com/sahil87/shll.ai/blob/main/docs/specs/help-dump-contract.md). A tool author's entire obligation is keeping `help-dump` conformant to this page.

This standard implements principle №3 of the [toolkit CLI principles](principles.md).

## Invocation contract

`<tool> help-dump` is uniform across all seven tools:

- Emits a single JSON envelope to **stdout**.
- **stderr is empty on success**, and the exit code is **0**.
- A non-zero exit is a hard error — the puller treats it as a failed capture and keeps the last-good published reference (it never commits a regression).

## Hidden, and self-filtering

`help-dump` MUST be declared hidden (Cobra `Hidden: true`) so it never appears in the tool's own `-h`. Because the emitted tree drops every hidden node (see filter rules), `help-dump` never appears in its own output either — no special case needed.

## Output shape

The tool emits an envelope wrapping a recursive node tree:

```jsonc
{
  "tool": "wt",           // invoked binary name (wt, run-kit, fab)
  "version": "1.4.2",     // from the built binary (ldflags / rootCmd.Version) — never hardcoded
  "schema_version": 1,    // integer; current = 1
  "root": { /* recursive Node */ }
}
```

```jsonc
{
  "name": "create",          // command name at this level
  "aliases": ["mk"],         // optional; registered alias names — key omitted entirely when none
  "path": "wt create",       // full invocation path
  "short": "…",              // one-line description
  "usage": "wt create […]",  // usage line
  "text": "…",               // raw -h output for this command, byte-for-byte
  "commands": []             // Node[], recursive; empty array = leaf
}
```

Two rules with teeth:

- **Do not emit `captured_at`.** The capture timestamp is owned by shll.ai — a tool cannot know its own capture time. The puller stamps it after capture.
- **Every node carries both** the raw `text` and the structured `short`/`usage`/`path`. The redundancy is intentional: the structured fields let the site render trees and headers without re-parsing text; `text` stays the terminal-faithful authority.

`aliases` is an **optional additive field** under `schema_version: 1` (per [Schema evolution](#schema-evolution)): producers SHOULD emit it when the framework exposes alias metadata (e.g. Cobra `cmd.Aliases`) and MUST omit the key entirely — never `[]` or `null` — for a command with no aliases; consumers MUST treat an alias-form invocation (the `path` with its `name` replaced by any listed alias) as a valid command. Tools adopt it on their own release cadence — no flag-day, no `schema_version` bump.

## Filter rules

When walking the command tree, drop:

1. the auto-generated `completion` subcommand,
2. the auto-generated `help` subcommand,
3. any hidden node — which includes `help-dump` itself.

## Discovery: walk, never parse

The tree MUST be discovered programmatically — walking the live command tree (`rootCmd.Commands()` in Cobra) recursively to full depth. **Never regex-parse `-h` text for structure.** The `-h` text is captured verbatim into each node's `text` field, but it is never the source of the tree's shape. This is what makes the dump drift-proof: it reads the same data model `-h` renders from.

## The `tu` exception

`tu` is Node/TS and flag-based with no subcommands. Its `help-dump` emits a flat tree — `root.commands: []` with the full `tu --help` output in `root.text`. Every other tool is Cobra/Go and emits the full recursive tree.

## Schema evolution

`schema_version` is currently the integer `1`. When the schema evolves, new fields MUST be added as **optional**, so each tool adopts them on its own release cadence — no seven-repo flag-day, and older captures keep validating.

## Verifying conformance

Before shipping a change that touches the command tree:

- `<tool> help-dump` exits 0, writes valid JSON to stdout only, stderr empty.
- The envelope is `{tool, version, schema_version, root}` — no `captured_at`.
- `completion`, `help`, and all hidden commands are absent from the tree.
- `version` reflects the built binary, not a literal.
- Keep (or add) a minimal test pinning the above — exit 0, valid JSON, expected `tool`/`schema_version` — so the contract surface stays protected.
