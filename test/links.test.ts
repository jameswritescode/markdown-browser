import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { classifyLink } from "../src/core/links.ts";
import { FIX } from "./helpers.ts";

const doc = FIX("guide/setup.md");

test("same-page anchor", () => {
  expect(classifyLink("#install", doc)).toEqual({ kind: "anchor", id: "install" });
});

test("relative markdown link with anchor", () => {
  expect(classifyLink("../README.md#usage", doc)).toEqual({
    kind: "doc",
    path: FIX("README.md"),
    anchor: "usage",
    exists: true,
  });
});

test("missing markdown file", () => {
  expect(classifyLink("missing.md", doc)).toMatchObject({
    kind: "doc",
    exists: false,
    anchor: null,
  });
});

test("non-markdown local file", () => {
  expect(classifyLink("../image.png", doc)).toEqual({ kind: "file", path: FIX("image.png") });
});

test("web and mail links are external", () => {
  expect(classifyLink("https://example.com", doc)).toEqual({
    kind: "external",
    url: "https://example.com",
  });
  expect(classifyLink("mailto:a@b.c", doc)).toMatchObject({ kind: "external" });
});

test("percent-encoded paths are decoded", () => {
  expect(classifyLink("my%20doc.md", doc)).toMatchObject({
    kind: "doc",
    path: FIX("guide/my doc.md"),
  });
});

test("file URLs resolve to paths", () => {
  expect(classifyLink(pathToFileURL(FIX("README.md")).href, doc)).toMatchObject({
    kind: "doc",
    path: FIX("README.md"),
    exists: true,
  });
});
