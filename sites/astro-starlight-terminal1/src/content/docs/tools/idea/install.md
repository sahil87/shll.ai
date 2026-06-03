---
title: Install
description: Install idea via Homebrew or as part of the shll toolkit.
---

## Homebrew

```bash
brew install sahil87/tap/idea
```

That's the whole install. No shell-init step, no daemon, no config file.

## As part of shll

If you've already run `shll install`, `idea` is already installed.

```bash
shll version             # lists idea (and every tool) with its installed version
idea --version
```

## First use

`idea` operates on `fab/backlog.md` relative to the current repo. If the file doesn't exist, the first `idea add` will create it.

```bash
cd ~/code/your-project
idea "first backlog item"
cat fab/backlog.md       # the file is now created
```

No further setup needed.

## Update

```bash
brew upgrade sahil87/tap/idea
# or, via the toolkit
shll update
```
