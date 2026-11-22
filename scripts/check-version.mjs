// Checks that dist/version.json matches the first entry of docs/release-notes.json.
// Run after `npm run build`.
import { readFileSync } from "node:fs";

const notes = JSON.parse(readFileSync("docs/release-notes.json", "utf8"));
const served = JSON.parse(readFileSync("dist/version.json", "utf8"));
const first = notes[0];

const errors = [];
if (!first?.date || !first?.heure) {
  errors.push(`the first entry (${first?.version}) has no date and heure: it is not released`);
}
if (served.numero !== first?.version) {
  errors.push(`dist/version.json numero is ${served.numero}, the first entry is ${first?.version}`);
}
if (served.date !== `${first?.date}T${first?.heure}`) {
  errors.push(`dist/version.json date is ${served.date}, the first entry is ${first?.date}T${first?.heure}`);
}

if (errors.length) {
  console.error("version.json does not match the release notes:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`version.json OK: ${served.numero} (${served.environnement}, ${served.date})`);
