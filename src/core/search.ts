import { readFile, stat } from "node:fs/promises";
import type { DocEntry, SearchHit } from "../shared/types.ts";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const HITS_PER_FILE = 3;
const SNIPPET_LENGTH = 120;
const CONCURRENCY = 8;

function snippetAround(
  line: string,
  index: number,
  length: number,
): { snippet: string; range: [number, number] } {
  const trimmed = line.trimStart();
  const offset = line.length - trimmed.length;
  const at = index - offset;
  if (trimmed.length <= SNIPPET_LENGTH) return { snippet: trimmed, range: [at, at + length] };
  const start = Math.max(
    0,
    Math.min(at - Math.floor((SNIPPET_LENGTH - length) / 2), trimmed.length - SNIPPET_LENGTH),
  );
  return {
    snippet: trimmed.slice(start, start + SNIPPET_LENGTH),
    range: [at - start, at - start + length],
  };
}

async function searchFile(entry: DocEntry, needle: string): Promise<SearchHit[]> {
  try {
    if ((await stat(entry.path)).size > MAX_FILE_BYTES) return [];
    const lines = (await readFile(entry.path, "utf8")).split(/\r?\n/);
    const hits: SearchHit[] = [];
    for (let i = 0; i < lines.length && hits.length < HITS_PER_FILE; i++) {
      const index = lines[i]!.toLowerCase().indexOf(needle);
      if (index === -1) continue;
      hits.push({ entry, line: i + 1, ...snippetAround(lines[i]!, index, needle.length) });
    }
    return hits;
  } catch {
    return [];
  }
}

export async function searchDocs(
  docs: DocEntry[],
  query: string,
  maxHits = 200,
): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const results = Array.from<SearchHit[]>({ length: docs.length });
  let next = 0;
  const worker = async () => {
    while (next < docs.length) {
      const i = next++;
      results[i] = await searchFile(docs[i]!, needle);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results.flat().slice(0, maxHits);
}
