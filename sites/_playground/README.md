# _playground

Scratch space for website experiments — alternate frameworks, themes, or content shapes for [shll.ai](https://shll.ai).

Each experiment is a self-contained subdirectory with its own `package.json` and dependencies. No experiment here is deployed; the live site is built from a sibling `sites/<name>/` directory chosen by `.github/workflows/deploy.yml`.

Promote an experiment by:

1. Moving it from `_playground/` to a peer `sites/<descriptive-name>/` directory.
2. Updating the `working-directory` in `deploy.yml` to point at it.
