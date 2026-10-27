import type { OutlineItem } from "../shared/types.ts";

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function findHeading(outline: OutlineItem[], query: string): string | null {
  const text = query.trim().toLowerCase();
  if (!text) return null;
  const id = text.startsWith("#") ? text.slice(1) : text;
  const slug = slugify(text);
  const found =
    outline.find((item) => item.text.trim().toLowerCase() === text) ??
    outline.find((item) => item.id === id || item.id === slug) ??
    outline.find((item) => item.text.trim().toLowerCase().startsWith(text));
  return found?.id ?? null;
}
