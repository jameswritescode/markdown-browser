import { expect, test } from "vitest";
import {
  chooseAction,
  isGone,
  reuseLine,
  splitCommand,
  wantsHelp,
  wantsSkill,
} from "../src/cli/launch.ts";
import type { InstanceInfo } from "../src/core/registry.ts";
import type { Launch } from "../src/shared/types.ts";

const launch = (over: Partial<Launch> = {}, openPath: string | null = "/d/a.md"): Launch => ({
  start: {
    root: "/d",
    openPath,
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
  ...over,
});
const instance = (pid: number, tab: string | null): InstanceInfo => ({
  pid,
  socket: `/s/${pid}.sock`,
  tab,
  startedAt: pid,
});

test("runs in place in an interactive terminal without --split", () => {
  expect(chooseAction(launch(), { tty: true, tab: "t", instances: [instance(1, "t")] })).toEqual({
    kind: "here",
  });
});

test("splits right when there is no terminal, as in an agent's shell", () => {
  expect(chooseAction(launch(), { tty: false, tab: null, instances: [] })).toEqual({
    kind: "split",
    direction: "right",
  });
});

test("--split chooses the direction", () => {
  expect(chooseAction(launch({ split: "down" }), { tty: true, tab: null, instances: [] })).toEqual({
    kind: "split",
    direction: "down",
  });
});

test("reuses the first mdb in the same tab", () => {
  const found = [instance(3, "other"), instance(2, "t"), instance(1, "t")];
  expect(chooseAction(launch(), { tty: false, tab: "t", instances: found })).toEqual({
    kind: "reuse",
    instance: found[1],
  });
});

test("does not reuse with --new, without a document, or without a known tab", () => {
  const found = [instance(1, "t")];
  const split = { kind: "split", direction: "right" };
  expect(chooseAction(launch({ fresh: true }), { tty: false, tab: "t", instances: found })).toEqual(
    split,
  );
  expect(chooseAction(launch({}, null), { tty: false, tab: "t", instances: found })).toEqual(split);
  expect(chooseAction(launch(), { tty: false, tab: null, instances: found })).toEqual(split);
});

test("the split command starts this mdb with the same options and the tab", () => {
  const command = splitCommand(
    "/usr/bin/node",
    "/pkg/bin/mdb.js",
    launch({ split: "right" }, "/d/a.md"),
    "w:1",
  );
  expect(command).toEqual(["/usr/bin/node", "/pkg/bin/mdb.js", "/d/a.md", "--tab", "w:1"]);
  const all = launch({}, "/d/a.md");
  all.start.background = "solid";
  all.start.heading = "Open questions";
  expect(splitCommand("n", "m", all, null)).toEqual([
    "n",
    "m",
    "/d/a.md",
    "--solid",
    "--heading=Open questions",
  ]);
  expect(splitCommand("n", "m", launch({}, null), null)).toEqual(["n", "m", "/d"]);
});

test("the split command leaves out --replace, because a new pane has one tab", () => {
  expect(splitCommand("n", "m", launch({ replace: true }, "/d/a.md"), null)).toEqual([
    "n",
    "m",
    "/d/a.md",
  ]);
});

test("help is a flag, not a flag value", () => {
  expect(wantsHelp(["--help"])).toBe(true);
  expect(wantsHelp(["a.md", "-h"])).toBe(true);
  expect(wantsHelp(["a.md", "--heading", "-h"])).toBe(false);
  expect(wantsHelp(["a.md", "--heading=-h"])).toBe(false);
});

test("skill install is a command, but a folder named skill still opens", () => {
  expect(wantsSkill(["skill", "install"])).toBe(true);
  expect(wantsSkill(["skill"])).toBe(false);
  expect(wantsSkill(["docs", "install"])).toBe(false);
});

test("only a missing or refusing socket counts as a gone mdb", () => {
  const coded = (code: string) => Object.assign(new Error(code), { code });
  expect(isGone(coded("ENOENT"))).toBe(true);
  expect(isGone(coded("ECONNREFUSED"))).toBe(true);
  expect(isGone(new Error("mdb did not answer"))).toBe(false);
});

test("the reuse line says what the mdb pane did", () => {
  expect(reuseLine("tab", "a.md")).toBe("mdb: opened a.md in a tab in the mdb pane");
  expect(reuseLine("switched", "a.md")).toBe("mdb: switched to a.md in the mdb pane");
  expect(reuseLine("replaced", "a.md")).toBe("mdb: showing a.md in the mdb pane");
  // An mdb from before tabs replies without a result: it replaced the document.
  expect(reuseLine(undefined, "a.md")).toBe("mdb: showing a.md in the mdb pane");
});
