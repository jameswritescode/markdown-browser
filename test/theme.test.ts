import { expect, test } from "vitest";
import { themeVariables } from "../src/core/theme.ts";

const t = { background: [30, 30, 30], foreground: [220, 220, 220], ansi: [] };

test("transparent mode leaves the page background clear", () => {
  expect(themeVariables(t, "transparent")["--bg"]).toBe("transparent");
});

test("diagrams use the terminal background in both modes", () => {
  // Pele paints label patches, dot rings and text on coloured boxes with this colour.
  expect(themeVariables(t, "transparent")["--pele-bg"]).toBe("rgb(30 30 30)");
});

test("solid mode paints the terminal background", () => {
  expect(themeVariables(t, "solid")["--bg"]).toBe("rgb(30 30 30)");
  expect(themeVariables(t, "solid")["--pele-bg"]).toBe("rgb(30 30 30)");
});

test("foreground and surfaces derive from the terminal foreground", () => {
  expect(themeVariables(t, "transparent")["--fg"]).toBe("rgb(220 220 220)");
  expect(themeVariables(t, "transparent")["--surface"]).toBe("rgb(220 220 220 / 0.06)");
});

test("accent uses ansi blue when present", () => {
  const ansi = [null, null, null, null, [10, 20, 200]];
  expect(themeVariables({ ...t, ansi }, "transparent")["--accent"]).toBe("rgb(10 20 200)");
});

test("falls back when pixel has no theme yet", () => {
  expect(themeVariables(null, "transparent")["--fg"]).toBe("rgb(220 220 220)");
});
