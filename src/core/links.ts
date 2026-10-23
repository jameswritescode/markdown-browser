import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LinkTarget } from "../shared/types.ts";
import { isMarkdownPath } from "./scan.ts";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function splitHash(href: string): [string, string | null] {
  const hash = href.indexOf("#");
  if (hash === -1) return [href, null];
  return [href.slice(0, hash), decodeURIComponent(href.slice(hash + 1)) || null];
}

export function classifyLink(href: string, docPath: string): LinkTarget {
  if (href.startsWith("#")) return { kind: "anchor", id: decodeURIComponent(href.slice(1)) };
  let target: string;
  let anchor: string | null;
  if (/^file:/i.test(href)) {
    const url = new URL(href);
    anchor = url.hash ? decodeURIComponent(url.hash.slice(1)) : null;
    url.hash = "";
    target = fileURLToPath(url);
  } else if (SCHEME.test(href)) {
    return { kind: "external", url: href };
  } else {
    const [path, hash] = splitHash(href);
    anchor = hash;
    target = resolve(dirname(docPath), decodeURIComponent(path.split("?")[0]!));
  }
  if (isMarkdownPath(target))
    return { kind: "doc", path: target, anchor, exists: existsSync(target) };
  return { kind: "file", path: target };
}
