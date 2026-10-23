import type { Dirent } from "node:fs";
import { open, readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { DocEntry, ScanResult } from "../shared/types.ts";

export const SCAN_LIMIT = 5000;

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);
const TITLE_READ_BYTES = 64 * 1024;

export function isMarkdownPath(p: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(p).toLowerCase());
}

export function titleOf(markdown: string, fileName: string): string {
  const lines = markdown.split(/\r?\n/);
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) fence = marker[0]!.repeat(marker.length);
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const atx = /^\s{0,3}#\s+(.*?)\s*#*\s*$/.exec(line);
    if (atx && atx[1]) return atx[1];
    const next = lines[i + 1];
    if (line.trim() && next !== undefined && /^\s{0,3}=+\s*$/.test(next)) return line.trim();
  }
  return basename(fileName, extname(fileName));
}

interface IgnoreScope {
  dir: string;
  rules: Ignore;
}

function isIgnored(path: string, isDir: boolean, scopes: IgnoreScope[]): boolean {
  for (const scope of scopes) {
    const rel = relative(scope.dir, path).split(sep).join("/");
    if (scope.rules.ignores(isDir ? `${rel}/` : rel)) return true;
  }
  return false;
}

async function readIgnoreScope(dir: string): Promise<IgnoreScope | null> {
  try {
    const text = await readFile(join(dir, ".gitignore"), "utf8");
    return { dir, rules: ignore().add(text) };
  } catch {
    return null;
  }
}

async function readHead(path: string): Promise<string> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(TITLE_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, TITLE_READ_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function toEntry(root: string, path: string): Promise<DocEntry | null> {
  try {
    const [info, head] = await Promise.all([stat(path), readHead(path)]);
    return {
      path,
      relPath: relative(root, path).split(sep).join("/"),
      title: titleOf(head, basename(path)),
      mtimeMs: info.mtimeMs,
    };
  } catch {
    return null;
  }
}

export async function scanDocs(root: string, limit: number = SCAN_LIMIT): Promise<ScanResult> {
  const found: string[] = [];
  let truncated = false;
  const queue: { dir: string; scopes: IgnoreScope[] }[] = [{ dir: root, scopes: [] }];

  while (queue.length > 0 && !truncated) {
    const { dir, scopes: parentScopes } = queue.shift()!;
    const own = await readIgnoreScope(dir);
    const scopes = own ? [...parentScopes, own] : parentScopes;
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!isIgnored(path, true, scopes)) queue.push({ dir: path, scopes });
      } else if (entry.isFile() && isMarkdownPath(entry.name)) {
        if (isIgnored(path, false, scopes)) continue;
        if (found.length >= limit) {
          truncated = true;
          break;
        }
        found.push(path);
      }
    }
  }

  const docs: DocEntry[] = [];
  for (let i = 0; i < found.length; i += 32) {
    const batch = await Promise.all(found.slice(i, i + 32).map((p) => toEntry(root, p)));
    for (const entry of batch) if (entry) docs.push(entry);
  }
  docs.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { root, docs, truncated };
}
