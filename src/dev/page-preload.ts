import { contextBridge } from "@zenbu-labs/pixel/electron";
import "../main/preload.ts";

const flag = process.argv.find((arg) => arg.startsWith("--mdb-page-theme="));
const theme = flag ? JSON.parse(decodeURIComponent(flag.slice("--mdb-page-theme=".length))) : null;

contextBridge.exposeInMainWorld("pixel", {
  theme: () => theme,
  onTheme: () => () => {},
  quit: () => {},
});
