import { contextBridge, ipcRenderer } from "@zenbu-labs/pixel/electron";
import type { MdbBridge } from "../shared/types.ts";

// One IPC listener for all readers: each tab has a reader, and Node warns past ten listeners.
const changeListeners = new Set<(path: string) => void>();
ipcRenderer.on("mdb:changed", (_event: unknown, path: string) => {
  for (const listener of changeListeners) listener(path);
});

const folderListeners = new Set<(root: string) => void>();
ipcRenderer.on("mdb:folder-changed", (_event: unknown, root: string) => {
  for (const listener of folderListeners) listener(root);
});

const bridge: MdbBridge = {
  start: () => ipcRenderer.invoke("mdb:start"),
  scan: (root) => ipcRenderer.invoke("mdb:scan", root),
  search: (root, query) => ipcRenderer.invoke("mdb:search", root, query),
  render: (path) => ipcRenderer.invoke("mdb:render", path),
  classifyLink: (href, docPath) => ipcRenderer.invoke("mdb:classify", href, docPath),
  watch: (paths) => ipcRenderer.send("mdb:watch", paths),
  watchFolders: (roots) => ipcRenderer.send("mdb:watch-folders", roots),
  onFolderChanged: (cb) => {
    folderListeners.add(cb);
    return () => folderListeners.delete(cb);
  },
  onChanged: (cb) => {
    changeListeners.add(cb);
    return () => changeListeners.delete(cb);
  },
  openExternal: (url) => ipcRenderer.send("mdb:open-external", url),
  reveal: (path) => ipcRenderer.send("mdb:reveal", path),
  copy: (text) => ipcRenderer.send("mdb:copy", text),
  ready: () => ipcRenderer.send("mdb:ready"),
  quit: () => ipcRenderer.send("mdb:quit"),
};

contextBridge.exposeInMainWorld("mdb", bridge);
