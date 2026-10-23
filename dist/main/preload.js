"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/@zenbu-labs+pixel@0.2.9_react@18.3.1/node_modules/@zenbu-labs/pixel/dist/electron/index.js
var require_electron = __commonJS({
  "node_modules/.pnpm/@zenbu-labs+pixel@0.2.9_react@18.3.1/node_modules/@zenbu-labs/pixel/dist/electron/index.js"(exports2, module2) {
    "use strict";
    var electron = require("electron");
    module2.exports = electron;
  }
});

// src/main/preload.ts
var import_electron = __toESM(require_electron());
var bridge = {
  start: () => import_electron.ipcRenderer.invoke("mdb:start"),
  scan: (root) => import_electron.ipcRenderer.invoke("mdb:scan", root),
  search: (root, query) => import_electron.ipcRenderer.invoke("mdb:search", root, query),
  render: (path) => import_electron.ipcRenderer.invoke("mdb:render", path),
  classifyLink: (href, docPath) => import_electron.ipcRenderer.invoke("mdb:classify", href, docPath),
  watch: (path) => import_electron.ipcRenderer.send("mdb:watch", path),
  onChanged: (cb) => {
    const listener = (_event, path) => cb(path);
    import_electron.ipcRenderer.on("mdb:changed", listener);
    return () => import_electron.ipcRenderer.off("mdb:changed", listener);
  },
  openExternal: (url) => import_electron.ipcRenderer.send("mdb:open-external", url),
  reveal: (path) => import_electron.ipcRenderer.send("mdb:reveal", path),
  copy: (text) => import_electron.ipcRenderer.send("mdb:copy", text)
};
import_electron.contextBridge.exposeInMainWorld("mdb", bridge);
