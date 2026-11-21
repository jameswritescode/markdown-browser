import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Terminal } from "@zenbu-labs/pixel/terminal";
import { expect, test } from "vitest";
import { cellSize, placeholderSize, rexHost } from "../src/cli/rex.ts";

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

test("mdb reads the cell size from the reply to CSI 16 t", () => {
  expect(cellSize("\x1b[6;16;8t")).toEqual({ width: 8, height: 16 });
  expect(cellSize("\x1b[4;384;640t\x1b[6;37;17t")).toEqual({ width: 17, height: 37 });
  expect(cellSize("\x1b[6;16")).toBeNull();
});

test("while mdb waits for the real size, the process stays alive", async () => {
  const rex = fileURLToPath(new URL("../src/cli/rex.ts", import.meta.url));
  const child = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    `const { resized } = await import(${JSON.stringify(rex)}); await resized(null);`,
  ]);
  const exited = new Promise<boolean>((done) => child.on("exit", () => done(true)));
  const exitedEarly = await Promise.race([
    exited,
    new Promise((done) => setTimeout(done, 1_000, false)),
  ]);
  child.kill();
  expect(exitedEarly).toBe(false);
});
