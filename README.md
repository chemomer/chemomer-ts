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

## Publishing

`npm.yml` is dispatch-only and doubly gated (`publish` input + the npm
trusted-publisher registration for package `chemomer` with repository
`chemomer/chemomer-ts`, workflow `npm.yml`, no environment) — the
publish credential is the job's OIDC token; no stored secrets. The
publish step runs WITHOUT a `registry-url` on setup-node on purpose:
a token line would make npm PUT with an empty credential instead of
the OIDC identity (registry 404).

The per-platform package split (`@chemomer/<platform>` optional
dependencies) is a deferred follow-up; until then the package ships
the dispatcher's platform binary only.

## License

MIT, same as the engine.
