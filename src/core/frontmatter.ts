import { parse } from "yaml";

export type Frontmatter = { data: Record<string, unknown> } | { raw: string };

const BLOCK = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(source: string): {
  frontmatter: Frontmatter | null;
  body: string;
} {
  const match = BLOCK.exec(source);
  if (!match) return { frontmatter: null, body: source };
  const raw = match[1] ?? "";
  const body = source.slice(match[0].length);
  if (!raw.trim()) return { frontmatter: null, body };
  let data: unknown;
  try {
    data = parse(raw);
  } catch {
    return { frontmatter: { raw }, body };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data))
    return { frontmatter: { raw }, body };
  return { frontmatter: { data: data as Record<string, unknown> }, body };
}
