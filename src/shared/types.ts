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

export interface OutlineItem {
  level: number;
  text: string;
  id: string;
}

export interface RenderedDoc {
  path: string;
  title: string;
  html: string;
  outline: OutlineItem[];
}

export type MissingDoc = { missing: true; path: string };

export type Background = "transparent" | "solid";

export interface StartOptions {
  root: string;
  openPath: string | null;
  background: Background;
  heading: string | null;
  tab: string | null;
}

export type Direction = "right" | "left" | "down" | "up";

export interface Launch {
  start: StartOptions;
  split: Direction | null;
  size: number | null;
  fresh: boolean;
}

export interface MdbBridge {
  start(): Promise<StartOptions>;
  scan(root: string): Promise<ScanResult>;
  search(root: string, query: string): Promise<SearchHit[]>;
  render(path: string): Promise<RenderedDoc | MissingDoc>;
  classifyLink(href: string, docPath: string): Promise<LinkTarget>;
  watch(paths: string[]): void;
  onChanged(cb: (path: string) => void): () => void;
  openExternal(url: string): void;
  reveal(path: string): void;
  copy(text: string): void;
  ready(): void;
  quit(): void;
}
