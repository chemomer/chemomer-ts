// The chemomer wasm smoke test: a V2000 molfile in, the water identity
// out — run against the built pkg/ module (wasm-pack, target nodejs).
import { from_molfile, aux_from_molfile, inchikey } from "../pkg/chemomer.js";

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

if (failures.length) {
  console.error("chemomer wasm smoke test FAILED:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`identifier  ${inchi}`);
console.log(`aux         ${aux}`);
console.log(`key         ${key}`);
console.log("chemomer wasm smoke test passed");
