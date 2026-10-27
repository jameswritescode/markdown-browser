import { expect, test } from "vitest";
import { findMatches, stepMatch } from "../src/page/find.ts";

test("finds every match in every text, ignoring case", () => {
  expect(findMatches(["Install mdb", "then run MDB again"], "mdb")).toEqual([
    { index: 0, start: 8, end: 11 },
    { index: 1, start: 9, end: 12 },
  ]);
});

test("does not overlap matches", () => {
  expect(findMatches(["aaaa"], "aa")).toEqual([
    { index: 0, start: 0, end: 2 },
    { index: 0, start: 2, end: 4 },
  ]);
});

test("finds nothing for an empty or blank query", () => {
  expect(findMatches(["text"], "")).toEqual([]);
  expect(findMatches(["a b"], "  ")).toEqual([]);
});

test("advances the match index and wraps at both ends", () => {
  expect(stepMatch(0, 3, 1)).toBe(1);
  expect(stepMatch(2, 3, 1)).toBe(0);
  expect(stepMatch(0, 3, -1)).toBe(2);
  expect(stepMatch(-1, 0, 1)).toBe(-1);
});
