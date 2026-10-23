import { expect, test } from "vitest";
import { scanDocs } from "../src/core/scan.ts";
import { searchDocs } from "../src/core/search.ts";
import { FIXTURES } from "./helpers.ts";

const { docs } = await scanDocs(FIXTURES);

test("finds text inside documents with a highlighted snippet", async () => {
  const hits = await searchDocs(docs, "KITTY");
  expect(hits).toHaveLength(1);
  expect(hits[0]!.entry.relPath).toBe("guide/setup.md");
  expect(hits[0]!.line).toBe(5);
  expect(hits[0]!.snippet.slice(...hits[0]!.range).toLowerCase()).toBe("kitty");
});

test("empty query finds nothing", async () => {
  expect(await searchDocs(docs, "")).toEqual([]);
});

test("caps hits per file at three", async () => {
  const hits = await searchDocs(docs, "e");
  const perFile = new Map<string, number>();
  for (const h of hits) perFile.set(h.entry.path, (perFile.get(h.entry.path) ?? 0) + 1);
  expect(Math.max(...perFile.values())).toBeLessThanOrEqual(3);
});

test("respects maxHits", async () => {
  expect(await searchDocs(docs, "e", 2)).toHaveLength(2);
});

test("snippets stay short around long lines", async () => {
  const fake = [{ ...docs[0]!, path: FIXTURES + "/long.md" }];
  const { writeFileSync, rmSync } = await import("node:fs");
  writeFileSync(fake[0]!.path, "x".repeat(500) + " needle " + "y".repeat(500));
  try {
    const [hit] = await searchDocs(fake, "needle");
    expect(hit!.snippet.length).toBeLessThanOrEqual(120);
    expect(hit!.snippet.slice(...hit!.range)).toBe("needle");
  } finally {
    rmSync(fake[0]!.path);
  }
});
