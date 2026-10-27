import { expect, test } from "vitest";
import { routeOpen } from "../src/page/tab-route.ts";

const doc = (path: string) => ({ path });
const finder = { path: null };

test("an open path switches to its tab, in both modes", () => {
  const tabs = [doc("/a.md"), doc("/b.md")];
  expect(routeOpen(tabs, 1, "/a.md", "tab")).toEqual({ kind: "switch", index: 0 });
  expect(routeOpen(tabs, 1, "/a.md", "replace")).toEqual({ kind: "switch", index: 0 });
  expect(routeOpen(tabs, 1, "/b.md", "tab")).toEqual({ kind: "switch", index: 1 });
});

test("a front tab on its finder takes the document, in both modes", () => {
  const tabs = [doc("/a.md"), finder];
  expect(routeOpen(tabs, 1, "/c.md", "tab")).toEqual({ kind: "reuse", index: 1 });
  expect(routeOpen(tabs, 1, "/c.md", "replace")).toEqual({ kind: "reuse", index: 1 });
});

test("tab mode adds a tab when the front tab shows a document", () => {
  expect(routeOpen([doc("/a.md")], 0, "/c.md", "tab")).toEqual({ kind: "new" });
});

test("replace mode replaces the front tab's document", () => {
  expect(routeOpen([doc("/a.md"), doc("/b.md")], 1, "/c.md", "replace")).toEqual({
    kind: "replace",
    index: 1,
  });
});

test("a background tab on its finder does not take the document", () => {
  expect(routeOpen([doc("/a.md"), finder], 0, "/c.md", "tab")).toEqual({ kind: "new" });
});
