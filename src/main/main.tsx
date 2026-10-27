import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createRoot,
  makeTheme,
  useTerminalColors,
  WebView,
  type WebViewHandle,
} from "@zenbu-labs/pixel";
import { ipcMain } from "@zenbu-labs/pixel/electron";
import { useEffect, useState } from "react";
import { openRequest, serveControl } from "../core/control.ts";
import { instanceSocket, registerInstance } from "../core/registry.ts";
import type { StartOptions } from "../shared/types.ts";
import { ContextMenu, type MenuItem } from "./context-menu.tsx";
import { registerIpc } from "./ipc.ts";
import { lockNavigation, resetZoomOnLoad } from "./navigation.ts";

const options = JSON.parse(process.argv[2] ?? "null") as StartOptions | null;
if (!options) throw new Error("mdb: start options missing; run mdb through bin/mdb.js");

const PAGE_URL = pathToFileURL(join(__dirname, "..", "page", "index.html")).href;
const PRELOAD = join(__dirname, "preload.js");
const COPY_SHORTCUT = process.platform === "darwin" ? "cmd+c" : "ctrl+shift+c";

let view: WebViewHandle | null = null;
let closeMenu: (() => void) | null = null;

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
    if (closeMenu) {
      closeMenu();
      if (event.key === "escape") return true;
    }
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
  () => root.stop(),
);

// Register only when the page can take a message, so a caller never finds an mdb
// that cannot open a document yet.
ipcMain.once("mdb:ready", () => {
  serveControl(instanceSocket(), async (message) => {
    if (message.cmd !== "open") return { error: `unknown command ${String(message.cmd)}` };
    const contents = view?.webContents;
    if (!contents) return { error: "mdb has no page" };
    const request = openRequest(message);
    const result = (await contents.executeJavaScript(
      `window.mdbRemote.open(${JSON.stringify(request)})`,
    )) as { heading: boolean | null; result: string };
    return { ok: true, ...result };
  }).then(
    () => {
      const instance = registerInstance({ tab: options.tab, token: options.waitToken });
      process.on("exit", () => instance.withdraw());
    },
    (error: unknown) => process.stderr.write(`mdb: control socket: ${String(error)}\n`),
  );
});

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
  const menuOpen = items.length > 0;
  useEffect(() => {
    closeMenu = menuOpen ? () => setMenu(null) : null;
  }, [menuOpen]);
  return (
    <>
      <WebView
        ref={(handle: WebViewHandle | null) => {
          if (handle && handle !== view) {
            lockNavigation(handle.webContents, PAGE_URL);
            resetZoomOnLoad(handle.webContents);
          }
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
      {menu && menuOpen && (
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
