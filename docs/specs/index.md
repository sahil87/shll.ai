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
