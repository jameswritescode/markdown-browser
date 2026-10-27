import { ipcMain, shell, type WebContents } from "@zenbu-labs/pixel/electron";
import { classifyLink, isOpenableUrl } from "../core/links.ts";
import { loadDoc, renderStdinDoc } from "../core/render.ts";
import { scanDocs } from "../core/scan.ts";
import { searchDocs } from "../core/search.ts";
import { type StdinDoc, StdinStore, docPathFor, isStdinKey } from "../core/stdin.ts";
import type { ScanResult, StartOptions } from "../shared/types.ts";
import { DocWatchers, FolderWatchers } from "./watcher.ts";

export function registerIpc(
  options: StartOptions,
  copy: (text: string) => void,
  contents: () => WebContents | null,
  quit: () => void,
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
  const stdin = new StdinStore();
  ipcMain.handle("mdb:render", (_event, path: string) => {
    if (!isStdinKey(path)) return loadDoc(path);
    const doc = stdin.get(path);
    return doc ? renderStdinDoc(path, doc) : { missing: true, path };
  });
  ipcMain.handle("mdb:classify", (_event, href: string, docPath: string) => {
    const doc = isStdinKey(docPath) ? stdin.get(docPath) : null;
    return classifyLink(href, doc ? docPathFor(doc) : docPath);
  });
  ipcMain.handle("mdb:put-stdin", (_event, key: string, doc: StdinDoc) => {
    const known = stdin.has(key);
    if (stdin.put(key, doc) && known) contents()?.send("mdb:changed", key);
  });
  ipcMain.on("mdb:forget-stdin", (_event, keys: string[]) => {
    for (const key of keys) stdin.forget(key);
  });
  // fs.watch on a stdin key would fail and retry for ever.
  ipcMain.on("mdb:watch", (_event, paths: string[]) =>
    watchers.set(paths.filter((path) => !isStdinKey(path))),
  );
  const folders = new FolderWatchers((root) => contents()?.send("mdb:folder-changed", root));
  ipcMain.on("mdb:watch-folders", (_event, roots: string[]) => folders.set(roots));
  ipcMain.on("mdb:open-external", (_event, url: string) => {
    if (isOpenableUrl(url)) void shell.openExternal(url);
  });
  ipcMain.on("mdb:reveal", (_event, path: string) => shell.showItemInFolder(path));
  ipcMain.on("mdb:copy", (_event, text: string) => copy(text));
  ipcMain.on("mdb:quit", () => quit());
}
