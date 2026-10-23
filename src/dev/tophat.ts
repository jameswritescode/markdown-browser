import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow } from "@zenbu-labs/pixel/electron";
import { parseArgs } from "../core/args.ts";
import { registerIpc } from "../main/ipc.ts";

type Step =
  | { wait: number }
  | { key: string; modifiers?: ("meta" | "control" | "shift" | "alt")[] }
  | { type: string }
  | { shot: string }
  | { eval: string }
  | { click: string }
  | { scroll: number }
  | { write: string; text: string }
  | { remove: string };

interface Script {
  args: string[];
  cwd?: string;
  width?: number;
  height?: number;
  background?: string;
  theme?: { foreground: number[]; background: number[]; ansi: (number[] | null)[] };
  out: string;
  steps: Step[];
}

const DEFAULT_THEME = {
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

const scriptPath = resolve(process.argv[2] ?? "");
const script = JSON.parse(readFileSync(scriptPath, "utf8")) as Script;
const base = dirname(scriptPath);
const out = resolve(base, script.out);
const cwd = resolve(base, script.cwd ?? ".");
mkdirSync(out, { recursive: true });

const options = parseArgs(script.args, cwd, process.env);
if ("error" in options) {
  process.stderr.write(`${options.error}\n`);
  process.exit(1);
}

const log: string[] = [];
const record = (line: string) => {
  log.push(line);
  process.stdout.write(`${line}\n`);
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const KEY_NAMES: Record<string, string> = { "[": "[", "]": "]", "/": "/" };

async function run(): Promise<void> {
  app.dock?.hide();
  const theme = script.theme ?? DEFAULT_THEME;
  const win = new BrowserWindow({
    show: false,
    width: script.width ?? 1200,
    height: script.height ?? 800,
    transparent: true,
    backgroundColor: script.background ?? "#1e1e2e",
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      preload: join(__dirname, "tophat-preload.js"),
      additionalArguments: [`--mdb-tophat-theme=${encodeURIComponent(JSON.stringify(theme))}`],
    },
  });
  const contents = win.webContents;
  contents.on("console-message", (event) => record(`console.${event.level}: ${event.message}`));
  contents.on("render-process-gone", (_event, details) =>
    record(`renderer gone: ${details.reason}`),
  );
  const clipboard: string[] = [];
  registerIpc(
    options as Exclude<typeof options, { error: string }>,
    (text) => clipboard.push(text),
    () => contents,
  );
  await win.loadURL(pathToFileURL(join(__dirname, "..", "..", "dist", "page", "index.html")).href);
  await sleep(300);

  for (const step of script.steps) {
    if ("wait" in step) await sleep(step.wait);
    else if ("key" in step) {
      const keyCode = KEY_NAMES[step.key] ?? step.key;
      const modifiers = step.modifiers ?? [];
      contents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
      if (keyCode.length === 1 && modifiers.length === 0)
        contents.sendInputEvent({ type: "char", keyCode, modifiers });
      contents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
      await sleep(60);
    } else if ("type" in step) {
      for (const ch of step.type) {
        contents.sendInputEvent({ type: "keyDown", keyCode: ch });
        contents.sendInputEvent({ type: "char", keyCode: ch });
        contents.sendInputEvent({ type: "keyUp", keyCode: ch });
      }
      await sleep(250);
    } else if ("click" in step) {
      const box = (await contents.executeJavaScript(
        `(() => { const r = document.querySelector(${JSON.stringify(step.click)})?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null })()`,
      )) as { x: number; y: number } | null;
      if (!box) record(`click: no element for ${step.click}`);
      else {
        const at = { x: Math.round(box.x), y: Math.round(box.y) };
        contents.sendInputEvent({ type: "mouseDown", button: "left", clickCount: 1, ...at });
        contents.sendInputEvent({ type: "mouseUp", button: "left", clickCount: 1, ...at });
        await sleep(250);
      }
    } else if ("scroll" in step) {
      await contents.executeJavaScript(`window.scrollBy(0, ${step.scroll})`);
      await sleep(250);
    } else if ("eval" in step) {
      const value = await contents.executeJavaScript(step.eval);
      record(`eval ${step.eval} => ${JSON.stringify(value)}`);
    } else if ("write" in step) {
      writeFileSync(resolve(base, step.write), step.text);
      await sleep(500);
    } else if ("remove" in step) {
      const { rmSync } = await import("node:fs");
      rmSync(resolve(base, step.remove), { force: true });
      await sleep(500);
    } else if ("shot" in step) {
      await sleep(150);
      const image = await contents.capturePage();
      writeFileSync(join(out, `${step.shot}.png`), image.toPNG());
      const text = (await contents.executeJavaScript("document.body.innerText")) as string;
      writeFileSync(join(out, `${step.shot}.txt`), text);
      record(`shot ${step.shot}`);
    }
  }
  record(`clipboard: ${JSON.stringify(clipboard)}`);
  writeFileSync(join(out, "log.txt"), `${log.join("\n")}\n`);
  app.exit(0);
}

app.whenReady().then(run, (error) => {
  process.stderr.write(`${String(error)}\n`);
  app.exit(1);
});
