import { expect, test } from "vitest";
import { findHost, withDefaults } from "../src/cli/host.ts";

const REX = { REX_SESSION: "session:S", REX_BLOCK: "block:B" };

test("in Rex, the host is Rex: 10 frames each second, as kitty animation frames in files", () => {
  const host = findHost(REX);
  expect(host.terminal?.name).toBe("rex");
  expect(host.render).toEqual({ fps: 10, frames: "file", present: "animation" });
});

test("inside tmux in Rex, and in other terminals, the host is pixel's terminal", () => {
  for (const env of [{ ...REX, TMUX: "/tmp/tmux,1,0" }, { TERM_PROGRAM: "WezTerm" }]) {
    const host = findHost(env);
    expect(host.terminal?.name).not.toBe("rex");
    expect(host.render).toEqual({ fps: null, frames: null, present: null });
  }
});

test("the default host knows the tab of an mdb that you start in cmux", async () => {
  expect(await findHost({ CMUX_WORKSPACE_ID: "ABC" }).tab()).toBe("ABC");
  expect(await findHost({}).tab()).toBeNull();
});

test("options that the user gives win over the defaults of the host", () => {
  expect(
    withDefaults(
      { fps: 60, frames: null, present: "full" },
      { fps: 10, frames: "file", present: "animation" },
    ),
  ).toEqual({ fps: 60, frames: "file", present: "full" });
});
