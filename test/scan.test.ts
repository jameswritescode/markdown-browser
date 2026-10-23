import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { isMarkdownPath, scanDocs, titleOf } from "../src/core/scan.ts";
import { FIXTURES } from "./helpers.ts";

test("finds markdown, skips ignored, hidden and node_modules", async () => {
  const r = await scanDocs(FIXTURES);
  expect(r.docs.map((d) => d.relPath).sort()).toEqual([
    "README.md",
    "guide/no-heading.md",
    "guide/setup.md",
  ]);
  expect(r.truncated).toBe(false);
  expect(r.root).toBe(FIXTURES);
});

test("lists shallower files before deeper ones", async () => {
  const r = await scanDocs(FIXTURES);
  expect(r.docs.map((d) => d.relPath)).toEqual([
    "README.md",
    "guide/no-heading.md",
    "guide/setup.md",
  ]);
});

test("entries carry absolute path, title and mtime", async () => {
  const r = await scanDocs(FIXTURES);
  const setup = r.docs.find((d) => d.relPath === "guide/setup.md");
  expect(setup?.path).toBe(join(FIXTURES, "guide/setup.md"));
  expect(setup?.title).toBe("Setup Guide");
  expect(setup?.mtimeMs).toBeGreaterThan(0);
});

test("title is first H1, else file name without extension", () => {
  expect(titleOf("intro\n# Setup Guide\n## x", "setup.md")).toBe("Setup Guide");
  expect(titleOf("Setup Guide\n===\n", "setup.md")).toBe("Setup Guide");
  expect(titleOf("```\n# not a heading\n```\nno h1", "no-heading.md")).toBe("no-heading");
});

test("stops at the limit and reports truncation", async () => {
  const r = await scanDocs(FIXTURES, 2);
  expect(r.docs).toHaveLength(2);
  expect(r.truncated).toBe(true);
});

test("does not follow symlinked directories", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mdb-"));
  writeFileSync(join(dir, "a.md"), "# A");
  symlinkSync(dir, join(dir, "loop"));
  expect((await scanDocs(dir)).docs.map((d) => d.relPath)).toEqual(["a.md"]);
});

test("skips the Library folder directly under home", async () => {
  const home = mkdtempSync(join(tmpdir(), "mdb-home-"));
  for (const dir of ["Library/App", "notes/Library"]) {
    mkdirSync(join(home, dir), { recursive: true });
    writeFileSync(join(home, dir, "x.md"), "# X");
  }
  expect((await scanDocs(home, undefined, home)).docs.map((d) => d.relPath)).toEqual([
    "notes/Library/x.md",
  ]);
});

test("recognises markdown extensions case-insensitively", () => {
  expect(isMarkdownPath("a.md")).toBe(true);
  expect(isMarkdownPath("a.MARKDOWN")).toBe(true);
  expect(isMarkdownPath("a.mdx")).toBe(true);
  expect(isMarkdownPath("a.txt")).toBe(false);
});
