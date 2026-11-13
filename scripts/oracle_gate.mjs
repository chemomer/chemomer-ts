// The wasm transport, gated by the inchi-tests oracle corpus.
//
// Every identity fixture's molfile goes through the built pkg/ module;
// the returned identifier / AuxInfo / InChIKey byte-compare against
// the recorded oracle. A failure names the case id — the corpus is
// never edited to make a binding pass (the engine's CI owns the same
// gate; this one exists because the transport across the JS boundary
// is where drift would appear, and the smoke test doesn't cover it).
//
// Usage: node scripts/oracle_gate.mjs [INCHI_TESTS_DIR]
// Default dir: ../inchi-tests (the CI clone layout).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { from_molfile, aux_from_molfile, inchikey } from "../pkg/chemomer.js";

const corpus =
  process.argv[2] ?? process.env.INCHI_TESTS ?? "../inchi-tests";
const fixturesDir = join(corpus, "corpus", "fixtures");

let fixtureFiles;
try {
  fixtureFiles = readdirSync(fixturesDir)
    .filter((f) => /^identity-.*\.json$/.test(f))
    .sort();
} catch {
  console.error(`oracle gate: corpus not found at ${fixturesDir}`);
  process.exit(2);
}

const failures = [];
let ran = 0;
for (const file of fixtureFiles) {
  const cases = JSON.parse(readFileSync(join(fixturesDir, file), "utf8"));
  for (const c of cases) {
    const id = `${file.replace(/\.json$/, "")}/${c.id ?? "?"}`;
    let inchi, aux, key;
    try {
      inchi = from_molfile(c.molfile);
      aux = aux_from_molfile(c.molfile);
      key = inchikey(c.molfile);
    } catch (e) {
      failures.push(`${id}: raised ${e}`);
      continue;
    }
    ran += 1;
    // Compare only fields the fixture records (identity-metal2 carries
    // no aux layer) — a missing oracle field is not a gate.
    if (c.inchi !== undefined && inchi !== c.inchi) failures.push(`${id}: inchi ${inchi} != ${c.inchi}`);
    if (c.aux !== undefined && aux !== c.aux) failures.push(`${id}: aux ${aux} != ${c.aux}`);
    if (c.inchikey !== undefined && key !== c.inchikey) failures.push(`${id}: key ${key} != ${c.inchikey}`);
  }
}

console.log(`oracle gate: ${ran} cases byte-compared, ${failures.length} failures`);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.error(`  ${f}`);
  process.exit(1);
}
