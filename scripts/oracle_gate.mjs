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
import {
  from_molfile,
  aux_from_molfile,
  inchikey,
  rinchi_from_rxn,
  rinchi_aux_from_rxn,
  rinchi_short_key_from_rxn,
  rinchi_long_key_from_rxn,
  rinchi_web_key_from_rxn,
  rinchi_from_rd,
  rinchi_decode,
} from "../pkg/chemomer.js";

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

// -- the reaction-identity transport (the corpus's RInChI tranche) ------
// Graceful absence: a pkg/ built from an engine that predates the
// rinchi surface skips the tranche with a report — the gate lights up
// when the build picks up an engine that ships it. The equilibrium
// family is recorded under the oracle's /force-equilibrium flag, which
// the wasm surface carries no entry for; its four cases gate through
// the DECODE direction (the recorded string decodes to equilibrium)
// and are reported as derive-skips. The RDfile edge exports the
// identifier line only — the other four lines ride the RXN exports'
// assembly, and the engine's CI owns the full per-line gate.

const strip = (line, header) =>
  line.startsWith(header) ? line.slice(header.length) : line;

// Parses the component table (RinchiReaction::component_table's wire
// form): the flag line, TAB-separated `inchi<TAB>aux<TAB>inchikey`
// triples, bare `<>` role separators.
function parseComponentTable(table) {
  const lines = table.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const flag = lines.shift();
  const keys = ["reactants", "products", "agents"];
  const roles = { reactants: [], products: [], agents: [] };
  let role = 0;
  for (const line of lines) {
    if (line === "<>") {
      role += 1;
      continue;
    }
    if (role >= keys.length) throw new Error(`too many role separators: ${table}`);
    const [inchi, aux, inchikey] = line.split("\t");
    roles[keys[role]].push({ inchi, aux, inchikey });
  }
  return { flag, roles };
}

let rinchiRan = 0;
const rinchiFailures = [];
const deriveSkips = [];
try {
  rinchi_decode("RInChI=1.00.1S/H2O/h1H2<>H2O/h1H2/d+", "");
} catch (e) {
  console.log(
    `rinchi gate: skipped — the pkg build predates the rinchi surface (${String(e).slice(0, 80)})`,
  );
  process.exit(0);
}

const rinchiCases = (() => {
  try {
    return JSON.parse(
      readFileSync(join(fixturesDir, "rinchi-reactions.json"), "utf8"),
    );
  } catch {
    console.log("rinchi gate: skipped — the corpus pin predates the rinchi tranche");
    process.exit(0);
  }
})();

for (const c of rinchiCases) {
  const id = `rinchi-reactions/${c.id}`;
  // The decode direction: the recorded identifier (plus its RAuxInfo
  // companion) reads back into the recorded per-component identity
  // triples — compared order-free (roles resolve from the direction
  // flag; within a role the wire order is the assembly's sorted
  // order).
  let decoded;
  try {
    decoded = parseComponentTable(rinchi_decode(c.rinchi, c.rauxinfo ?? ""));
  } catch (e) {
    rinchiFailures.push(`${id}: decode raised ${e}`);
    continue;
  }
  rinchiRan += 1;
  const triples = (list) =>
    list.map((component) => [component.inchi, component.aux, component.inchikey]).sort();
  if (JSON.stringify(triples([...decoded.roles.reactants, ...decoded.roles.products, ...decoded.roles.agents]))
    !== JSON.stringify(triples(c.components))) {
    rinchiFailures.push(`${id}: decoded components differ from the oracle`);
  }
  const expectedFlag = c.forceEquilibrium ? "=" : "+";
  if (decoded.flag !== expectedFlag) {
    rinchiFailures.push(`${id}: direction flag ${decoded.flag} != ${expectedFlag}`);
  }

  // The derive direction.
  try {
    if (c.forceEquilibrium) {
      deriveSkips.push(id);
    } else if (c.rxnfile) {
      const outputs = {
        rinchi: rinchi_from_rxn(c.rxnfile),
        rauxinfo: rinchi_aux_from_rxn(c.rxnfile),
        rinchikey: strip(rinchi_short_key_from_rxn(c.rxnfile), "Short-RInChIKey="),
        longKey: strip(rinchi_long_key_from_rxn(c.rxnfile), "Long-RInChIKey="),
        webKey: strip(rinchi_web_key_from_rxn(c.rxnfile), "Web-RInChIKey="),
      };
      rinchiRan += 1;
      for (const [field, actual] of Object.entries(outputs)) {
        if (c[field] !== undefined && actual !== c[field]) {
          rinchiFailures.push(`${id}: ${field} ${actual} != ${c[field]}`);
        }
      }
    } else if (c.rdfile) {
      const rinchi = rinchi_from_rd(c.rdfile);
      rinchiRan += 1;
      if (rinchi !== c.rinchi) rinchiFailures.push(`${id}: rinchi ${rinchi} != ${c.rinchi}`);
    }
  } catch (e) {
    rinchiFailures.push(`${id}: raised ${e}`);
  }
}

console.log(
  `rinchi gate: ${rinchiRan} comparisons, ${rinchiFailures.length} failures, ` +
    `${deriveSkips.length} derive-skips (force-equilibrium: ${deriveSkips.join(", ")})`,
);
if (rinchiFailures.length) {
  for (const f of rinchiFailures.slice(0, 20)) console.error(`  ${f}`);
  process.exit(1);
}
