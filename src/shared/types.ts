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
