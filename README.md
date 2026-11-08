# chemomer-ts

The **Node binding for the [chemomer](https://github.com/chemomer/chemomer)
engine** — a native extension module built with
[napi-rs](https://napi.rs).

```js
const { fromMolfile, auxFromMolfile, inchikey } = require("chemomer");

const inchi = fromMolfile(molfileText);
const aux = auxFromMolfile(molfileText);
const key = inchikey(molfileText);
```

A thin wrapper by design: the engine (the byte-exact InChI port, gated
by the shared oracle corpus) lives in the chemomer repo and lands here
as a Cargo git dependency; this repo owns only the napi surface and
the packaging.

## Build and test

```bash
npm ci
npm run build:debug
node scripts/smoke-napi.mjs
```

## Packaging

The standard napi-rs multi-platform shape: the `chemomer` package
ships the JS loader (`index.js` + `index.d.ts`) and pulls its native
binary through `optionalDependencies` from the per-platform packages
`chemomer-darwin-arm64`, `chemomer-darwin-x64`,
`chemomer-linux-x64-gnu`, `chemomer-win32-x64-msvc`. The generated
loader prefers a local `index.<platform>.node` in a dev tree and falls
back to the platform package when installed — the same file serves
both. Platform package manifests live in `npm/<triple>/`
(`npm run create-npm-dirs` regenerates them); binaries are staged into
those dirs by `npm run artifacts` and are never committed.

The smoke test has a layout mode that verifies the
optionalDependencies resolution directly:

```bash
npm run create-npm-dirs
npm run build
cp index.<platform>.node npm/<triple>/   # or: npm run artifacts
npm install --no-save ./npm/<triple>
node scripts/smoke-napi.mjs --layout
```

## Publishing

`npm.yml` is dispatch-only and doubly gated (`publish` input + the npm
trusted-publisher registrations with repository `chemomer/chemomer-ts`,
workflow `npm.yml`, no environment) — the publish credential is the
job's OIDC token; no stored secrets. The parsanol pattern applies:
setup-node keeps its `registry-url` while the publish steps set
`NODE_AUTH_TOKEN` to the empty string, so npm engages OIDC provenance
instead of token auth.

Five packages need registrations: `chemomer` (main) plus the four
platform packages. Platform packages publish FIRST, the main package
LAST — its optionalDependencies pin them at the same version.

## License

MIT, same as the engine.
