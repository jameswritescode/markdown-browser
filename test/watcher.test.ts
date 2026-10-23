import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { DocWatcher } from "../src/main/watcher.ts";

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
let watcher: DocWatcher | null = null;
afterEach(() => watcher?.close());

test("notifies on change", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "mdb-watch-")), "a.md");
  writeFileSync(path, "one");
  const seen: string[] = [];
  watcher = new DocWatcher((p) => seen.push(p));
  watcher.set(path);
  await sleep(100);
  writeFileSync(path, "two");
  await sleep(400);
  expect(seen).toContain(path);
});

test("recovers after the file is deleted and created again", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "mdb-watch-")), "a.md");
  writeFileSync(path, "one");
  const seen: string[] = [];
  watcher = new DocWatcher((p) => seen.push(p));
  watcher.set(path);
  await sleep(100);
  rmSync(path);
  await sleep(1500);
  seen.length = 0;
  writeFileSync(path, "back");
  await sleep(1500);
  expect(seen).toContain(path);
});
