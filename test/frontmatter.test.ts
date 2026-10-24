import { expect, test } from "vitest";
import { splitFrontmatter } from "../src/core/frontmatter.ts";
import { renderMarkdown } from "../src/core/render.ts";
import { titleOf } from "../src/core/scan.ts";
import { FIX } from "./helpers.ts";

const SAMPLE = "---\ntitle: Hello\ntags: [a, b]\n---\n\n# Doc\n\nBody\n";

test("splits YAML frontmatter from the body", () => {
  const result = splitFrontmatter(SAMPLE);
  expect(result.frontmatter).toEqual({ data: { title: "Hello", tags: ["a", "b"] } });
  expect(result.body).toBe("\n# Doc\n\nBody\n");
});

test("accepts CRLF line endings and a ... closing line", () => {
  const result = splitFrontmatter("---\r\ntitle: Hi\r\n...\r\nBody\r\n");
  expect(result.frontmatter).toEqual({ data: { title: "Hi" } });
  expect(result.body).toBe("Body\r\n");
});

test("leaves documents without frontmatter alone", () => {
  for (const source of ["# Doc\n", "text\n---\nkey: value\n---\n", "---\nnot closed\n", ""]) {
    expect(splitFrontmatter(source)).toEqual({ frontmatter: null, body: source });
  }
});

test("keeps frontmatter that is not a YAML mapping as raw text", () => {
  expect(splitFrontmatter("---\nkey: [unclosed\n---\nBody\n").frontmatter).toEqual({
    raw: "key: [unclosed",
  });
  expect(splitFrontmatter("---\n- a list\n---\nBody\n").frontmatter).toEqual({ raw: "- a list" });
});

test("treats an empty frontmatter block as no data", () => {
  expect(splitFrontmatter("---\n---\nBody\n")).toEqual({ frontmatter: null, body: "Body\n" });
});

test("renders frontmatter as a block and keeps it out of the body and outline", () => {
  const doc = renderMarkdown(SAMPLE, FIX("README.md"));
  expect(doc.html).not.toContain("<hr");
  expect(doc.html).toContain('<div class="frontmatter">');
  expect(doc.html).toContain(
    '<span class="fm-key">title</span><span class="fm-value">Hello</span>',
  );
  expect(doc.html).toContain('<span class="fm-item">a</span><span class="fm-item">b</span>');
  expect(doc.outline).toEqual([{ level: 1, text: "Doc", id: "doc" }]);
});

test("escapes frontmatter values", () => {
  const doc = renderMarkdown('---\ntitle: "<img src=x onerror=alert(1)>"\n---\n', FIX("README.md"));
  expect(doc.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(doc.html).not.toContain("<img");
});

test("shows nested values as inline code", () => {
  const doc = renderMarkdown("---\nauthor:\n  name: Ada\n---\n", FIX("README.md"));
  expect(doc.html).toContain('<code>{"name":"Ada"}</code>');
});

test("shows frontmatter that does not parse as a YAML code block", () => {
  const doc = renderMarkdown("---\nkey: [unclosed\n---\n# Doc\n", FIX("README.md"));
  expect(doc.html).toContain('<pre class="frontmatter-raw"><code>key: [unclosed</code></pre>');
  expect(doc.outline).toEqual([{ level: 1, text: "Doc", id: "doc" }]);
});

test("titles come from the frontmatter title first", () => {
  expect(titleOf(SAMPLE, "x.md")).toBe("Hello");
  expect(titleOf("---\ndate: 2026-10-24\n---\n# Heading\n", "x.md")).toBe("Heading");
  expect(titleOf("---\ndate: 2026-10-24\n---\nno heading\n", "notes.md")).toBe("notes");
});
