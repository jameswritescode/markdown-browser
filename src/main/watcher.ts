import { type FSWatcher, watch } from "node:fs";
import { isMarkdownPath } from "../core/scan.ts";

const WATCH_DEBOUNCE_MS = 100;
const RETRY_MS = 500;
const FOLDER_DEBOUNCE_MS = 300;

export class DocWatcher {
  private watcher: FSWatcher | null = null;
  private path: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private retry: NodeJS.Timeout | null = null;

  constructor(private readonly notify: (path: string) => void) {}

  set(path: string | null): void {
    this.close();
    this.path = path;
    if (path) this.arm(path, false);
  }

  private arm(path: string, recovering: boolean): void {
    if (this.path !== path) return;
    try {
      this.watcher = watch(path, (event) => {
        if (event === "rename") this.rearm(path);
        this.schedule();
      });
      if (recovering) this.schedule();
    } catch {
      this.watcher = null;
      this.retry = setTimeout(() => this.arm(path, true), RETRY_MS);
    }
  }

  private rearm(path: string): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(() => this.arm(path, true), 50);
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.path && this.notify(this.path), WATCH_DEBOUNCE_MS);
  }

  close(): void {
    this.watcher?.close();
    this.watcher = null;
    for (const timer of [this.timer, this.retry]) if (timer) clearTimeout(timer);
    this.timer = null;
    this.retry = null;
  }
}

/** Watches a set of documents, one DocWatcher per path. */
export class DocWatchers {
  private readonly watchers = new Map<string, DocWatcher>();

  constructor(private readonly notify: (path: string) => void) {}

  set(paths: string[]): void {
    const wanted = new Set(paths);
    for (const [path, watcher] of this.watchers) {
      if (wanted.has(path)) continue;
      watcher.close();
      this.watchers.delete(path);
    }
    for (const path of wanted) {
      if (this.watchers.has(path)) continue;
      const watcher = new DocWatcher(this.notify);
      watcher.set(path);
      this.watchers.set(path, watcher);
    }
  }

  close(): void {
    for (const watcher of this.watchers.values()) watcher.close();
    this.watchers.clear();
  }
}

/**
 * Watches folders for markdown files that appear, change name, or go away, so the
 * finder can scan again. One recursive watcher per folder.
 */
export class FolderWatchers {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly notify: (root: string) => void) {}

  set(roots: string[]): void {
    const wanted = new Set(roots);
    for (const [root, watcher] of this.watchers) {
      if (wanted.has(root)) continue;
      watcher.close();
      this.watchers.delete(root);
      clearTimeout(this.timers.get(root));
      this.timers.delete(root);
    }
    for (const root of wanted) {
      if (this.watchers.has(root)) continue;
      try {
        const watcher = watch(root, { recursive: true }, (_event, file) => {
          if (file === null || isMarkdownPath(file)) this.schedule(root);
        });
        watcher.on("error", () => {});
        this.watchers.set(root, watcher);
      } catch {
        // The folder is gone or cannot be read; the finder keeps its last list.
      }
    }
  }

  private schedule(root: string): void {
    clearTimeout(this.timers.get(root));
    this.timers.set(
      root,
      setTimeout(() => {
        this.timers.delete(root);
        this.notify(root);
      }, FOLDER_DEBOUNCE_MS),
    );
  }

  close(): void {
    this.set([]);
  }
}
