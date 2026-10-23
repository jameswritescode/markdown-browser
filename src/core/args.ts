import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Background, StartOptions } from "../shared/types.ts";
import { isMarkdownPath } from "./scan.ts";

export function parseArgs(
  argv: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): StartOptions | { error: string } {
  let background: Background = env.MDB_BACKGROUND === "solid" ? "solid" : "transparent";
  const paths: string[] = [];
  for (const arg of argv) {
    if (arg === "--solid") background = "solid";
    else if (arg.startsWith("-")) return { error: `mdb: unknown option ${arg}` };
    else paths.push(arg);
  }
  if (paths.length > 1) return { error: `mdb: expected one file or folder, got ${paths.length}` };
  const given = paths[0];
  if (given === undefined) return { root: cwd, openPath: null, background };
  const target = resolve(cwd, given);
  let isDirectory: boolean;
  try {
    isDirectory = statSync(target).isDirectory();
  } catch {
    return { error: `mdb: ${given}: no such file or folder` };
  }
  if (isDirectory) return { root: target, openPath: null, background };
  if (!isMarkdownPath(target)) return { error: `mdb: ${given}: not a markdown file` };
  return { root: dirname(target), openPath: target, background };
}
