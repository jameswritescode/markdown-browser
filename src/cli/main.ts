import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { openSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import {
  callerTty,
  canSplit,
  cannotOpenPanes,
  detect,
  type Pane,
  type Terminal,
} from "@zenbu-labs/pixel/terminal";
import { parseArgs } from "../core/args.ts";
import { type StdinContent, sendControl } from "../core/control.ts";
import { type InstanceInfo, listInstances } from "../core/registry.ts";
import { stdinKey } from "../core/stdin.ts";
import type { Direction, Launch } from "../shared/types.ts";
import { chooseAction, isGone, reuseLine, splitCommand, wantsHelp, wantsSkill } from "./launch.ts";
import { installSkill } from "./skill.ts";
import { readStdin, stdinHasInput } from "./stdin.ts";

const USAGE = `usage: mdb [file.md | folder | -] [options]
       mdb skill install

  mdb              browse the markdown files in this folder
  mdb <folder>     browse the markdown files in <folder>
  mdb <file.md>    open <file.md>
  mdb -            show the markdown on stdin
  … | mdb          show the markdown on stdin, if it comes within 5 seconds

options:
  --title <text>       name the stdin document; a later pipe with the same title updates it
  --solid              paint the terminal's background colour instead of a transparent page
  --heading <text>     go to the first heading that matches <text>
  --split <direction>  open mdb in a new pane: right, left, down, or up
  --size <fraction>    the size of the new pane, from 0.2 to 0.95
  --new                open a new pane, even if this terminal tab already shows mdb
  --replace            show the file in the mdb pane's current tab, not a new tab

With no terminal on stdout (for example, in a coding agent's shell), mdb acts as if you
gave --split right. With --split, mdb opens the document in a new tab in this terminal
tab's mdb pane if there is one, and opens a new pane if there is not. If a tab already
shows the document, mdb goes to that tab. A folder opens its file list in a new tab.

mdb skill install    install the mdb skill for Claude Code and Codex
`;

const PACKAGE_ROOT = join(__dirname, "..", "..");
const BIN = join(PACKAGE_ROOT, "bin", "mdb.js");
const REGISTER_TIMEOUT_MS = 15_000;
// A plain pipe that sends nothing in this time is not markdown for mdb, so mdb shows the file list.
const PIPE_WAIT_MS = 5_000;

const fail = (message: string): number => {
  process.stderr.write(`${message}\n`);
  return 1;
};
const say = (message: string) => process.stdout.write(`${message}\n`);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export async function main(argv: string[]): Promise<number> {
  if (wantsHelp(argv)) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (wantsSkill(argv)) return skillCommand(argv.slice(1));

  const launch = parseArgs(argv, process.cwd(), process.env);
  if ("error" in launch) return fail(launch.error);

  let content: StdinContent | null = null;
  const piped = !launch.pathGiven && stdinHasInput();
  // --title asks for stdin as clearly as "-" does.
  const wanted = launch.stdin || (launch.title !== null && piped);
  if (launch.title !== null && !wanted) return fail("mdb: --title works only with stdin (-)");
  if (wanted || piped) {
    const text = await readStdin(process.stdin, wanted ? null : PIPE_WAIT_MS);
    if (text?.trim()) content = { key: stdinKey(launch.title), text, title: launch.title };
    else if (wanted) return fail("mdb: stdin is empty");
  }

  const tty = Boolean(process.stdout.isTTY);
  if (chooseAction(launch, { tty, tab: null, instances: [] }).kind === "here")
    return runHere(launch, content);

  const terminal = detect(process.env);
  if (!terminal || !canSplit(terminal)) return fail(`mdb: ${cannotOpenPanes(terminal)}`);
  const callerPath = callerTty().path;
  let from: Pane | null;
  try {
    from = (await terminal.getCurrentPane?.({ tty: callerPath, cwd: process.cwd() })) ?? null;
  } catch (error) {
    return fail(`mdb: ${terminal.name}: ${(error as Error).message}`);
  }
  if (!from) return fail(`mdb: could not find which ${terminal.name} pane you are in`);

  const action = chooseAction(launch, { tty, tab: from.tab, instances: listInstances() });
  if (action.kind === "reuse") {
    const done = await reuse(action.instance, launch, content);
    if (done !== null) return done;
  }
  const direction: Direction =
    action.kind === "split" ? action.direction : (launch.split ?? "right");
  return openSplit(terminal, from, direction, launch, callerPath, content);
}

async function runHere(launch: Launch, content: StdinContent | null): Promise<number> {
  const pixelDir = dirname(dirname(require.resolve("@zenbu-labs/pixel")));
  const pixelPackage = JSON.parse(readFileSync(join(pixelDir, "package.json"), "utf8")) as {
    bin: { pixel: string };
  };
  // pixel reads keys from stdin. When stdin was a pipe, it gets the terminal instead. It
  // must be the terminal's own device: pixel finds its pane by the name, and /dev/tty
  // names no pane.
  let keys: "inherit" | number = "inherit";
  const env = { ...process.env };
  if (!process.stdin.isTTY) {
    const device = callerTty().path ?? "/dev/tty";
    try {
      keys = openSync(device, "r");
    } catch {
      return fail("mdb: no terminal to read keys from");
    }
    if (device !== "/dev/tty") env.PIXEL_TTY = device;
  }
  const token = content ? randomUUID() : null;
  const start = content ? { ...launch.start, openPath: null, waitToken: token } : launch.start;
  const child = spawn(
    process.execPath,
    [join(pixelDir, pixelPackage.bin.pixel), PACKAGE_ROOT, "--", JSON.stringify(start)],
    { stdio: [keys, "inherit", "inherit"], env },
  );
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
    process.on(signal, () => child.kill(signal));
  const exited = new Promise<number>((done) =>
    child.on("exit", (code, signal) => done(code ?? (signal ? 128 : 0))),
  );
  if (!content || !token) return exited;
  // Say why only after pixel gives the terminal back.
  const problem = await sendWhenStarted(token, launch, content, child);
  if (problem) child.kill("SIGTERM");
  const code = await exited;
  return problem ? fail(problem) : code;
}

/** Waits for the mdb with this token to register, then sends it the stdin document. */
async function sendWhenStarted(
  token: string,
  launch: Launch,
  content: StdinContent,
  child: ChildProcess | null,
): Promise<string | null> {
  const deadline = Date.now() + REGISTER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) return null;
    const instance = listInstances().find((found) => found.token === token);
    if (instance) {
      try {
        const reply = await sendControl(instance.socket, openMessage(launch, content));
        return "error" in reply ? `mdb: ${reply.error}` : null;
      } catch (error) {
        return `mdb: the new mdb did not take the document: ${(error as Error).message}`;
      }
    }
    await sleep(100);
  }
  return `mdb: mdb did not start within ${REGISTER_TIMEOUT_MS / 1000}s`;
}

function openMessage(launch: Launch, content: StdinContent | null) {
  return {
    cmd: "open" as const,
    path: content ? content.key : launch.start.openPath,
    root: launch.start.root,
    heading: launch.start.heading,
    mode: launch.replace ? ("replace" as const) : ("tab" as const),
    ...(content ? { content } : {}),
  };
}

function describe(launch: Launch, content: StdinContent | null): string {
  if (content) return content.title ?? "stdin";
  const target = launch.start.openPath ?? launch.start.root;
  const relativePath = relative(process.cwd(), target) || ".";
  const shown = relativePath.startsWith("..") ? target : relativePath;
  return launch.start.openPath ? shown : `the file list of ${shown}`;
}

async function reuse(
  instance: InstanceInfo,
  launch: Launch,
  content: StdinContent | null,
): Promise<number | null> {
  let reply;
  try {
    reply = await sendControl(instance.socket, openMessage(launch, content));
  } catch (error) {
    if (isGone(error)) return null;
    return fail(`mdb: the mdb pane in this tab did not answer: ${(error as Error).message}`);
  }
  if ("error" in reply) return fail(`mdb: ${reply.error}`);
  say(reuseLine(reply.result, describe(launch, content)));
  if (launch.start.heading && reply.heading === false)
    process.stderr.write(`mdb: no heading matches "${launch.start.heading}"\n`);
  return 0;
}

async function openSplit(
  terminal: Terminal,
  from: Pane,
  direction: Direction,
  launch: Launch,
  callerPath: string | null,
  content: StdinContent | null,
): Promise<number> {
  const before = new Set(listInstances().map((instance) => instance.pid));
  const token = content ? randomUUID() : null;
  try {
    await terminal.split!({
      from,
      direction,
      command: splitCommand(process.execPath, BIN, launch, from.tab, token),
      size: launch.size,
      tty: callerPath,
    });
  } catch (error) {
    return fail(`mdb: ${terminal.name}: ${(error as Error).message}`);
  }
  if (content && token) {
    const problem = await sendWhenStarted(token, launch, content, null);
    if (problem) return fail(problem);
    say(`mdb: opened ${describe(launch, content)} in a new pane (${direction})`);
    return 0;
  }
  const deadline = Date.now() + REGISTER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (
      listInstances().some((instance) => !before.has(instance.pid) && instance.tab === from.tab)
    ) {
      say(`mdb: opened ${describe(launch, null)} in a new pane (${direction})`);
      return 0;
    }
    await sleep(100);
  }
  return fail(
    `mdb: opened a ${direction} pane, but mdb did not start in it within ${REGISTER_TIMEOUT_MS / 1000}s`,
  );
}

function skillCommand(args: string[]): number {
  if (args[0] !== "install" || args.length > 1) return fail("usage: mdb skill install");
  const read = (name: string) => readFileSync(join(PACKAGE_ROOT, "skill", name), "utf8");
  for (const result of installSkill(homedir(), read("SKILL.md"), read("codex-note.md"))) {
    if (result.status === "skipped")
      say(
        `${result.agent}: skipped ${result.path}. mdb did not write this file, so it is left as it is.`,
      );
    else say(`${result.agent}: ${result.status} ${result.path}`);
  }
  return 0;
}
