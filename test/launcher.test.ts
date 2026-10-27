import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { FIX, FIXTURES } from "./helpers.ts";

const BIN = join(import.meta.dirname, "..", "bin", "mdb.js");

beforeAll(() => {
  spawnSync("node", [join(import.meta.dirname, "..", "scripts", "build.mjs")], { stdio: "ignore" });
});

test("a missing path exits 1 with a one-line error", () => {
  const r = spawnSync("node", [BIN, "nope.md"], { cwd: FIXTURES, encoding: "utf8" });
  expect(r.status).toBe(1);
  expect(r.stderr.trim()).toBe("mdb: nope.md: no such file or folder");
});

test("a non-markdown file exits 1", () => {
  const r = spawnSync("node", [BIN, FIX("notes.txt")], { encoding: "utf8" });
  expect(r.status).toBe(1);
  expect(r.stderr.trim()).toBe(`mdb: ${FIX("notes.txt")}: not a markdown file`);
});

test("--help prints usage and exits 0", () => {
  const r = spawnSync("node", [BIN, "--help"], { encoding: "utf8" });
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("usage: mdb [file.md | folder | -] [options]");
  expect(r.stdout).toContain("--split <direction>");
});

test("mdb - with empty stdin exits 1", () => {
  const r = spawnSync("node", [BIN, "-"], { input: "  \n", encoding: "utf8" });
  expect(r.status).toBe(1);
  expect(r.stderr.trim()).toBe("mdb: stdin is empty");
});

test("--title with no pipe on stdin exits 1", () => {
  const r = spawnSync("node", [BIN, "--title", "x"], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  expect(r.status).toBe(1);
  expect(r.stderr.trim()).toBe("mdb: --title needs markdown on stdin");
});

test("--title reads a plain pipe to its end", () => {
  const r = spawnSync("node", [BIN, "--title", "x"], { input: "", encoding: "utf8" });
  expect(r.stderr.trim()).toBe("mdb: stdin is empty");
});
