import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRoot, WebView, type WebViewHandle } from "@zenbu-labs/pixel";
import { useRef } from "react";
import type { StartOptions } from "../shared/types.ts";
import { registerIpc } from "./ipc.ts";

const options = JSON.parse(process.argv[2] ?? "null") as StartOptions | null;
if (!options) throw new Error("mdb: start options missing; run mdb through bin/mdb.js");

const PAGE_URL = pathToFileURL(join(__dirname, "..", "page", "index.html")).href;
const PRELOAD = join(__dirname, "preload.js");

let view: WebViewHandle | null = null;

const root = createRoot({
  name: "mdb",
  onKey(event) {
    if (event.kind !== "press" || !event.mods.ctrl) return false;
    if (event.key === "c" || event.key === "q") {
      root.stop();
      return true;
    }
    return false;
  },
});

if (options.background === "transparent") root.setClearColor([0, 0, 0, 0]);
registerIpc(
  options,
  (text) => root.setClipboard(text),
  () => view?.webContents ?? null,
);

function App() {
  const ref = useRef<WebViewHandle | null>(null);
  return (
    <WebView
      ref={(handle: WebViewHandle | null) => {
        ref.current = handle;
        view = handle;
      }}
      src={PAGE_URL}
      preload={PRELOAD}
      autoFocus
      onOpenWindow="deny"
      browserWindowOptions={{ transparent: true, backgroundColor: "#00000000" }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

root.render(<App />);
