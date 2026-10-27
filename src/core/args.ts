import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Background, Direction, Launch } from "../shared/types.ts";
import { isMarkdownPath } from "./scan.ts";

const DIRECTIONS: readonly string[] = ["right", "left", "down", "up"];
const VALUE_FLAGS = new Set(["--split", "--size", "--heading", "--tab", "--title", "--wait-token"]);

export function parseArgs(
  argv: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Launch | { error: string } {
  let background: Background = env.MDB_BACKGROUND === "solid" ? "solid" : "transparent";
  let fresh = false;
  let replace = false;
  let stdin = false;
  const values = new Map<string, string | undefined>();
  const paths: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const [flag, inline] = arg.startsWith("--") ? splitFlag(arg) : [arg, undefined];
    if (arg === "--solid") background = "solid";
    else if (arg === "--new") fresh = true;
    else if (arg === "--replace") replace = true;
    else if (arg === "-") stdin = true;
    else if (VALUE_FLAGS.has(flag)) {
      const value = inline ?? argv[i + 1];
      if (inline === undefined && value !== undefined) i++;
      values.set(flag, value?.startsWith("--") ? undefined : value);
    } else if (arg.startsWith("-")) return { error: `mdb: unknown option ${arg}` };
    else paths.push(arg);
  }

  let split: Direction | null = null;
  if (values.has("--split")) {
    const raw = values.get("--split");
    if (raw === undefined || !DIRECTIONS.includes(raw))
      return { error: "mdb: --split takes right, left, down, or up" };
    split = raw as Direction;
  }
  let size: number | null = null;
  if (values.has("--size")) {
    size = Number(values.get("--size"));
    if (!Number.isFinite(size) || size < 0.2 || size > 0.95)
      return { error: "mdb: --size takes a number between 0.2 and 0.95" };
  }
  for (const flag of ["--heading", "--tab", "--title", "--wait-token"]) {
    if (values.has(flag) && !values.get(flag)) return { error: `mdb: ${flag} takes a value` };
  }
  const heading = values.get("--heading") ?? null;
  const tab = values.get("--tab") ?? env.CMUX_WORKSPACE_ID ?? null;
  const title = values.get("--title") ?? null;
  const waitToken = values.get("--wait-token") ?? null;
  const launch = (root: string, openPath: string | null): Launch => ({
    start: { root, openPath, background, heading, tab, waitToken },
    split,
    size,
    fresh,
    replace,
    stdin,
    title,
    pathGiven: paths.length > 0,
  });

  if (title !== null && paths.length > 0)
    return { error: "mdb: --title works only with stdin (-)" };
  if (stdin)
    return paths.length > 0 ? { error: "mdb: - takes no file or folder" } : launch(cwd, null);
  if (paths.length > 1) return { error: `mdb: expected one file or folder, got ${paths.length}` };
  const given = paths[0];
  if (given === undefined) return launch(cwd, null);
  const target = resolve(cwd, given);
  let isDirectory: boolean;
  try {
    isDirectory = statSync(target).isDirectory();
  } catch {
    return { error: `mdb: ${given}: no such file or folder` };
  }
  if (isDirectory) return launch(target, null);
  if (!isMarkdownPath(target)) return { error: `mdb: ${given}: not a markdown file` };
  return launch(dirname(target), target);
}

function splitFlag(arg: string): [string, string | undefined] {
  const at = arg.indexOf("=");
  return at < 0 ? [arg, undefined] : [arg.slice(0, at), arg.slice(at + 1)];
}
