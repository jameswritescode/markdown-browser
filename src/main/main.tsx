import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createRoot,
  makeTheme,
  useTerminalColors,
  WebView,
  type WebViewHandle,
} from "@zenbu-labs/pixel";
import { useState } from "react";
import type { StartOptions } from "../shared/types.ts";
import { ContextMenu, type MenuItem } from "./context-menu.tsx";
import { registerIpc } from "./ipc.ts";
import { lockNavigation } from "./navigation.ts";

const options = JSON.parse(process.argv[2] ?? "null") as StartOptions | null;
if (!options) throw new Error("mdb: start options missing; run mdb through bin/mdb.js");

const PAGE_URL = pathToFileURL(join(__dirname, "..", "page", "index.html")).href;
const PRELOAD = join(__dirname, "preload.js");
const COPY_SHORTCUT = process.platform === "darwin" ? "cmd+c" : "ctrl+shift+c";

let view: WebViewHandle | null = null;

async function copySelection(): Promise<void> {
  const text = (await view?.webContents.executeJavaScript("getSelection().toString()")) as
    | string
    | undefined;
  if (text) root.setClipboard(text);
}

const root = createRoot({
  name: "mdb",
  onKey(event) {
    if (event.kind !== "press") return false;
    if (event.mods.ctrl && (event.key === "c" || event.key === "q")) {
      root.stop();
      return true;
    }
    if (event.mods.super && event.key === "c") {
      void copySelection();
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

interface PageMenu {
  x: number;
  y: number;
  selectionText: string;
  linkURL: string;
}

function menuItems(menu: PageMenu): MenuItem[] {
  const items: MenuItem[] = [];
  if (menu.selectionText)
    items.push({ id: "copy", label: "Copy", enabled: true, shortcut: COPY_SHORTCUT });
  if (menu.linkURL)
    items.push({ id: "copy-link", label: "Copy link address", enabled: true, shortcut: "" });
  return items;
}

function App() {
  const [menu, setMenu] = useState<PageMenu | null>(null);
  const theme = makeTheme(useTerminalColors());
  const items = menu ? menuItems(menu) : [];
  return (
    <>
      <WebView
        ref={(handle: WebViewHandle | null) => {
          if (handle && handle !== view) lockNavigation(handle.webContents, PAGE_URL);
          view = handle;
        }}
        src={PAGE_URL}
        preload={PRELOAD}
        autoFocus
        onOpenWindow="deny"
        browserWindowOptions={{ transparent: true, backgroundColor: "#00000000" }}
        style={{ width: "100%", height: "100%" }}
        onContextMenu={(params) =>
          setMenu({
            x: params.x * root.displayScale,
            y: params.y * root.displayScale,
            selectionText: params.selectionText.trim(),
            linkURL: params.linkURL,
          })
        }
      />
      {menu && items.length > 0 && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          bounds={{ width: root.info.width, height: root.info.height }}
          items={items}
          rem={root.info.basePx}
          theme={theme}
          onAction={(id) => {
            if (id === "copy") root.setClipboard(menu.selectionText);
            if (id === "copy-link") root.setClipboard(menu.linkURL);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

root.render(<App />);
