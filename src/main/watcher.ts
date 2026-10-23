import { type FSWatcher, watch } from "node:fs";

const WATCH_DEBOUNCE_MS = 100;
const RETRY_MS = 500;

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
