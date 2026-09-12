# shll.ai Constitution

## Core Principles

### I. Static-First, Zero Runtime
The stub MUST be generated entirely at build time from hexokit.com endpoints — no server endpoints, no runtime data fetching for primary content. Rationale: deployment is GitHub Pages (see `.github/workflows/deploy.yml`), which serves static assets only. Build-time fetches are permitted and fail closed; any feature requiring a server SHALL be rejected or redesigned around build-time data.

### II. Redirect Host
Every URL shll.ai ever served MUST land on its final hexokit.com page via the X1 redirect map (`https://hexokit.com/shll-ai-redirects.json`) — one stub per enumerated key, plus the `404.html` catch-all applying the map's rules. `/install` and `/versions.json` MUST be served as byte copies of hexokit.com's files, never redirects — they are baked into shipped `shll` binaries (rebrand decision D4), and a meta-refresh page at `/install` would feed HTML to `sh`. The build MUST fail closed: any fetch or validation failure stops the build before output is written, so the last-good deployment stays live and the endpoints never lapse (D13). Rationale: shll.ai is linked from READMEs, profiles, search results, and shipped binaries — a URL that 404s or an endpoint that returns HTML is the exact failure this site exists to prevent.

### III. Deploy via CI, Never Manually
Deployments to GitHub Pages MUST go through the `.github/workflows/` pipeline. Permitted triggers: push to `main`, manual `workflow_dispatch`, and the daily `schedule` that keeps the byte copies fresh. `dist/` directories at any depth SHALL NOT be committed (they are gitignored). Rationale: manual deploys diverge from source; CI is the single source of truth for what is live.

### IV. Dark Mode Parity
Every visible UI element in any deployed page MUST render correctly in both light and dark modes. Rationale: visitors arrive from terminal-heavy contexts where dark is the default expectation. The stub pages satisfy this with `color-scheme: light dark` — the value is parity, not the mechanism.

### V. Minimal Dependencies
The stub generator MUST have zero runtime and zero npm dependencies — Node built-ins only. No `package.json`, no lockfile, no `node_modules`. Rationale: the output is a few hundred identical three-line HTML stubs and a handful of byte copies; a framework and its toolchain would exist to render content this repo no longer has.

## Additional Constraints

### Accessibility
Interactive elements (links, toggles, form controls) MUST be keyboard-navigable and have visible focus states. Color contrast SHALL meet WCAG AA in both themes. This applies to the stub pages' visible links.

### Test Integrity
Tests MUST conform to the implementation spec — never the other way around. When tests fail, the fix SHALL either (a) update the tests to match the spec, or (b) update the implementation to match the spec. Modifying implementation code solely to accommodate test fixtures or test infrastructure is prohibited. Specs are the source of truth; tests verify conformance to specs.

## Governance

**Version**: 3.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-09-12

### Changelog

- **3.0.0 (2026-09-12)**: Rewritten for the redirect host (change `sn0a`, HexoKit rebrand plan `fab/plans/sahil/26-09-10-hexokit-rebrand.md` row X2) — a MAJOR: the multi-site design exploration no longer exists. Principle I Static-First kept (rephrased: the stub is generated at build time from hexokit.com endpoints). Principles II Multi-Site Isolation and III One Live Site replaced by a single **II Redirect Host** (every URL shll.ai ever served MUST land on its final hexokit.com page via the X1 map; `/install` and `/versions.json` MUST be byte copies, never redirects; the build MUST fail closed so the site never lapses — D4/D13). Deploy via CI kept (daily schedule now a permitted trigger). Dark Mode Parity kept (satisfied by `color-scheme`). Minimal Dependencies tightened to zero runtime and zero npm dependencies (Node built-ins only). Tool-Page Depth and External Links constraints removed (no pages, no outbound links to keep accurate). Accessibility and Test Integrity kept.
- **2.1.3 (2026-07-16)**: Extended the **Tool-Page Depth** constraint (change `moju`) — a PATCH; the deep-synced-content principle and the six core principles (I–VI) are unchanged, only the scope note gains a third permitted content class. Beyond the two *mechanically-synced* classes (the pulled README slice and the pulled `docs/site/**/*.md` tree), a tool's `overview.mdx` MAY now host **site-owned curated screenshots** — committed `public/screenshots/<tool>-*.webp` assets, hand-captured and hand-placed on the overview's `## Screenshots` section. This is the one hand-placed class exempt from the mechanical-sync requirement, justified narrowly: a screenshot is a curated visual capture versioned in-repo, not command/flag prose, so the command-drift the sync rule guards against does not apply; its only staleness risk is visual and acceptable for marketing framing. They MUST carry alt text (Accessibility), SHOULD be `.webp`, and remain distinct from synced README imagery (which keeps flowing to the `readme` page mechanically). The amendment **retroactively legitimizes the two run-kit screenshots added by PR #82** (`public/screenshots/run-kit-{agent-session,console}.webp`), previously hand-placed outside the letter of the constraint.
- **2.1.2 (2026-06-07)**: Updated the **Tool-Page Depth** constraint (change `x0br`) — a PATCH; the deep-synced-content principle is unchanged, only its scope note is brought current. The `docs/site/*.md` source, previously marked "RESERVED and not yet implemented," is now **active**: each tool's `docs/site/**/*.md` documentation tree is mechanically pulled and rendered as separate per-page routes under `/tools/<tool>/<path>`, alongside the README slice (see `docs/specs/readme-extraction-contract.md` §9, the active closed-set model). No principle text changes; the six core principles (I–VI) are unchanged.
- **2.1.1 (2026-06-04)**: Reframed the **Tool-Page Depth** constraint (change `4s3e`) — a PATCH; the deep-synced-content principle is unchanged, only the gate behavior and page placement change. The `help/<tool>.json` cross-check for **pulled README prose** is now a **non-fatal reporter** (CI `::warning::`), not a blocking publish gate: the tool repo's README is canonical and is committed/rendered verbatim even on divergence (the `vn39` rule stays a hard rule only for *hand-written* site prose). The pulled slice now renders on a **parallel per-tool `readme` page** (sibling of `commands`), not injected into `overview.mdx`; each `overview.mdx` is thinned back to a directory entry (GithubButton + 1–2 sentence framing + nav links), with long-form depth's canonical home being the tool's README.
- **2.1.0 (2026-06-04)**: Added the **Tool-Page Depth** constraint (change `w32m`). Revises the prior "site is a thin directory / link out for depth / no screenshots" stance: tool pages MAY now host deep per-tool prose, referenced screenshots, and rendered diagrams — *provided* the content is mechanically synced from the canonical tool repo (the README slice today; a `docs/site/` source is reserved/future, not yet implemented), never hand-copied, and passes the `vn39` command/flag validation gate. The six core principles (I–VI) are unchanged; the anti-drift value behind the old stance is preserved and made explicit (single-source + mechanical sync, not thinness).
- **2.0.0 (2026-05-18)**: Restructured for multi-site exploration. Removed stack-specific principles (Content collections, Tailwind-only, mermaid mechanism). Added Multi-Site Isolation and One Live Site at a Time. Reframed Dark Mode Parity as value-oriented, not mechanism-bound.
- **1.0.0 (2026-05-17)**: Initial ratification.
