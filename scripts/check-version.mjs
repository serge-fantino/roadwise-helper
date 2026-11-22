// Checks that dist/version.json matches the first released entry of docs/release-notes.json
// (released: it has a date and a time). Run after `npm run build`.
// An entry without date and time on top is a change not yet released: fine on a pull request.
// With REQUIRE_RELEASED=1 (CI on master) it is reported, since master is production.
import { readFileSync } from "node:fs";

const notes = JSON.parse(readFileSync("docs/release-notes.json", "utf8"));
const served = JSON.parse(readFileSync("dist/version.json", "utf8"));
const released = notes.find((entry) => entry.date && entry.heure);

const errors = [];
if (!released) {
  errors.push("docs/release-notes.json has no released entry");
} else {
  if (served.numero !== released.version) {
    errors.push(`dist/version.json numero is ${served.numero}, the first released entry is ${released.version}`);
  }
  if (served.date !== `${released.date}T${released.heure}`) {
    errors.push(`dist/version.json date is ${served.date}, the first released entry is ${released.date}T${released.heure}`);
  }
}
if (errors.length) {
  console.error("version.json does not match the release notes:\n- " + errors.join("\n- "));
  process.exit(1);
}

const pending = notes.slice(0, notes.indexOf(released)).map((entry) => entry.version);
if (pending.length && process.env.REQUIRE_RELEASED === "1") {
  console.log(`::warning::Not dated yet, so not served: ${pending.join(", ")}. Give the entry its date and heure.`);
}
console.log(
  `version.json OK: ${served.numero} (${served.environnement}, ${served.date})` +
    (pending.length ? `; not released yet: ${pending.join(", ")}` : ""),
);
