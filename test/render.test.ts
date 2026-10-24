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

test("leaves code blocks with no language uncoloured", () => {
  const r = renderMarkdown("```\nplain text\n  keeps its spaces\n```\n", FIX("README.md"));
  expect(r.html).toContain('<pre><code class="hljs">plain text\n  keeps its spaces\n</code></pre>');
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

test("malformed percent-encoding in an image does not break the document", () => {
  const r = renderMarkdown('# T\n\n<img src="100%.png">\n', FIX("README.md"));
  expect(r.title).toBe("T");
  expect(r.html).toContain("<img");
});

test("image query strings and hashes are dropped from local paths", () => {
  const r = renderMarkdown("![x](image.png?raw=true)\n\n![y](image.png#light)\n", FIX("README.md"));
  const href = pathToFileURL(FIX("image.png")).href;
  expect(r.html.match(new RegExp(`src="${href}"`, "g"))).toHaveLength(2);
});
