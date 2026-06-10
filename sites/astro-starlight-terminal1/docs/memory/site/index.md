---
description: "Site-specific implementation behavior for the astro-starlight-terminal1 build"
---
# site

> Hand-maintained (this tree is outside `fab memory-index`). Descriptions come from each file's `description:` frontmatter.

| File | Description | Last Updated |
|------|-------------|-------------|
| [homepage-terminal](homepage-terminal.md) | The homepage's interactive terminal prompt (changes `9vbo`, `n23o`, `23xc`): the progressive-enhancement boundary (static `<pre class="shell-session">` transcript is the no-JS source of truth; `TerminalPrompt.astro` client island upgrades ONLY the final `[data-terminal-prompt]` line into a focusable `contenteditable` input, no autofocus on load), the static client-side command dispatch map (help/ls/cd·open/install/version/theme/history/clear + eggs whoami·sudo·echo·man·shll·sl·fortune·exit·:q, strict `command not found`), the shell affordances on `onKeydown` (↑/↓ command history with sessionStorage persistence + `ignoredups`, bash-like Tab-completion, Ctrl-L clear / Ctrl-C cancel — all upholding the exactly-one-trailing-prompt invariant), the `theme` → `<starlight-theme-select>` `change`-event sync, the `.terminal-window` CSS chrome (1px border + thin title bar + 3 dimmed dots — a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision), and the above-fold activation pass (change `23xc`: `[data-has-hero]`-scoped hero rhythm tightening, the resting-state top anchor — greeting line first visible via an inline `padding-bottom` filler; bottom-pinning resumes on the first prompt-emitting interaction — the activation-time greeting line, and the one-shot 4 s idle ghost hint `$ ▊try 'ls' ⏎`, aria-hidden, visual-only, reduced-motion-safe) | 2026-06-10 |
