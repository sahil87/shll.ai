# Specifications Index

> **Specs are pre-implementation artifacts** — what you *planned*. They capture conceptual design
> intent, high-level decisions, and the "why" behind features. Specs are human-curated,
> flat in structure, and deliberately size-controlled for quick reading.
>
> Contrast with [`docs/memory/index.md`](../memory/index.md): memory files are *post-implementation* —
> what actually happened. Memory files are the authoritative source of truth for system behavior,
> maintained by `/fab-continue` (hydrate).
>
> **Ownership**: Specs are written and maintained by humans. No automated tooling creates or
> enforces structure here — organize files however makes sense for your project.

| Spec | Description |
|------|-------------|
| [help-dump-contract](./help-dump-contract.md) | The forward contract for what each toolkit CLI's `help-dump` MUST emit — invocation, output schema (envelope + recursive Node, the `captured_at` asymmetry), filter/discovery rules, the `tu` exception, schema evolution, and the dated push→pull migration. Consumed by `docs/memory/conventions/help-collection.md`; machine-anchored to `schemas.ts`. |
| [readme-extraction-contract](./readme-extraction-contract.md) | The forward contract for how each toolkit CLI's `README.md` and `docs/site/` tree MUST be structured so shll.ai can pull a deduced, curated README slice plus a multi-page docs tree and render them on the tool pages — head rule (skip H1/blockquote/badges), tail rule (denylist; `Install` included), image (all-absolute) / dark-theme / mermaid rules, the **active** `docs/site/` closed-set model (closure + two link-resolution transforms + report-only closure lint), and the `vn39` divergence reporter. The README-prose sibling of `help-dump-contract`; machine-anchored to `src/lib/extract-readme.ts`. |
