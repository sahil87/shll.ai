---
title: Install everything
description: One brew tap, one install command, the whole toolkit.
---

```bash
brew install sahil87/tap/shll       # or: brew install sahil87/tap/all
shll install                        # brew-installs every roster tool you're missing
shll shell-setup --trust-tap        # wire your shell + record trust for sahil87/tap
exec $SHELL                          # reload so the shell integration takes effect
```

That's it. `shll install` is idempotent and safe to re-run: it installs only the roster tools you're missing and does **not** upgrade what's already there. To upgrade installed tools, use `shll update`.

## Verify

```bash
shll version
```

`version` prints a paste-friendly dump of every installed tool and its version — handy for confirming the install worked and for bug reports.

## Per-tool install

If you only want one tool, every tool has its own brew formula:

```bash
brew install sahil87/tap/idea
brew install sahil87/tap/fab-kit
# etc.
```

Skip the meta-installer; you opt in piece by piece.

## Update

```bash
shll update
```

Updates every installed tool to the latest tap version. To pin a specific tool, install it directly via brew instead of through `shll install`.

---

Next: head to a [tool overview](/tools/idea/overview/) or learn the [daily flow](/workflows/daily-flow/).
