import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { instancesDir, readRecords } from "./registry.ts";

/**
 * An mdb that waits for its pane before it starts, for example a new Rex pane that waits for its
 * real size. The CLI that opened the pane finds the record, and does not give up on the pane.
 */
export interface WaitingInfo {
  pid: number;
  tab: string | null;
  token: string | null;
  since: number;
}

// Not ".json": an older mdb lists every ".json" file as an instance.
const WAITING = ".waiting";
// A new pane that the user can see gets its size in about half a second.
const LONG_WAIT_MS = 2_000;

export function markWaiting(
  { tab, token }: { tab: string | null; token: string | null },
  env: NodeJS.ProcessEnv = process.env,
): { withdraw(): void } {
  const dir = instancesDir(env);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${process.pid}${WAITING}`);
  const info: WaitingInfo = { pid: process.pid, tab, token, since: Date.now() };
  writeFileSync(file, JSON.stringify(info));
  return { withdraw: () => rmSync(file, { force: true }) };
}

export function listWaiting(env: NodeJS.ProcessEnv = process.env): WaitingInfo[] {
  return readRecords<WaitingInfo>(env, WAITING);
}

/** True when the mdb has waited long enough that the CLI should say so. */
export function longWait(info: WaitingInfo, now: number = Date.now()): boolean {
  return now - info.since > LONG_WAIT_MS;
}
