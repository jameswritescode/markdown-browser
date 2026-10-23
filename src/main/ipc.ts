import { type FSWatcher, watch } from "node:fs";
import { ipcMain, shell, type WebContents } from "@zenbu-labs/pixel/electron";
import { classifyLink } from "../core/links.ts";
import { loadDoc } from "../core/render.ts";
import { scanDocs } from "../core/scan.ts";
import { searchDocs } from "../core/search.ts";
import type { ScanResult, StartOptions } from "../shared/types.ts";

const WATCH_DEBOUNCE_MS = 100;

class DocWatcher {
  private watcher: FSWatcher | null = null;
  private path: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly notify: (path: string) => void) {}

  set(path: string | null): void {
    this.close();
    this.path = path;
    if (path) this.arm(path);
  }

  private arm(path: string): void {
    try {
      this.watcher = watch(path, (event) => {
        if (event === "rename") this.rearm();
        this.schedule();
      });
    } catch {
      this.watcher = null;
      setTimeout(() => this.rearm(), 500);
    }
  }

  private rearm(): void {
    const path = this.path;
    this.watcher?.close();
    this.watcher = null;
    if (path) setTimeout(() => this.path === path && !this.watcher && this.arm(path), 50);
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.path && this.notify(this.path), WATCH_DEBOUNCE_MS);
  }

  close(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

export function registerIpc(
  options: StartOptions,
  copy: (text: string) => void,
  contents: () => WebContents | null,
): void {
  const scans = new Map<string, Promise<ScanResult>>();
  const scan = (dir: string) => {
    let pending = scans.get(dir);
    if (!pending) {
      pending = scanDocs(dir);
      scans.set(dir, pending);
    }
    return pending;
  };
  const watcher = new DocWatcher((path) => contents()?.send("mdb:changed", path));

  ipcMain.handle("mdb:start", () => options);
  ipcMain.handle("mdb:scan", (_event, dir: string) => {
    scans.delete(dir);
    return scan(dir);
  });
  ipcMain.handle("mdb:search", async (_event, dir: string, query: string) =>
    searchDocs((await scan(dir)).docs, query),
  );
  ipcMain.handle("mdb:render", (_event, path: string) => loadDoc(path));
  ipcMain.handle("mdb:classify", (_event, href: string, docPath: string) =>
    classifyLink(href, docPath),
  );
  ipcMain.on("mdb:watch", (_event, path: string | null) => watcher.set(path));
  ipcMain.on("mdb:open-external", (_event, url: string) => void shell.openExternal(url));
  ipcMain.on("mdb:open-path", (_event, path: string) => void shell.openPath(path));
  ipcMain.on("mdb:copy", (_event, text: string) => copy(text));
}
