// The chemomer wasm smoke test: a V2000 molfile in, the water identity
// out — run against the built pkg/ module (wasm-pack, target nodejs).
// Also gates the version scheme: the npm package flattens
// {engine-major}.{engine-minor}.{runtime-increment} (the engine is
// 1.0.0; the increment resets at the engine's 1.0.0 major).
import { readFileSync } from "node:fs";
import {
  from_molfile,
  aux_from_molfile,
  inchikey,
  rinchi_record_from_rxn,
  from_smiles,
} from "../pkg/chemomer.js";

const ENGINE_SEMVER = "1.1.4";

const WATER = [
  "water",
  "  AsciiChem",
  "",
  "  1  0  0  0  0  0  0  0  0  0999 V2000",
  "   12.0000   12.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0",
  "M  END",
  "",
].join("\n");

const failures = [];
const inchi = from_molfile(WATER);
if (inchi !== "InChI=1S/H2O/h1H2") failures.push(`identifier: got ${inchi}`);
const aux = aux_from_molfile(WATER);
if (aux !== "AuxInfo=1/0/N:1/rA:1nO/rB:/rC:12,12,0;") failures.push(`aux: got ${aux}`);
const key = inchikey(WATER);
if (key !== "XLYOFNOQVPJJNP-UHFFFAOYSA-N") failures.push(`key: got ${key}`);

// The ABI-v2 surface (chemomer 1.1.3+): the record with the
// force-equilibrium option, and the SMILES reader.
const WATER_RXN = [
  "$RXN",
  "water-is-water",
  "  chemomer",
  "",
  "  1  1",
  "$MOL",
  "",
  "  AsciiChem",
  "",
  "  1  0  0  0  0  0  0  0  0  0999 V2000",
  "   12.0000   12.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0  0",
  "M  END",
  "$MOL",
  "",
  "  AsciiChem",
  "",
  "  1  0  0  0  0  0  0  0  0  0999 V2000",
  "   12.0000   12.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0  0",
  "M  END",
  "",
].join("\n");
const record = rinchi_record_from_rxn(WATER_RXN, false).split("\n");
if (record[0] !== "RInChI=1.00.1S/H2O/h1H2<>H2O/h1H2/d+")
  failures.push(`record rinchi: got ${record[0]}`);
const equil = rinchi_record_from_rxn(WATER_RXN, true).split("\n");
if (equil[0] !== "RInChI=1.00.1S/H2O/h1H2<>H2O/h1H2/d=")
  failures.push(`equilibrium rinchi: got ${equil[0]}`);
if (
  equil[2] !==
  "Short-RInChIKey=SA-EUHFF-XLYOFNOQVP-XLYOFNOQVP-UHFFFADPSC-NUHFF-NUHFF-NUHFF-ZZZ"
)
  failures.push(`equilibrium rinchikey: got ${equil[2]}`);
const smiles = from_smiles("c1ccccc1");
if (smiles !== "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H")
  failures.push(`smiles identifier: got ${smiles}`);

const pkg = JSON.parse(readFileSync(new URL("../pkg/package.json", import.meta.url)));
const scheme = new RegExp(`^${ENGINE_SEMVER.split(".").slice(0, 2).join("\\.")}\\.\\d+$`);
if (!scheme.test(pkg.version)) {
  failures.push(`version scheme: ${pkg.version} does not match {engine-major}.{engine-minor}.{runtime-increment} (${scheme})`);
}

if (failures.length) {
  console.error("chemomer wasm smoke test FAILED:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`identifier  ${inchi}`);
console.log(`aux         ${aux}`);
console.log(`key         ${key}`);
console.log("chemomer wasm smoke test passed");
