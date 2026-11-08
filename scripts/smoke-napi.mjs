// The napi surface smoke test: a V2000 molfile in, the water identity
// out — `npm test` drives this against the freshly built binding.
//
// Two modes:
//
//   default     load the root index.js — the generated napi loader. In a
//               dev tree it resolves the local index.<platform>.node; in
//               an installed package it resolves the platform package
//               through optionalDependencies.
//
//   --layout    ALSO resolve the binary through the per-platform package
//               layout directly — require("chemomer-<platform>-<arch>")
//               by bare name — which is the optionalDependencies contract
//               the published loader relies on. Run this after installing
//               a locally built platform dir, e.g.
//                 npm run create-npm-dirs && npm run artifacts
//                 npm install --no-save ./npm/chemomer-darwin-arm64
//                 node scripts/smoke-napi.mjs --layout
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootLoader = fileURLToPath(new URL("../index.js", import.meta.url));

// The shipped platform-package suffix for the current runtime, or null
// when this platform is not in the packaging matrix (linux follows the
// glibc build; the musl build is not shipped).
function shippedPlatformPackage() {
  const { platform, arch } = process;
  if (platform === "darwin") return `chemomer-darwin-${arch}`;
  if (platform === "linux" && arch === "x64") return `chemomer-linux-x64-gnu`;
  if (platform === "win32" && arch === "x64") return `chemomer-win32-x64-msvc`;
  return null;
}

const WATER = [
  "water",
  "  AsciiChem",
  "",
  "  1  0  0  0  0  0  0  0  0  0999 V2000",
  "   12.0000   12.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0  0",
  "M  END",
  "",
].join("\n");

function verify(label, binding, failures) {
  const inchi = binding.fromMolfile(WATER);
  const aux = binding.auxFromMolfile(WATER);
  const key = binding.inchikey(WATER);
  if (inchi !== "InChI=1S/H2O/h1H2") {
    failures.push(`${label} identifier: got ${JSON.stringify(inchi)}`);
  }
  if (aux !== "AuxInfo=1/0/N:1/rA:1nO/rB:/rC:12,12,0;") {
    failures.push(`${label} aux: got ${JSON.stringify(aux)}`);
  }
  if (key !== "XLYOFNOQVPJJNP-UHFFFAOYSA-N") {
    failures.push(`${label} key: got ${JSON.stringify(key)}`);
  }
  return { inchi, aux, key };
}

const failures = [];
const root = verify("index.js", require(rootLoader), failures);
let layout = null;

if (process.argv.includes("--layout")) {
  const pkg = shippedPlatformPackage();
  if (!pkg) {
    console.error(
      `chemomer napi smoke test: no platform package for ${process.platform}-${process.arch}`,
    );
    process.exit(1);
  }
  layout = { pkg, identity: verify(pkg, require(pkg), failures) };
}

if (failures.length > 0) {
  console.error("chemomer napi smoke test FAILED:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`index.js    ${root.inchi}`);
console.log(`aux         ${root.aux}`);
console.log(`key         ${root.key}`);
if (layout) {
  console.log(`${layout.pkg}: ${layout.identity.key} — platform-package resolution verified`);
}
console.log("chemomer napi smoke test passed");
