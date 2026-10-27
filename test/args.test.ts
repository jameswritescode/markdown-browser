import { expect, test } from "vitest";
import { parseArgs } from "../src/core/args.ts";
import { FIX, FIXTURES } from "./helpers.ts";

const start = (argv: string[], cwd = "/w", env: NodeJS.ProcessEnv = {}) => {
  const parsed = parseArgs(argv, cwd, env);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.start;
};

test("no arguments browses the working folder", () => {
  expect(parseArgs([], "/w", {})).toEqual({
    start: {
      root: "/w",
      openPath: null,
      background: "transparent",
      heading: null,
      tab: null,
      waitToken: null,
    },
    split: null,
    size: null,
    fresh: false,
    replace: false,
    stdin: false,
    title: null,
  });
});

test("a folder argument browses that folder", () => {
  expect(start([FIX("guide")])).toMatchObject({ root: FIX("guide"), openPath: null });
});

test("a file argument opens it, rooted at its folder", () => {
  expect(start([FIX("README.md")])).toMatchObject({
    root: FIXTURES,
    openPath: FIX("README.md"),
  });
});

test("relative paths resolve against the working folder", () => {
  expect(start(["guide/setup.md"], FIXTURES)).toMatchObject({
    openPath: FIX("guide/setup.md"),
  });
});

test("--solid and MDB_BACKGROUND=solid choose a solid background", () => {
  expect(start(["--solid"])).toMatchObject({ background: "solid" });
  expect(start([], "/w", { MDB_BACKGROUND: "solid" })).toMatchObject({ background: "solid" });
});

test("--split takes a direction, with a space or an equals sign", () => {
  expect(parseArgs(["--split", "down"], "/w", {})).toMatchObject({ split: "down" });
  expect(parseArgs(["--split=left"], "/w", {})).toMatchObject({ split: "left" });
  expect(parseArgs(["--split", "sideways"], "/w", {})).toEqual({
    error: "mdb: --split takes right, left, down, or up",
  });
  expect(parseArgs(["--split"], "/w", {})).toEqual({
    error: "mdb: --split takes right, left, down, or up",
  });
});

test("--size takes a fraction between 0.2 and 0.95", () => {
  expect(parseArgs(["--split", "right", "--size", "0.4"], "/w", {})).toMatchObject({ size: 0.4 });
  for (const bad of ["0.1", "1", "half"]) {
    expect(parseArgs(["--size", bad], "/w", {})).toEqual({
      error: "mdb: --size takes a number between 0.2 and 0.95",
    });
  }
});

test("--new asks for a new pane", () => {
  expect(parseArgs(["--new"], "/w", {})).toMatchObject({ fresh: true });
});

test("--replace asks to replace the current tab", () => {
  expect(parseArgs(["--replace"], "/w", {})).toMatchObject({ replace: true });
});

test("--heading names a heading to go to", () => {
  expect(start([FIX("README.md"), "--heading", "Install it"])).toMatchObject({
    heading: "Install it",
  });
  expect(parseArgs(["--heading"], "/w", {})).toEqual({ error: "mdb: --heading takes a value" });
});

test("the tab comes from --tab, then from cmux", () => {
  expect(start(["--tab", "w1:t2"])).toMatchObject({ tab: "w1:t2" });
  expect(start([], "/w", { CMUX_WORKSPACE_ID: "ABC" })).toMatchObject({ tab: "ABC" });
  expect(start(["--tab=w1:t2"], "/w", { CMUX_WORKSPACE_ID: "ABC" })).toMatchObject({
    tab: "w1:t2",
  });
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

test("- reads stdin, rooted at the working folder", () => {
  const parsed = parseArgs(["-"], "/w", {});
  expect(parsed).toMatchObject({ stdin: true, title: null, start: { root: "/w", openPath: null } });
});

test("--title names a stdin document", () => {
  expect(parseArgs(["-", "--title", "Work summary"], "/w", {})).toMatchObject({
    stdin: true,
    title: "Work summary",
  });
});

test("--title without stdin is an error", () => {
  const error = { error: "mdb: --title works only with stdin (-)" };
  expect(parseArgs(["--title", "x"], "/w", {})).toEqual(error);
  expect(parseArgs([FIX("README.md"), "--title", "x"], "/w", {})).toEqual(error);
});

test("--wait-token sets the start token", () => {
  expect(start(["--wait-token", "abc"])).toMatchObject({ waitToken: "abc" });
});
