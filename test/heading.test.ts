import { expect, test } from "vitest";
import { findHeading } from "../src/core/heading.ts";

const outline = [
  { level: 1, text: "Release notes", id: "release-notes" },
  { level: 2, text: "What changed", id: "what-changed" },
  { level: 2, text: "Open questions", id: "open-questions" },
  { level: 3, text: "What changed", id: "what-changed-1" },
];

test("matches heading text without regard to case or outer spaces", () => {
  expect(findHeading(outline, "open questions")).toBe("open-questions");
  expect(findHeading(outline, "  What Changed ")).toBe("what-changed");
});

test("matches a heading id or the slug of the text", () => {
  expect(findHeading(outline, "what-changed-1")).toBe("what-changed-1");
  expect(findHeading(outline, "#open-questions")).toBe("open-questions");
  expect(findHeading(outline, "Open questions?")).toBe("open-questions");
});

test("falls back to the first heading that starts with the text", () => {
  expect(findHeading(outline, "open")).toBe("open-questions");
});

test("returns null when nothing matches", () => {
  expect(findHeading(outline, "Install")).toBeNull();
  expect(findHeading(outline, "  ")).toBeNull();
});
