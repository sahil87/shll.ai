# conventions

Recurring shapes and patterns that span multiple files.

| File | Description | Last Updated |
|------|-------------|--------------|
| [tool-page-rubric](./tool-page-rubric.md) | The shape of every tool page, incl. the per-tool GitHub affordance, `.md`→`.mdx` overviews, the enriched generated command reference + cross-tool index, and the pulled-README-slice exception (deep synced prose/screenshots/diagrams, constitution v2.1.0 Tool-Page Depth) | 2026-06-04 |
| [help-collection](./help-collection.md) | The `help/<tool>.json` consume/pull side: Zod anchor, `help/` collector, rendering consumer (build-time `parseHelp` structured render + cross-tool index), the scheduled brew + `help-dump` pull refresh (forward contract in `docs/specs/help-dump-contract.md`), the rule that site prose must not contradict it, and the sibling README-pull consumer | 2026-06-04 |
| [readme-extraction](./readme-extraction.md) | The README consume/pull side (sibling of help-collection): deduction rules (head/tail/strips) in `extract-readme.ts`, the `content/<slug>/` collector, `ReadmeSlice.astro` build-time render injected into overviews, the `scheduled-readme-refresh.yml` daily pull, the `vn39` gate, and the `@astrojs/markdown-remark` reconciliation (forward contract in `docs/specs/readme-extraction-contract.md`) | 2026-06-04 |
