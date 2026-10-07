import test from "node:test";
import assert from "node:assert/strict";
import { splitGraphemes, limitGraphemes, formatDigits } from "../js/text.js";

test("Bengali graphemes keep conjuncts and vowel marks together", () => {
  assert.deepEqual(splitGraphemes("ক্ষমা", "bn"), ["ক্ষ", "মা"]);
  assert.deepEqual(splitGraphemes("মুয়া", "bn"), ["মু", "য়া"]);
});

test("the name limit counts graphemes rather than code points", () => {
  assert.equal(limitGraphemes("ক্ষ".repeat(25), 24, "bn"), "ক্ষ".repeat(24));
  assert.equal(splitGraphemes(limitGraphemes("ক্ষ".repeat(25), 24, "bn"), "bn").length, 24);
});

test("numeric labels localize Bengali digits", () => {
  assert.equal(formatDigits(240, "bn"), "২৪০");
  assert.equal(formatDigits(240, "en"), "240");
});
