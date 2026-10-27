export interface TextMatch {
  index: number;
  start: number;
  end: number;
}

export function findMatches(texts: string[], query: string): TextMatch[] {
  if (!query.trim()) return [];
  const needle = query.toLowerCase();
  const matches: TextMatch[] = [];
  texts.forEach((text, index) => {
    const haystack = text.toLowerCase();
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at)) {
      matches.push({ index, start: at, end: at + needle.length });
      at += needle.length;
    }
  });
  return matches;
}

export function stepMatch(current: number, count: number, by: 1 | -1): number {
  if (count === 0) return -1;
  return (current + by + count) % count;
}
