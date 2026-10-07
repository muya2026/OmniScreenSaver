import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MODES } from "../js/modes/index.js";
import { dictionariesForTests } from "../js/i18n.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const htmlKeys = [...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)].map(match => match[1]);

 test("all HTML translation keys exist in English and Bengali", () => {
  for (const language of ["en", "bn"]) {
    for (const key of htmlKeys) assert.ok(dictionariesForTests[language][key], `${language} is missing ${key}`);
    for (const mode of MODES) {
      assert.ok(dictionariesForTests[language][mode.nameKey], `${language} is missing ${mode.nameKey}`);
      assert.ok(dictionariesForTests[language][mode.descriptionKey], `${language} is missing ${mode.descriptionKey}`);
    }
  }
});
