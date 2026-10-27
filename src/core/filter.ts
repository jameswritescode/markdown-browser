import type { DocEntry, FilterMatch } from "../shared/types.ts";

interface FieldMatch {
  score: number;
  ranges: [number, number][];
}

const WORD_BREAK = /[\s/._-]/;

function matchFrom(text: string, lower: string, query: string, start: number): FieldMatch | null {
  const positions: number[] = [];
  let at = start;
  for (const ch of query) {
    const found = lower.indexOf(ch, at);
    if (found === -1) return null;
    positions.push(found);
    at = found + 1;
  }
  let score = 0;
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    score += 1;
    if (pos === 0 || WORD_BREAK.test(text[pos - 1]!)) score += 8;
    if (i > 0 && positions[i - 1] === pos - 1) score += 5;
    else if (i > 0) score -= Math.min(pos - positions[i - 1]! - 1, 5);
  }
  return { score, ranges: toRanges(positions) };
}

function toRanges(positions: number[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const pos of positions) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === pos) last[1] = pos + 1;
    else ranges.push([pos, pos + 1]);
  }
  return ranges;
}

function matchField(text: string, query: string): FieldMatch | null {
  const lower = text.toLowerCase();
  let best: FieldMatch | null = null;
  for (
    let start = lower.indexOf(query[0]!);
    start !== -1;
    start = lower.indexOf(query[0]!, start + 1)
  ) {
    const match = matchFrom(text, lower, query, start);
    if (!match) break;
    if (!best || match.score > best.score) best = match;
  }
  return best;
}

export function filterDocs(docs: DocEntry[], query: string): FilterMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs.map((entry) => ({ entry, score: 0, titleRanges: [], pathRanges: [] }));
  const matches: FilterMatch[] = [];
  for (const entry of docs) {
    const title = matchField(entry.title, q);
    const path = matchField(entry.relPath, q);
    if (!title && !path) continue;
    matches.push({
      entry,
      score: Math.max(title ? title.score + 2 : -Infinity, path ? path.score : -Infinity),
      titleRanges: title?.ranges ?? [],
      pathRanges: path?.ranges ?? [],
    });
  }
  return matches.sort((a, b) => b.score - a.score);
}
