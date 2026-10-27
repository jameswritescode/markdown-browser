import { ipcMain, shell, type WebContents } from "@zenbu-labs/pixel/electron";
import { classifyLink, isOpenableUrl } from "../core/links.ts";
import { loadDoc } from "../core/render.ts";
import { scanDocs } from "../core/scan.ts";
import { searchDocs } from "../core/search.ts";
import type { ScanResult, StartOptions } from "../shared/types.ts";
import { DocWatchers } from "./watcher.ts";

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
  const watchers = new DocWatchers((path) => contents()?.send("mdb:changed", path));

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
  ipcMain.on("mdb:watch", (_event, paths: string[]) => watchers.set(paths));
  ipcMain.on("mdb:open-external", (_event, url: string) => {
    if (isOpenableUrl(url)) void shell.openExternal(url);
  });
  ipcMain.on("mdb:reveal", (_event, path: string) => shell.showItemInFolder(path));
  ipcMain.on("mdb:copy", (_event, text: string) => copy(text));
}
