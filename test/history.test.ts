import { expect, test } from "vitest";
import { History } from "../src/page/history.ts";

test("back and forward walk the stack", () => {
  const h = new History<string>();
  h.push("a");
  h.push("b");
  h.push("c");
  expect(h.back()).toBe("b");
  expect(h.back()).toBe("a");
  expect(h.back()).toBeNull();
  expect(h.current).toBe("a");
  expect(h.forward()).toBe("b");
});

test("push discards forward entries", () => {
  const h = new History<string>();
  h.push("a");
  h.push("b");
  h.back();
  h.push("d");
  expect(h.canForward).toBe(false);
  expect(h.current).toBe("d");
  expect(h.back()).toBe("a");
});

test("empty history has nothing to go back or forward to", () => {
  const h = new History<string>();
  expect(h.current).toBeNull();
  expect(h.canBack).toBe(false);
  expect(h.forward()).toBeNull();
});

test("replace updates the current entry in place", () => {
  const h = new History<{ path: string; scrollY: number }>();
  h.push({ path: "a", scrollY: 0 });
  h.replace({ path: "a", scrollY: 300 });
  h.push({ path: "b", scrollY: 0 });
  expect(h.back()).toEqual({ path: "a", scrollY: 300 });
});
