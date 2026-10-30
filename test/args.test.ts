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
    pathGiven: false,
    render: { fps: null, frames: null, present: null },
  });
});

test("a given path is marked, so a plain pipe does not read stdin", () => {
  expect(parseArgs([FIX("guide")], "/w", {})).toMatchObject({ pathGiven: true });
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

test("the tab comes from --tab, and the host finds it when there is no --tab", () => {
  expect(start(["--tab", "w1:t2"])).toMatchObject({ tab: "w1:t2" });
  expect(start([], "/w", { CMUX_WORKSPACE_ID: "ABC" })).toMatchObject({ tab: null });
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

test("--title with a file or folder is an error", () => {
  const error = { error: "mdb: --title needs markdown on stdin" };
  expect(parseArgs([FIX("README.md"), "--title", "x"], "/w", {})).toEqual(error);
  expect(parseArgs([FIX("guide"), "--title", "x"], "/w", {})).toEqual(error);
});

test("--title alone leaves the pipe check to the CLI", () => {
  expect(parseArgs(["--title", "x"], "/w", {})).toMatchObject({ stdin: false, title: "x" });
});

test("--wait-token sets the start token", () => {
  expect(start(["--wait-token", "abc"])).toMatchObject({ waitToken: "abc" });
});

const render = (argv: string[], env: NodeJS.ProcessEnv = {}) => {
  const parsed = parseArgs(argv, "/w", env);
  return "error" in parsed ? parsed.error : parsed.render;
};

test("--fps, --frames, and --present set how pixel draws, and the flags win over their variables", () => {
  expect(render(["--fps", "24", "--frames=inline", "--present", "full"])).toEqual({
    fps: 24,
    frames: "inline",
    present: "full",
  });
  expect(render([], { MDB_FPS: "45", MDB_FRAMES: "shared", MDB_PRESENT: "patched" })).toEqual({
    fps: 45,
    frames: "shared",
    present: "patched",
  });
  expect(render(["--fps=60"], { MDB_FPS: "45" })).toEqual({ fps: 60, frames: null, present: null });
});

test("a bad frame rate, frame transport, or present method is an error", () => {
  expect(render(["--fps", "0"])).toBe("mdb: --fps takes a number from 1 to 240");
  expect(render(["--fps", "fast"])).toBe("mdb: --fps takes a number from 1 to 240");
  expect(render([], { MDB_FPS: "500" })).toBe("mdb: MDB_FPS takes a number from 1 to 240");
  expect(render(["--frames", "pipe"])).toBe("mdb: --frames takes shared, file, or inline");
  expect(render([], { MDB_FRAMES: "x" })).toBe("mdb: MDB_FRAMES takes shared, file, or inline");
  expect(render(["--present", "gif"])).toBe("mdb: --present takes full, patched, or animation");
  expect(render([], { MDB_PRESENT: "" })).toBe(
    "mdb: MDB_PRESENT takes full, patched, or animation",
  );
});

test("render options that are not given stay empty, so that the host can choose them", () => {
  expect(render([], { REX_SESSION: "session:S", REX_BLOCK: "block:B" })).toEqual({
    fps: null,
    frames: null,
    present: null,
  });
});
