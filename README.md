# chemomer-ts

The **WebAssembly build of the [chemomer](https://github.com/chemomer/chemomer)
engine** for Node — a single universal package, no platform-specific
binaries. Built with [wasm-pack](https://github.com/rustwasm/wasm-pack).

```js
const { from_molfile, aux_from_molfile, inchikey } = require("chemomer");

const inchi = from_molfile(molfileText);
const aux = aux_from_molfile(molfileText);
const key = inchikey(molfileText);
```

A thin wrapper by design: the engine (the byte-exact InChI port, gated
by the shared oracle corpus) lives in the chemomer repo and lands here
as a Cargo git dependency; this repo owns only the wasm-bindgen surface
and the packaging.

## Build and test

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build --target nodejs --out-dir pkg
node scripts/smoke-wasm.mjs
```

## Publishing

`npm.yml` is dispatch-only and doubly gated (`publish` input + the npm
trusted publisher for package `chemomer`: repository
`chemomer/chemomer-ts`, workflow `npm.yml`, no environment). The
publish credential is the job's OIDC token — no stored secrets. The
wasm module packs into `pkg/` and publishes from there.

## License

MIT, same as the engine.
