import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import hljs from "highlight.js";
import markdownIt, { type MarkdownIt, type Token } from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import sanitizeHtml from "sanitize-html";
import type { MissingDoc, OutlineItem, RenderedDoc } from "../shared/types.ts";
import { type Frontmatter, splitFrontmatter } from "./frontmatter.ts";
import { safeDecode } from "./links.ts";
import { titleOf } from "./scan.ts";

const ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;
const ALERT_MARKER = new RegExp(`^\\[!(${ALERT_TYPES.join("|")})\\][ \\t]*(?:\\n|$)`, "i");
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function highlight(md: MarkdownIt, code: string, lang: string): string {
  if (lang === "mermaid")
    return `<pre class="mermaid">${md.utils.escapeHtml(code.trimEnd())}</pre>`;
  const known = lang && hljs.getLanguage(lang);
  const body = known
    ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    : md.utils.escapeHtml(code);
  const langClass = known ? ` language-${md.utils.escapeHtml(lang)}` : "";
  return `<pre><code class="hljs${langClass}">${body}</code></pre>`;
}

function alertRule(md: MarkdownIt) {
  md.core.ruler.after("block", "github_alerts", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!;
      if (open.type !== "blockquote_open") continue;
      const inline = tokens[i + 2];
      if (tokens[i + 1]?.type !== "paragraph_open" || inline?.type !== "inline") continue;
      const marker = ALERT_MARKER.exec(inline.content);
      if (!marker) continue;
      const type = marker[1]!.toLowerCase();
      inline.content = inline.content.slice(marker[0].length);
      const close = findClose(tokens, i);
      if (close === -1) continue;
      open.tag = "div";
      open.attrSet("class", `markdown-alert markdown-alert-${type}`);
      tokens[close]!.tag = "div";
      const title = new state.Token("html_block", "", 0);
      title.content = `<p class="markdown-alert-title">${type[0]!.toUpperCase()}${type.slice(1)}</p>\n`;
      if (inline.content.trim() === "") tokens.splice(i + 1, 3, title);
      else tokens.splice(i + 1, 0, title);
    }
  });
}

function findClose(tokens: Token[], openIndex: number): number {
  let depth = 0;
  for (let j = openIndex; j < tokens.length; j++) {
    const type = tokens[j]!.type;
    if (type === "blockquote_open") depth++;
    else if (type === "blockquote_close" && --depth === 0) return j;
  }
  return -1;
}

function createMarkdown(): MarkdownIt {
  const md: MarkdownIt = markdownIt({
    html: true,
    linkify: true,
    highlight: (code, lang) => highlight(md, code, lang),
  });
  md.use(footnote);
  md.use(taskLists, { enabled: false });
  md.use(anchor, { slugify, uniqueSlugStartIndex: 1 });
  alertRule(md);
  return md;
}

const markdown = createMarkdown();

function sanitize(html: string, docPath: string): string {
  const docDir = dirname(docPath);
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "details",
      "summary",
      "input",
      "del",
      "s",
      "ins",
      "kbd",
      "picture",
      "source",
    ],
    allowedAttributes: {
      "*": ["class", "id", "title", "aria-hidden", "aria-label", "role", "align"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      source: ["srcset", "media", "type"],
      input: ["type", "checked", "disabled"],
      th: ["style"],
      td: ["style"],
      ol: ["start"],
      li: ["value"],
    },
    allowedStyles: {
      th: { "text-align": [/^(left|right|center)$/] },
      td: { "text-align": [/^(left|right|center)$/] },
    },
    allowedSchemes: ["http", "https", "mailto", "file"],
    allowedSchemesByTag: { img: ["http", "https", "file", "data"] },
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src;
        if (src && !SCHEME.test(src) && !src.startsWith("//")) {
          const local = safeDecode(src.split(/[?#]/)[0]!);
          const path = local.startsWith("/") ? local : resolve(docDir, local);
          attribs.src = pathToFileURL(path).href;
        }
        return { tagName, attribs };
      },
    },
  });
}

function outlineOf(tokens: Token[]): OutlineItem[] {
  const outline: OutlineItem[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const id = token.type === "heading_open" ? token.attrGet("id") : null;
    if (typeof id !== "string") continue;
    const text = (tokens[i + 1]?.children ?? [])
      .filter((child) => child.type === "text" || child.type === "code_inline")
      .map((child) => child.content)
      .join("");
    outline.push({ level: Number(token.tag.slice(1)), text, id });
  }
  return outline;
}

function frontmatterValue(value: unknown): string {
  if (Array.isArray(value))
    return value.map((item) => `<span class="fm-item">${frontmatterValue(item)}</span>`).join("");
  if (value === null || value === undefined) return "";
  if (typeof value === "object")
    return `<code>${markdown.utils.escapeHtml(JSON.stringify(value))}</code>`;
  return markdown.utils.escapeHtml(String(value));
}

function frontmatterHtml(frontmatter: Frontmatter | null): string {
  if (!frontmatter) return "";
  if ("raw" in frontmatter)
    return `<pre class="frontmatter-raw"><code>${markdown.utils.escapeHtml(frontmatter.raw)}</code></pre>\n`;
  const rows = Object.entries(frontmatter.data).map(
    ([key, value]) =>
      `<div class="fm-row"><span class="fm-key">${markdown.utils.escapeHtml(key)}</span><span class="fm-value">${frontmatterValue(value)}</span></div>`,
  );
  return `<div class="frontmatter">${rows.join("")}</div>\n`;
}

export function renderMarkdown(source: string, docPath: string): RenderedDoc {
  const { frontmatter, body } = splitFrontmatter(source);
  const env = {};
  const tokens = markdown.parse(body, env);
  const html =
    frontmatterHtml(frontmatter) + markdown.renderer.render(tokens, markdown.options, env);
  return {
    path: docPath,
    title: titleOf(source, basename(docPath)),
    html: sanitize(html, docPath),
    outline: outlineOf(tokens),
  };
}

export async function loadDoc(path: string): Promise<RenderedDoc | MissingDoc> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch {
    return { missing: true, path };
  }
  return renderMarkdown(source, path);
}
