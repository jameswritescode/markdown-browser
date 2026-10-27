import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { DocWatcher, DocWatchers, FolderWatchers } from "../src/main/watcher.ts";

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
let watcher: DocWatcher | DocWatchers | FolderWatchers | null = null;
afterEach(() => watcher?.close());

const twoFiles = () => {
  const dir = mkdtempSync(join(tmpdir(), "mdb-watch-"));
  const a = join(dir, "a.md");
  const b = join(dir, "b.md");
  writeFileSync(a, "a");
  writeFileSync(b, "b");
  return { a, b };
};

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

test("DocWatchers notifies for each watched path", async () => {
  const { a, b } = twoFiles();
  const seen: string[] = [];
  watcher = new DocWatchers((p) => seen.push(p));
  watcher.set([a, b]);
  await sleep(100);
  writeFileSync(b, "b2");
  await sleep(400);
  expect(seen).toContain(b);
  expect(seen).not.toContain(a);
});

test("DocWatchers stops watching a removed path", async () => {
  const { a, b } = twoFiles();
  const seen: string[] = [];
  watcher = new DocWatchers((p) => seen.push(p));
  watcher.set([a, b]);
  watcher.set([a]);
  await sleep(100);
  writeFileSync(b, "b2");
  await sleep(400);
  expect(seen).not.toContain(b);
  writeFileSync(a, "a2");
  await sleep(400);
  expect(seen).toContain(a);
});

test("FolderWatchers notifies when a markdown file appears in a watched folder", async () => {
  const root = mkdtempSync(join(tmpdir(), "mdb-folder-"));
  mkdirSync(join(root, "sub"));
  const seen: string[] = [];
  watcher = new FolderWatchers((p) => seen.push(p));
  watcher.set([root]);
  await sleep(100);
  writeFileSync(join(root, "sub", "new.md"), "# New");
  await sleep(600);
  expect(seen).toContain(root);
});

test("FolderWatchers ignores files that are not markdown", async () => {
  const root = mkdtempSync(join(tmpdir(), "mdb-folder-"));
  const seen: string[] = [];
  watcher = new FolderWatchers((p) => seen.push(p));
  watcher.set([root]);
  await sleep(100);
  writeFileSync(join(root, "notes.txt"), "text");
  await sleep(600);
  expect(seen).toEqual([]);
});
