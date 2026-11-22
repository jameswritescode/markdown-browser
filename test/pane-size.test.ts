import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { cellSize } from "../src/cli/pane-size.ts";

test("mdb reads the cell size from the reply to CSI 16 t", () => {
  expect(cellSize("\x1b[6;16;8t")).toEqual({ width: 8, height: 16 });
  expect(cellSize("\x1b[4;384;640t\x1b[6;37;17t")).toEqual({ width: 17, height: 37 });
  expect(cellSize("\x1b[6;16")).toBeNull();
});

test("while mdb waits for the real size, the process stays alive", async () => {
  const module = fileURLToPath(new URL("../src/cli/pane-size.ts", import.meta.url));
  const child = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    `const { resized } = await import(${JSON.stringify(module)}); await resized(null);`,
  ]);
  const exited = new Promise<boolean>((done) => child.on("exit", () => done(true)));
  const exitedEarly = await Promise.race([
    exited,
    new Promise((done) => setTimeout(done, 1_000, false)),
  ]);
  child.kill();
  expect(exitedEarly).toBe(false);
});
