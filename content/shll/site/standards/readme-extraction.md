# Standard: README & docs/site structure

How every repo in the [shll toolkit](https://shll.ai) structures its `README.md` and `docs/site/` tree so [shll.ai](https://shll.ai) can pull and render them mechanically. The site pulls a **deduced, curated slice** of the README (rendered at `/<tool>/readme`) and every page of the optional `docs/site/**` tree (each at `/<tool>/<path>`), daily and on demand. Nothing is hand-copied; the tool repo is canonical and pushes nothing.

This page is the **producer-facing standard**: the structure your repo keeps. The consumer mechanics — extraction code, pull workflows, lints, link rewriting — are shll.ai's job, specified with their machine anchor in the [shll.ai README-extraction contract](https://github.com/sahil87/shll.ai/blob/main/docs/specs/readme-extraction-contract.md). This is the README-prose sibling of the [help-dump standard](help-dump.md), and together they implement principles №3 and №10 of the [toolkit CLI principles](principles.md).

## README structure

**1. Head — the slice starts after the GitHub chrome.** Keep the top of the README in this exact order: a single markdown `# Title` H1, then the canonical toolkit blockquote, then a contiguous run of badge lines, then your prose. The first non-chrome line is where the site slice begins — make it your tagline. No YAML frontmatter, HTML `<h1>`, or HTML comment above the H1 (anything unrecognized as chrome leaks into the slice as content). The blockquote is this exact line in all seven repos:

```markdown
> Part of the [shll toolkit](https://shll.ai) — see all projects there.
```

**2. Tail — the slice ends at the first footer heading.** The pull stops immediately before the first heading (case-insensitive `##`/`###`) named `Contributing`, `Development`, `Building`, `License`, or `Acknowledgements`. Everything site-worthy goes above the first of those. `Install`, `Changelog`, `Roadmap`, and `FAQ` are deliberately **kept** — tool-specific install detail belongs on the site.

**3. Images absolute, everywhere.** Every image in `README.md` and `docs/site/**` MUST be an absolute `https://…` URL (e.g. `raw.githubusercontent.com/sahil87/<repo>/main/…`). shll.ai vendors zero image binaries; a relative image renders broken. Keep meaningful `![alt](…)` text — it travels verbatim.

**4. Mermaid → rendered image.** Inline ```` ```mermaid ```` fences are stripped on pull (the site doesn't render mermaid). A diagram destined for the site is committed as a rendered image (SVG preferred) and referenced absolutely; keep the mermaid source alongside for GitHub if you like.

**5. Links leaving the published set are absolute-by-author.** The site publishes exactly two things from your repo: the README slice and `docs/site/**`. A link to anything else — source files, `docs/specs/`, `CONTRIBUTING.md` — MUST be written as an absolute `https://…` URL by you; a relative link like `[x](docs/specs/y.md)` 404s on the site. Only two relative forms are auto-rewritten: README links **into** `docs/site/` written naturally as `docs/site/<path>.md`, and relative links **between** `docs/site/` pages. Avoid putting a `docs/site/` link behind a badge (`[![alt](img)](docs/site/x.md)`) or in a reference-style definition (`[id]: docs/site/x.md`) — those shapes aren't rewritten.

**6. No GitHub-only theme tricks.** `#gh-dark-mode-only` / `#gh-light-mode-only` image fragments are stripped on pull. Prefer theme-agnostic screenshots; for a genuine light/dark pair use `<picture><source media="(prefers-color-scheme:…)">`.

**7. Command/flag accuracy.** The site cross-checks your pulled prose against the tool's [help-dump](help-dump.md) output and emits a CI warning for commands or flags that don't exist. It never blocks the pull — your README is canonical and ships verbatim — but treat the warning as a defect in the README and fix it there.

**8. The README is the hub.** Cross-link the deeper pages: the install section links to `docs/site/install.md` (natural repo-relative path — the site rewrites it, GitHub resolves it), and point at the generated command reference with the absolute URL `https://shll.ai/<tool>/commands/`.

## The docs/site tree

Depth that doesn't belong inline in the README — install guides, workflows, deep-dives, contracts like this one — lives in `docs/site/**/*.md`. Each file renders as its own page: `docs/site/install.md` → `/<tool>/install`, `docs/site/advanced/hooks.md` → `/<tool>/advanced/hooks`. The tree is a **closed set**, governed by four rules:

1. **Closure.** Every relative link and image inside `docs/site/**` resolves to a path inside `docs/site/`. No `..` escapes it.
2. **External links absolute-by-author.** Any link leaving the published set is written absolute, by you — that authorial decision is what keeps the consumer to two context-free rewrites instead of a link classifier.
3. **All images absolute** — same as README rule 3.
4. **README → docs/site links written naturally** — `[guide](docs/site/install.md)`, rewritten by the site to `/<tool>/install`.

**Reserved names.** A `docs/site/` page must not be named `overview`, `readme`, or `commands` — those three slugs are site-owned (the directory entry plus the two generated pages). Every other name is yours, including `install` and `workflows`.

**Published vs. not.** Only `README.md` and `docs/site/**` are ever pulled. Everything else — source, tests, `docs/specs/`, `docs/memory/`, design notes — is invisible to the site by default. Maintainer-only notes need no special folder; just keep them out of `docs/site/`.

## Verifying conformance

Before opening a PR that touches the README or `docs/site/`:

- README top is `#` H1 → toolkit blockquote → badges, and the first prose line is the intro you want on the site.
- Grep for relative targets (`](./`, `](../`, `](docs/`): each either points into `docs/site/` (from the README), stays inside `docs/site/` (between tree pages), or has been made absolute. No relative images anywhere.
- No `#gh-*-mode-only` fragments; diagrams destined for the site are committed rendered images, referenced absolutely.
- No `docs/site/` page named `overview`, `readme`, or `commands`.
- The README cross-links its `docs/site/` pages and the absolute command-reference URL.

Violations don't block the pull — the site's lints are report-only and the canonical content still ships — but each one is a live broken link or a stripped element on your tool's public page.
