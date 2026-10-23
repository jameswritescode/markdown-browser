import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { classifyLink, isOpenableUrl } from "../src/core/links.ts";
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

test("malformed percent-encoding does not throw", () => {
  expect(classifyLink("100%", doc)).toMatchObject({ kind: "file" });
  expect(classifyLink("#a%zz", doc)).toEqual({ kind: "anchor", id: "a%zz" });
});

test("file URLs with a host are treated as external, not opened locally", () => {
  expect(classifyLink("file://host/x.md", doc)).toEqual({
    kind: "external",
    url: "file://host/x.md",
  });
});

test("only web and mail URLs may be opened externally", () => {
  expect(isOpenableUrl("https://example.com")).toBe(true);
  expect(isOpenableUrl("http://example.com")).toBe(true);
  expect(isOpenableUrl("mailto:a@b.c")).toBe(true);
  expect(isOpenableUrl("file:///Applications/Calculator.app")).toBe(false);
  expect(isOpenableUrl("vscode://file/x")).toBe(false);
  expect(isOpenableUrl("javascript:alert(1)")).toBe(false);
  expect(isOpenableUrl("not a url")).toBe(false);
});
