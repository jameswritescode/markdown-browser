import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { instancesDir, listInstances } from "../src/core/registry.ts";
import { listWaiting, longWait, markWaiting } from "../src/core/waiting.ts";

let state: string;
let env: NodeJS.ProcessEnv;
beforeEach(() => {
  state = mkdtempSync(join(tmpdir(), "mdb-waiting-"));
  env = { XDG_STATE_HOME: state };
});
afterEach(() => rmSync(state, { recursive: true, force: true }));

test("an mdb that waits before it starts is listed as waiting, not as an instance", () => {
  const mark = markWaiting({ tab: "w:1", token: "t0k" }, env);
  expect(listWaiting(env)).toEqual([
    { pid: process.pid, tab: "w:1", token: "t0k", since: expect.any(Number) },
  ]);
  expect(listInstances(env)).toEqual([]);
  mark.withdraw();
  expect(listWaiting(env)).toEqual([]);
});

test("a wait is long only after 2 seconds, because a visible pane waits for a moment", () => {
  const info = { pid: 1, tab: null, token: null, since: 10_000 };
  expect(longWait(info, 11_000)).toBe(false);
  expect(longWait(info, 12_500)).toBe(true);
});

test("waiting records of dead processes are removed", () => {
  const dir = instancesDir(env);
  markWaiting({ tab: null, token: null }, env).withdraw();
  const dead = join(dir, "999999.waiting");
  writeFileSync(dead, JSON.stringify({ pid: 999999, tab: "w:1", token: null, since: 1 }));
  expect(listWaiting(env)).toEqual([]);
  expect(existsSync(dead)).toBe(false);
});
