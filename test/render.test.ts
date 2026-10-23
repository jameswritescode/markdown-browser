import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { loadDoc, renderMarkdown } from "../src/core/render.ts";
import { FIX } from "./helpers.ts";

const doc = renderMarkdown(readFileSync(FIX("README.md"), "utf8"), FIX("README.md"));

test("renders GitHub-flavoured blocks", () => {
  expect(doc.html).toContain("<table");
  expect(doc.html).toMatch(/<input[^>]*\btype="checkbox"[^>]*>/);
  expect(doc.html).toMatch(/<input(?=[^>]*\btype="checkbox")(?=[^>]*\bdisabled)[^>]*>/);
  expect(doc.html).toContain('class="footnotes');
});

test("renders GitHub alerts", () => {
  expect(doc.html).toContain('class="markdown-alert markdown-alert-note"');
  expect(doc.html).toContain('class="markdown-alert markdown-alert-warning"');
  expect(doc.html).toContain('<p class="markdown-alert-title">Note</p>');
  expect(doc.html).not.toContain("[!NOTE]");
  expect(doc.html).toContain("<blockquote>\n<p>A plain quote.</p>");
});

test("highlights code and leaves mermaid source for Pele", () => {
  expect(doc.html).toContain('class="hljs');
  expect(doc.html).toMatch(/<pre class="mermaid">flowchart LR\n {2}A\[Markdown\] --&gt; B\[Pele\]/);
});

test("resolves relative images and keeps remote ones", () => {
  expect(doc.html).toContain(`src="${pathToFileURL(FIX("image.png")).href}"`);
  expect(doc.html).toContain('src="https://example.com/a.png"');
});

test("sanitizes scripts but keeps details", () => {
  expect(doc.html).not.toContain("<script");
  expect(doc.html).toContain("<details>");
});

test("builds an outline with unique ids", () => {
  expect(doc.outline[0]).toEqual({ level: 1, text: "Fixture Docs", id: "fixture-docs" });
  expect(new Set(doc.outline.map((o) => o.id)).size).toBe(doc.outline.length);
  expect(doc.html).toContain('id="fixture-docs"');
  expect(doc.title).toBe("Fixture Docs");
  expect(doc.path).toBe(FIX("README.md"));
});

test("loadDoc renders a file, or reports it missing", async () => {
  expect(((await loadDoc(FIX("README.md"))) as { title: string }).title).toBe("Fixture Docs");
  expect(await loadDoc(FIX("gone.md"))).toEqual({ missing: true, path: FIX("gone.md") });
});
