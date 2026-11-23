import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, type WebContents } from "@zenbu-labs/pixel/electron";
import { parseArgs } from "../core/args.ts";
import { registerIpc } from "../main/ipc.ts";
import { lockNavigation } from "../main/navigation.ts";

export type Modifier = "meta" | "control" | "shift" | "alt";

export interface Theme {
  foreground: number[];
  background: number[];
  ansi: (number[] | null)[];
}

export interface PageConfig {
  /** The `mdb` arguments, relative to `cwd`. */
  args: string[];
  cwd: string;
  width?: number;
  height?: number;
  background?: string;
  theme?: Theme;
}

export interface PageEvents {
  console(level: string, message: string): void;
  gone(reason: string): void;
  quit(): void;
}

export const DEFAULT_THEME: Theme = {
  foreground: [205, 214, 244],
  background: [30, 30, 46],
  ansi: [
    [69, 71, 90],
    [243, 139, 168],
    [166, 227, 161],
    [249, 226, 175],
    [137, 180, 250],
    [245, 194, 231],
    [148, 226, 213],
    [186, 194, 222],
  ],
};

const KEY_NAMES: Record<string, string> = { "[": "[", "]": "]", "/": "/" };

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Opens the real mdb page in an offscreen window, with the real IPC handlers, and gives
 * the actions that a test does on it. The window does not use pixel or a terminal.
 */
export async function openPage(config: PageConfig, events: PageEvents) {
  const parsed = parseArgs(config.args, config.cwd, process.env);
  if ("error" in parsed) throw new Error(parsed.error);
  const win = new BrowserWindow({
    show: false,
    width: config.width ?? 1200,
    height: config.height ?? 800,
    transparent: true,
    backgroundColor: config.background ?? "#1e1e2e",
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      preload: join(__dirname, "page-preload.js"),
      additionalArguments: [
        `--mdb-page-theme=${encodeURIComponent(JSON.stringify(config.theme ?? DEFAULT_THEME))}`,
      ],
    },
  });
  const contents: WebContents = win.webContents;
  contents.on("console-message", (event) => events.console(event.level, event.message));
  contents.on("render-process-gone", (_event, details) => events.gone(details.reason));
  const clipboard: string[] = [];
  registerIpc(
    parsed.start,
    (text) => clipboard.push(text),
    () => contents,
    () => events.quit(),
  );
  const pageUrl = pathToFileURL(join(__dirname, "..", "..", "dist", "page", "index.html")).href;
  lockNavigation(contents, pageUrl);
  await win.loadURL(pageUrl);
  await sleep(300);

  const centerOf = async (selector: string) => {
    const box = (await contents.executeJavaScript(
      `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`,
    )) as { x: number; y: number } | null;
    return box && { x: Math.round(box.x), y: Math.round(box.y) };
  };

  return {
    clipboard,
    async key(key: string, modifiers: Modifier[] = []) {
      const keyCode = KEY_NAMES[key] ?? key;
      contents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
      if (keyCode.length === 1 && modifiers.length === 0)
        contents.sendInputEvent({ type: "char", keyCode, modifiers });
      contents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
      await sleep(60);
    },
    async type(text: string) {
      for (const ch of text) {
        contents.sendInputEvent({ type: "keyDown", keyCode: ch });
        contents.sendInputEvent({ type: "char", keyCode: ch });
        contents.sendInputEvent({ type: "keyUp", keyCode: ch });
      }
      await sleep(250);
    },
    /** False when the selector finds no element. */
    async hover(selector: string) {
      const at = await centerOf(selector);
      if (!at) return false;
      contents.sendInputEvent({ type: "mouseMove", ...at });
      await sleep(250);
      return true;
    },
    /** False when the selector finds no element. */
    async click(selector: string) {
      const at = await centerOf(selector);
      if (!at) return false;
      contents.sendInputEvent({ type: "mouseDown", button: "left", clickCount: 1, ...at });
      contents.sendInputEvent({ type: "mouseUp", button: "left", clickCount: 1, ...at });
      await sleep(250);
      return true;
    },
    async scroll(pixels: number) {
      await contents.executeJavaScript(
        `(document.querySelector(".reader:not([hidden]) .reader-scroll") ?? document.scrollingElement).scrollBy(0, ${pixels})`,
      );
      await sleep(250);
    },
    eval(code: string): Promise<unknown> {
      return contents.executeJavaScript(code);
    },
    /** Saves `<name>.png` and `<name>.txt` (the text of the page) in `out`. */
    async shot(out: string, name: string) {
      await sleep(150);
      const image = await contents.capturePage();
      writeFileSync(join(out, `${name}.png`), image.toPNG());
      const text = (await contents.executeJavaScript("document.body.innerText")) as string;
      writeFileSync(join(out, `${name}.txt`), text);
    },
  };
}

export type Page = Awaited<ReturnType<typeof openPage>>;
