import { expect, test } from "vitest";
import { StdinStore, docPathFor, isStdinKey, stdinKey } from "../src/core/stdin.ts";

test("a titled key is stable, an untitled key is unique", () => {
  expect(stdinKey("A")).toBe("stdin:title:A");
  const one = stdinKey(null);
  expect(one).toMatch(/^stdin:[0-9a-f-]{36}$/);
  expect(stdinKey(null)).not.toBe(one);
});

test("isStdinKey tells keys from file paths", () => {
  expect(isStdinKey(stdinKey("A"))).toBe(true);
  expect(isStdinKey(stdinKey(null))).toBe(true);
  expect(isStdinKey("/a.md")).toBe(false);
});

test("the store keeps and forgets documents", () => {
  const store = new StdinStore();
  const doc = { text: "# x", title: null, base: "/w" };
  store.put("stdin:a", doc);
  expect(store.get("stdin:a")).toEqual(doc);
  store.forget("stdin:a");
  expect(store.get("stdin:a")).toBeNull();
});

test("a stdin document renders as a file in its base folder", () => {
  expect(docPathFor({ text: "", title: null, base: "/w" })).toBe("/w/stdin.md");
});

test("the store keeps the newer text when an older one comes late", () => {
  const store = new StdinStore();
  expect(store.put("k", { text: "new", title: null, base: "/w", sentAt: 2 })).toBe(true);
  expect(store.put("k", { text: "old", title: null, base: "/w", sentAt: 1 })).toBe(false);
  expect(store.get("k")?.text).toBe("new");
  expect(store.put("k", { text: "newer", title: null, base: "/w", sentAt: 3 })).toBe(true);
});
