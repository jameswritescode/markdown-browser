import type { Terminal } from "@zenbu-labs/pixel/terminal";
import { expect, test } from "vitest";
import { placeholderSize, rexHost } from "../src/cli/rex.ts";

function rexTerminal(pane: { id: string; tab: string } | Error): Terminal {
  return {
    name: "rex",
    getCurrentPane: async () => {
      if (pane instanceof Error) throw pane;
      return pane;
    },
  };
}

test("in Rex, the tab of an mdb that you start yourself is the window of its block", async () => {
  const host = rexHost(rexTerminal({ id: "block:B", tab: "window:W" }));
  expect(await host.tab()).toBe("window:W");
});

test("when Rex cannot find the block, the mdb has no tab", async () => {
  expect(await rexHost(rexTerminal(new Error("no server"))).tab()).toBeNull();
});

test("a new Rex pane is 80x24 with 8x16 cells until a Rex window shows it", () => {
  expect(placeholderSize(80, 24, { width: 8, height: 16 })).toBe(true);
  expect(placeholderSize(154, 22, { width: 8, height: 16 })).toBe(false);
  expect(placeholderSize(80, 24, { width: 17, height: 37 })).toBe(false);
});
