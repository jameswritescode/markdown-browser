import { expect, test } from "vitest";
import { type OpenMode, routeOpen, type TabSummary } from "../src/page/tab-route.ts";

const doc = (path: string, paths: string[] = [path]): TabSummary => ({ path, root: "/", paths });
const finder = (root = "/"): TabSummary => ({ path: null, root, paths: [] });
const file = (path: string, mode: OpenMode = "tab") => ({ path, root: "/", mode });
const folder = (root: string, mode: OpenMode = "tab") => ({ path: null, root, mode });

test("an open path switches to its tab, in both modes", () => {
  const tabs = [doc("/a.md"), doc("/b.md")];
  expect(routeOpen(tabs, 1, file("/a.md"))).toEqual({ kind: "switch", index: 0 });
  expect(routeOpen(tabs, 1, file("/a.md", "replace"))).toEqual({ kind: "switch", index: 0 });
  expect(routeOpen(tabs, 1, file("/b.md"))).toEqual({ kind: "switch", index: 1 });
});

test("a front tab on its finder takes the document, in both modes", () => {
  const tabs = [doc("/a.md"), finder()];
  expect(routeOpen(tabs, 1, file("/c.md"))).toEqual({ kind: "reuse", index: 1 });
  expect(routeOpen(tabs, 1, file("/c.md", "replace"))).toEqual({ kind: "reuse", index: 1 });
});

test("tab mode adds a tab when the front tab shows a document", () => {
  expect(routeOpen([doc("/a.md")], 0, file("/c.md"))).toEqual({ kind: "new" });
});

test("replace mode replaces the front tab's document", () => {
  expect(routeOpen([doc("/a.md"), doc("/b.md")], 1, file("/c.md", "replace"))).toEqual({
    kind: "replace",
    index: 1,
  });
});

test("a background tab on its finder does not take the document", () => {
  expect(routeOpen([doc("/a.md"), finder()], 0, file("/c.md"))).toEqual({ kind: "new" });
});

test("a titled stdin key in a tab's history updates that tab, in both modes", () => {
  const key = "stdin:title:Work summary";
  const tabs = [doc("/a.md"), doc("/b.md", [key, "/b.md"])];
  expect(routeOpen(tabs, 0, file(key))).toEqual({ kind: "update", index: 1 });
  expect(routeOpen(tabs, 0, file(key, "replace"))).toEqual({ kind: "update", index: 1 });
  expect(routeOpen([doc(key)], 0, file(key))).toEqual({ kind: "update", index: 0 });
});

test("an untitled stdin key opens a new tab", () => {
  expect(routeOpen([doc("/a.md")], 0, file("stdin:0f0f"))).toEqual({ kind: "new" });
});

test("a folder switches to a tab on the file list of that folder", () => {
  const tabs = [doc("/a.md"), finder("/docs")];
  expect(routeOpen(tabs, 0, folder("/docs"))).toEqual({ kind: "switch", index: 1 });
  expect(routeOpen(tabs, 0, folder("/docs", "replace"))).toEqual({ kind: "switch", index: 1 });
});

test("a folder in replace mode replaces the front tab", () => {
  expect(routeOpen([doc("/a.md"), finder("/x")], 0, folder("/docs", "replace"))).toEqual({
    kind: "replace",
    index: 0,
  });
});

test("a folder otherwise opens a new tab, even when the front tab is on its finder", () => {
  expect(routeOpen([finder("/x")], 0, folder("/docs"))).toEqual({ kind: "new" });
});

test("a tab that waits for its first document takes only that document", () => {
  const waiting: TabSummary = { path: null, root: "/", paths: [], waiting: true };
  expect(routeOpen([waiting], 0, file("/c.md"))).toEqual({ kind: "new" });
  expect(routeOpen([waiting], 0, folder("/"))).toEqual({ kind: "new" });
  expect(routeOpen([waiting], 0, { ...file("stdin:abc"), claim: true })).toEqual({
    kind: "reuse",
    index: 0,
  });
});
