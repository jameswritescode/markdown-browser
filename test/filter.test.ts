import { expect, test } from "vitest";
import { filterDocs } from "../src/core/filter.ts";
import { scanDocs } from "../src/core/scan.ts";
import { FIXTURES } from "./helpers.ts";

const { docs } = await scanDocs(FIXTURES);

test("contiguous prefix match ranks first", () => {
  expect(filterDocs(docs, "read").map((m) => m.entry.relPath)[0]).toBe("README.md");
});

test("matches a subsequence across the path", () => {
  expect(filterDocs(docs, "gst").map((m) => m.entry.relPath)).toContain("guide/setup.md");
});

test("drops docs that do not match", () => {
  expect(filterDocs(docs, "zzz")).toEqual([]);
});

test("reports title highlight ranges", () => {
  expect(filterDocs(docs, "Setup")[0]!.titleRanges).toEqual([[0, 5]]);
});

test("reports path highlight ranges", () => {
  const m = filterDocs(docs, "gst").find((x) => x.entry.relPath === "guide/setup.md")!;
  expect(m.pathRanges.length).toBeGreaterThan(0);
  const chars = m.pathRanges.map(([s, e]) => m.entry.relPath.slice(s, e)).join("");
  expect(chars.toLowerCase()).toBe("gst");
});

test("empty query returns every doc in order", () => {
  expect(filterDocs(docs, "").map((m) => m.entry)).toEqual(docs);
});
