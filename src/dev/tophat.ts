import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow } from "@zenbu-labs/pixel/electron";
import { parseArgs } from "../core/args.ts";
import { registerIpc } from "../main/ipc.ts";
import { lockNavigation } from "../main/navigation.ts";

type Step =
  | { wait: number }
  | { key: string; modifiers?: ("meta" | "control" | "shift" | "alt")[] }
  | { type: string }
  | { shot: string }
  | { eval: string; expect?: unknown }
  | { click: string }
  | { hover: string }
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
  /** Written before mdb starts; null removes the file. */
  files?: Record<string, string | null>;
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

for (const [file, text] of Object.entries(script.files ?? {})) {
  if (text === null) {
    rmSync(resolve(base, file), { force: true });
    continue;
  }
  mkdirSync(dirname(resolve(base, file)), { recursive: true });
  writeFileSync(resolve(base, file), text);
}

const parsed = parseArgs(script.args, cwd, process.env);
if ("error" in parsed) {
  process.stderr.write(`${parsed.error}\n`);
  process.exit(1);
}
const options = parsed.start;

// --update writes each eval's result into the script as its expected value.
const update = process.argv.includes("--update");
let checks = 0;
let failures = 0;

const log: string[] = [];
const record = (line: string) => {
  log.push(line);
  process.stdout.write(`${line}\n`);
};

const fail = (line: string) => {
  failures++;
  record(`FAIL ${line}`);
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
  const centerOf = async (selector: string) => {
    const box = (await contents.executeJavaScript(
      `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`,
    )) as { x: number; y: number } | null;
    return box && { x: Math.round(box.x), y: Math.round(box.y) };
  };
  registerIpc(
    options,
    (text) => clipboard.push(text),
    () => contents,
    () => record("quit"),
  );
  const pageUrl = pathToFileURL(join(__dirname, "..", "..", "dist", "page", "index.html")).href;
  lockNavigation(contents, pageUrl);
  await win.loadURL(pageUrl);
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
    } else if ("hover" in step) {
      const at = await centerOf(step.hover);
      if (!at) fail(`hover: no element for ${step.hover}`);
      else {
        contents.sendInputEvent({ type: "mouseMove", ...at });
        await sleep(250);
      }
    } else if ("click" in step) {
      const at = await centerOf(step.click);
      if (!at) fail(`click: no element for ${step.click}`);
      else {
        contents.sendInputEvent({ type: "mouseDown", button: "left", clickCount: 1, ...at });
        contents.sendInputEvent({ type: "mouseUp", button: "left", clickCount: 1, ...at });
        await sleep(250);
      }
    } else if ("scroll" in step) {
      await contents.executeJavaScript(
        `(document.querySelector(".reader:not([hidden]) .reader-scroll") ?? document.scrollingElement).scrollBy(0, ${step.scroll})`,
      );
      await sleep(250);
    } else if ("eval" in step) {
      let value: unknown;
      try {
        value = await contents.executeJavaScript(step.eval);
      } catch (error) {
        fail(
          `eval ${step.eval} => error: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const actual = JSON.stringify(value);
      if (update) step.expect = value;
      else if ("expect" in step) {
        checks++;
        if (actual !== JSON.stringify(step.expect)) {
          fail(`eval ${step.eval} => ${actual}, expected ${JSON.stringify(step.expect)}`);
          continue;
        }
      }
      record(`eval ${step.eval} => ${actual}`);
    } else if ("write" in step) {
      mkdirSync(dirname(resolve(base, step.write)), { recursive: true });
      writeFileSync(resolve(base, step.write), step.text);
      await sleep(500);
    } else if ("remove" in step) {
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
  if (update) writeFileSync(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
  record(
    `tophat: ${checks} checks, ${failures} failed${update ? ", expected values updated" : ""}`,
  );
  writeFileSync(join(out, "log.txt"), `${log.join("\n")}\n`);
  app.exit(failures ? 1 : 0);
}

app.whenReady().then(run, (error) => {
  process.stderr.write(`${String(error)}\n`);
  app.exit(1);
});
