---
description: "Site-specific implementation behavior for the astro-starlight-terminal1 build"
---
# site

> Hand-maintained (this tree is outside `fab memory-index`). Descriptions come from each file's `description:` frontmatter.

| File | Description | Last Updated |
|------|-------------|-------------|
| [homepage-terminal](homepage-terminal.md) | The homepage's interactive terminal prompt (change `9vbo`): the progressive-enhancement boundary (static `<pre class="shell-session">` transcript is the no-JS source of truth; `TerminalPrompt.astro` client island upgrades ONLY the final `[data-terminal-prompt]` line into a focusable `contenteditable` input, no autofocus on load), the static client-side command dispatch map (help/ls/cd·open/install/version/theme/clear + eggs whoami·sudo·echo·man·shll·sl·fortune·exit·:q, strict `command not found`), the `theme` → `<starlight-theme-select>` `change`-event sync, and the `.terminal-window` CSS chrome (1px border + thin title bar + 3 dimmed dots — a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision) | 2026-06-08 |
