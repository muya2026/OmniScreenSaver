import test from "node:test";
import assert from "node:assert/strict";
import { banglaCalendarDate, dhakaTimeParts } from "../js/calendar.js";

const date = value => new Date(`${value}T12:00:00Z`);

test("Bangladesh revised calendar dates match known dates", () => {
  assert.equal(banglaCalendarDate(date("2026-10-07"), "bn").text, "২২ আশ্বিন ১৪৩৩");
  assert.equal(banglaCalendarDate(date("2026-02-21"), "bn").text, "৮ ফাল্গুন ১৪৩২");
  assert.equal(banglaCalendarDate(date("2026-03-26"), "bn").text, "১২ চৈত্র ১৪৩২");
  assert.equal(banglaCalendarDate(date("2026-12-16"), "bn").text, "১ পৌষ ১৪৩৩");
});

test("the English calendar display uses Latin numerals and month names", () => {
  assert.equal(banglaCalendarDate(date("2026-10-07"), "en").text, "22 Ashwin 1433");
});

test("clock parts use Bengali numerals for the Bengali interface", () => {
  const parts = dhakaTimeParts(date("2026-10-07"), "bn");
  assert.match(parts.hourText, /[০-৯]/);
  assert.match(parts.minuteText, /[০-৯]/);
});
