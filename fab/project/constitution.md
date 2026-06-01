# shll.ai Constitution

## Core Principles

### I. Static-First, Zero Runtime
Every site under `sites/` MUST build to fully static output — no SSR adapters, no server endpoints, no client-side data fetching for primary content. Rationale: deployment is GitHub Pages (see `.github/workflows/deploy.yml`), which serves static assets only. Any feature requiring a server SHALL be rejected or redesigned around build-time data.

### II. Multi-Site Isolation
Each website variant lives under `sites/<name>/` and owns its own stack, dependencies, and conventions. Sites MUST NOT share `node_modules`, lockfiles, or configuration at the repo root. Cross-site sharing (shared components, content, assets) MUST be explicit and justified. Rationale: this repo's purpose is parallel exploration of website designs — isolation lets experiments fail freely without polluting the live build.

### III. One Live Site at a Time
The live shll.ai build is selected by a single `SITE_DIR` value in `.github/workflows/deploy.yml`. Swapping which site is live SHALL be a one-line PR. Experiments under `sites/_playground/` MUST NOT be deployed. Rationale: a single, explicit source of truth for "what is live" — no ambiguity, no symlink games.

### IV. Deploy via CI, Never Manually
Deployments to GitHub Pages MUST go through the `.github/workflows/` pipeline on push to `main`. `dist/` directories at any depth SHALL NOT be committed (they are gitignored). Rationale: manual deploys diverge from source; CI is the single source of truth for what is live.

### V. Dark Mode Parity
Every visible UI element in any deployed site MUST render correctly in both light and dark modes. Rationale: visitors arrive from terminal-heavy contexts where dark is the default expectation. Per-site implementation (CSS variables, Tailwind variants, framework-native theming) is unconstrained — the value is parity, not the mechanism.

### VI. Minimal Dependencies
New runtime or build dependencies — in any site — MUST be justified against a concrete page-visible need. Rationale: the toolkit this site advertises is itself a study in small composable tools — the sites SHOULD embody that ethos. This applies per-site; one site's dep choices do not bind another.

## Additional Constraints

### Accessibility
Interactive elements (links, toggles, form controls) MUST be keyboard-navigable and have visible focus states. Color contrast SHALL meet WCAG AA in both themes. Decorative diagrams SHOULD have a textual explanation adjacent.

### External Links
Outbound links to other projects in the toolkit (`sahil87/*`, `noon.design`, Discord, etc.) MUST remain accurate. Broken or stale links MUST be fixed before any other landing-page work. Rationale: the site's value is as a directory into the rest of the toolkit — every dead link erodes that.

### Test Integrity
Tests MUST conform to the implementation spec — never the other way around. When tests fail, the fix SHALL either (a) update the tests to match the spec, or (b) update the implementation to match the spec. Modifying implementation code solely to accommodate test fixtures or test infrastructure is prohibited. Specs are the source of truth; tests verify conformance to specs.

## Governance

**Version**: 2.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-18

### Changelog

- **2.0.0 (2026-05-18)**: Restructured for multi-site exploration. Removed stack-specific principles (Content collections, Tailwind-only, mermaid mechanism). Added Multi-Site Isolation and One Live Site at a Time. Reframed Dark Mode Parity as value-oriented, not mechanism-bound.
- **1.0.0 (2026-05-17)**: Initial ratification.
