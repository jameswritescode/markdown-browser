import { expect, test } from "vitest";
import { parseArgs } from "../src/core/args.ts";
import { FIX, FIXTURES } from "./helpers.ts";

test("no arguments browses the working folder", () => {
  expect(parseArgs([], "/w", {})).toEqual({
    root: "/w",
    openPath: null,
    background: "transparent",
  });
});

test("a folder argument browses that folder", () => {
  expect(parseArgs([FIX("guide")], "/w", {})).toEqual({
    root: FIX("guide"),
    openPath: null,
    background: "transparent",
  });
});

test("a file argument opens it, rooted at its folder", () => {
  expect(parseArgs([FIX("README.md")], "/w", {})).toEqual({
    root: FIXTURES,
    openPath: FIX("README.md"),
    background: "transparent",
  });
});

test("relative paths resolve against the working folder", () => {
  expect(parseArgs(["guide/setup.md"], FIXTURES, {})).toMatchObject({
    openPath: FIX("guide/setup.md"),
  });
});

test("--solid and MDB_BACKGROUND=solid choose a solid background", () => {
  expect(parseArgs(["--solid"], "/w", {})).toMatchObject({ background: "solid" });
  expect(parseArgs([], "/w", { MDB_BACKGROUND: "solid" })).toMatchObject({ background: "solid" });
});

test("missing paths are an error", () => {
  expect(parseArgs(["nope.md"], FIXTURES, {})).toEqual({
    error: "mdb: nope.md: no such file or folder",
  });
});

test("non-markdown files are an error", () => {
  expect(parseArgs([FIX("notes.txt")], "/w", {})).toEqual({
    error: `mdb: ${FIX("notes.txt")}: not a markdown file`,
  });
});

test("unknown flags are an error", () => {
  expect(parseArgs(["--nope"], "/w", {})).toEqual({ error: "mdb: unknown option --nope" });
});
