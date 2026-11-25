import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { expect } from "vitest";
import type { Modifier, PageConfig } from "../../src/dev/page-driver.ts";
import { type Command, PREFIX } from "../../src/dev/page-protocol.ts";

const root = join(import.meta.dirname, "..", "..");
const ELECTRON = join(
  root,
  "node_modules/@zenbu-labs/pixel/electron/dist/Electron.app/Contents/MacOS/pixel",
);

const STDERR_KEEP = 4000;

export const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Writes a file relative to the repository root, and makes its folders. */
export function writeFile(path: string, text: string): void {
  const file = resolve(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/** Removes a file relative to the repository root. */
export function removeFile(path: string): void {
  rmSync(resolve(root, path), { force: true });
}

/**
 * Makes the files relative to the repository root. A null value removes the file.
 * A path that ends in "/" becomes a new, empty folder.
 */
export function makeFiles(files: Record<string, string | null>): void {
  for (const [path, text] of Object.entries(files)) {
    if (path.endsWith("/")) {
      rmSync(resolve(root, path), { recursive: true, force: true });
      mkdirSync(resolve(root, path), { recursive: true });
    } else if (text === null) removeFile(path);
    else writeFile(path, text);
  }
}

export interface PageOptions extends Omit<PageConfig, "cwd"> {
  /** The folder for `args`. The default is the repository root. */
  cwd?: string;
}

export interface Page {
  key(key: string, modifiers?: Modifier[]): Promise<void>;
  type(text: string): Promise<void>;
  /** Fails when the selector finds no element. */
  hover(selector: string): Promise<void>;
  /** Fails when the selector finds no element. */
  click(selector: string): Promise<void>;
  scroll(pixels: number): Promise<void>;
  /** Runs the code in the page and gives its result. A promise is resolved first. */
  eval<T = unknown>(code: string): Promise<T>;
  /** Saves `<name>.png` and `<name>.txt` in `build/page/<test file>/`. */
  shot(name: string): Promise<void>;
  /** The text that the page copied, in order. */
  clipboard(): Promise<string[]>;
  /** Console messages, and `quit` when the page asked mdb to quit. */
  log: string[];
  close(): void;
}

/** Starts the real mdb page in an offscreen Electron window. See src/dev/page-driver.ts. */
export async function openPage(options: PageOptions): Promise<Page> {
  const testFile = expect.getState().testPath ?? "page";
  const out = join(root, "build", "page", basename(testFile).replace(/\.test\.ts$/, ""));
  mkdirSync(out, { recursive: true });
  const config: PageConfig = { ...options, cwd: resolve(root, options.cwd ?? ".") };
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  // Each Electron gets its own user data. Electrons that share one disk cache can crash.
  mkdirSync(join(root, "build", "page-data"), { recursive: true });
  const userData = mkdtempSync(join(root, "build", "page-data", "electron-"));
  const child: ChildProcess = spawn(
    ELECTRON,
    [
      join(root, "build/dev/page-harness.js"),
      JSON.stringify(config),
      `--user-data-dir=${userData}`,
    ],
    { env, stdio: ["pipe", "pipe", "pipe"] },
  );

  const log: string[] = [];
  const waiting = new Map<number, { done(v: unknown): void; fail(e: Error): void }>();
  let ready: () => void;
  let failed: (error: Error) => void;
  const started = new Promise<void>((done, fail) => {
    ready = done;
    failed = fail;
  });
  const failAll = (error: Error) => {
    failed(error);
    for (const call of waiting.values()) call.fail(error);
    waiting.clear();
  };
  // Keep the end of stderr, so that a crash tells why.
  let stderr = "";
  child.stderr!.on("data", (data) => (stderr = (stderr + data).slice(-STDERR_KEEP)));
  const withStderr = (text: string) =>
    new Error(stderr ? `${text}\nElectron stderr:\n${stderr}` : text);
  createInterface({ input: child.stdout! }).on("line", (line) => {
    if (!line.startsWith(PREFIX)) return;
    const message = JSON.parse(line.slice(PREFIX.length));
    if (message.event === "ready") ready();
    else if (message.event === "error") failed(new Error(message.message));
    else if (message.event === "console") log.push(`console.${message.level}: ${message.message}`);
    else if (message.event === "gone") failAll(withStderr(`The page stopped: ${message.reason}`));
    else if (message.event) log.push(message.event);
    else {
      const call = waiting.get(message.id);
      waiting.delete(message.id);
      if ("error" in message) call?.fail(new Error(message.error));
      else call?.done(message.value);
    }
  });
  child.on("exit", (code, signal) => {
    rmSync(userData, { recursive: true, force: true });
    failAll(withStderr(`Electron exited with code ${code}, signal ${signal}`));
  });
  await started;

  let next = 0;
  const call = (action: Command["action"], ...args: unknown[]) =>
    new Promise<unknown>((done, fail) => {
      const id = next++;
      waiting.set(id, { done, fail });
      child.stdin!.write(`${JSON.stringify({ id, action, args } satisfies Command)}\n`);
    });
  const found = (action: "hover" | "click") => async (selector: string) => {
    if (!(await call(action, selector))) throw new Error(`${action}: no element for ${selector}`);
  };

  return {
    key: (key, modifiers = []) => call("key", key, modifiers) as Promise<void>,
    type: (text) => call("type", text) as Promise<void>,
    hover: found("hover"),
    click: found("click"),
    scroll: (pixels) => call("scroll", pixels) as Promise<void>,
    eval: <T>(code: string) => call("eval", code) as Promise<T>,
    shot: (name) => call("shot", out, name) as Promise<void>,
    clipboard: () => call("clipboard") as Promise<string[]>,
    log,
    close: () => child.kill(),
  };
}
