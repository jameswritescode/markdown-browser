export interface DocEntry {
  path: string;
  relPath: string;
  title: string;
  mtimeMs: number;
}

export interface ScanResult {
  root: string;
  docs: DocEntry[];
  truncated: boolean;
}

export interface FilterMatch {
  entry: DocEntry;
  score: number;
  titleRanges: [number, number][];
  pathRanges: [number, number][];
}

export interface SearchHit {
  entry: DocEntry;
  line: number;
  snippet: string;
  range: [number, number];
}

export type LinkTarget =
  | { kind: "anchor"; id: string }
  | { kind: "doc"; path: string; anchor: string | null; exists: boolean }
  | { kind: "file"; path: string }
  | { kind: "external"; url: string };
