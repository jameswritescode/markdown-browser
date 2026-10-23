import { contextBridge, ipcRenderer } from "@zenbu-labs/pixel/electron";
import type { MdbBridge } from "../shared/types.ts";

const bridge: MdbBridge = {
  start: () => ipcRenderer.invoke("mdb:start"),
  scan: (root) => ipcRenderer.invoke("mdb:scan", root),
  search: (root, query) => ipcRenderer.invoke("mdb:search", root, query),
  render: (path) => ipcRenderer.invoke("mdb:render", path),
  classifyLink: (href, docPath) => ipcRenderer.invoke("mdb:classify", href, docPath),
  watch: (path) => ipcRenderer.send("mdb:watch", path),
  onChanged: (cb) => {
    const listener = (_event: unknown, path: string) => cb(path);
    ipcRenderer.on("mdb:changed", listener);
    return () => ipcRenderer.off("mdb:changed", listener);
  },
  openExternal: (url) => ipcRenderer.send("mdb:open-external", url),
  openPath: (path) => ipcRenderer.send("mdb:open-path", path),
  copy: (text) => ipcRenderer.send("mdb:copy", text),
};

contextBridge.exposeInMainWorld("mdb", bridge);
