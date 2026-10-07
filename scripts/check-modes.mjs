import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { MODES } from "../js/modes/index.js";

assert.equal(MODES.length, 19, "The gallery should contain all 19 planned modes.");
assert.equal(new Set(MODES.map(mode => mode.id)).size, MODES.length, "Mode ids should be unique.");
for (const mode of MODES) {
  assert.ok(mode.id && mode.nameKey && mode.descriptionKey && typeof mode.create === "function", `Mode metadata is incomplete: ${mode.id}`);
}

const jsFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".js")) jsFiles.push(path);
  }
}
await collect("js");
for (const file of jsFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}
console.log(`✓ ${MODES.length} modes registered; ${jsFiles.length} JavaScript modules syntax-checked.`);
