import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LinkTarget } from "../shared/types.ts";
import { isMarkdownPath } from "./scan.ts";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const OPENABLE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function isOpenableUrl(url: string): boolean {
  try {
    return OPENABLE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function splitHash(href: string): [string, string | null] {
  const hash = href.indexOf("#");
  if (hash === -1) return [href, null];
  return [href.slice(0, hash), safeDecode(href.slice(hash + 1)) || null];
}

function fromFileUrl(href: string): { path: string; anchor: string | null } | null {
  try {
    const url = new URL(href);
    const anchor = url.hash ? safeDecode(url.hash.slice(1)) : null;
    url.hash = "";
    return { path: fileURLToPath(url), anchor };
  } catch {
    return null;
  }
}

export function classifyLink(href: string, docPath: string): LinkTarget {
  if (href.startsWith("#")) return { kind: "anchor", id: safeDecode(href.slice(1)) };
  let target: string;
  let anchor: string | null;
  if (/^file:/i.test(href)) {
    const local = fromFileUrl(href);
    if (!local) return { kind: "external", url: href };
    ({ path: target, anchor } = local);
  } else if (SCHEME.test(href)) {
    return { kind: "external", url: href };
  } else {
    const [path, hash] = splitHash(href);
    anchor = hash;
    target = resolve(dirname(docPath), safeDecode(path.split("?")[0]!));
  }
  if (isMarkdownPath(target))
    return { kind: "doc", path: target, anchor, exists: existsSync(target) };
  return { kind: "file", path: target };
}
