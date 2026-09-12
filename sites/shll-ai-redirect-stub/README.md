# shll-ai-redirect-stub

The whole of shll.ai: a **permanent redirect host** for [hexokit.com](https://hexokit.com) (HexoKit rebrand, plan rows X1/X2). Every URL shll.ai ever served is emitted here as a tiny static page that lands on its final hexokit.com page — plus two endpoints that stay **real byte copies, never redirects**, because they are baked into shipped `shll` binaries:

- `shll.ai/install` — byte copy of `hexokit.com/install` (a meta-refresh page here would feed HTML to `sh` on every `curl -fsSL shll.ai/install | sh`)
- `shll.ai/versions.json` — byte copy of `hexokit.com/versions.json` (the fallback version manifest; shll ≥ v0.1.31 prefers hexokit.com first)

## How it works

`build.mjs` fetches the machine-readable redirect map from `https://hexokit.com/shll-ai-redirects.json` (produced by [sahil87/hexokit-site](https://github.com/sahil87/hexokit-site); cross-repo contract: `docs/specs/shll-ai-redirect-map-contract.md` there), validates it, and emits into `dist/`:

- one `index.html` stub per page-like map key (meta refresh + `rel=canonical` + `location.replace`)
- `404.html` — a catch-all that embeds the map's `rules` and applies them client-side to any un-enumerated path
- verbatim byte copies of the `keep` paths and the file-like keys (`/llms.txt`, `/llms-full.txt`)
- `CNAME`, `robots.txt`, and a generated `/.well-known/security.txt`

The build **fails closed**: any fetch or validation error (map 404, a `keep` path dropped, the completeness floor in `fixtures/shll-ai-paths.txt` not met, an HTML body at `/install`) exits non-zero before anything is written, so the last-good deployment stays live. The deploy workflow rebuilds daily so the byte copies track hexokit.com.

## Build and verify locally

Zero dependencies — Node 22 built-ins only, no `package.json`, no install step:

```sh
node sites/shll-ai-redirect-stub/build.mjs        # writes sites/shll-ai-redirect-stub/dist/
node --test sites/shll-ai-redirect-stub/*.test.mjs  # hermetic unit + integration tests
```

`build.mjs` flags: `--origin <url>` (default `https://hexokit.com`; local experiments only), `--out <dir>`, `--floor <path>`.
