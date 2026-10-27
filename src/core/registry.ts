import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

/**
 * What the control socket understands. 2: folders (`path: null`) and stdin documents.
 * An mdb from before has no number.
 */
export const PROTOCOL = 2;

export interface InstanceInfo {
  pid: number;
  socket: string;
  tab: string | null;
  /** The wait token this mdb was started with, so the CLI that started it can find it. */
  token: string | null;
  protocol?: number;
  startedAt: number;
}

export function instancesDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.XDG_STATE_HOME;
  const base =
    configured && isAbsolute(configured)
      ? configured
      : join(env.HOME ?? homedir(), ".local", "state");
  return join(base, "mdb", "instances");
}

export function instanceSocket(env: NodeJS.ProcessEnv = process.env): string {
  return join(instancesDir(env), `${process.pid}.sock`);
}

export function registerInstance(
  { tab, token }: { tab: string | null; token: string | null },
  env: NodeJS.ProcessEnv = process.env,
): InstanceInfo & { withdraw(): void } {
  const dir = instancesDir(env);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${process.pid}.json`);
  const info: InstanceInfo = {
    pid: process.pid,
    socket: instanceSocket(env),
    tab,
    token,
    protocol: PROTOCOL,
    startedAt: Date.now(),
  };
  writeFileSync(file, JSON.stringify(info));
  return {
    ...info,
    withdraw() {
      rmSync(file, { force: true });
      rmSync(info.socket, { force: true });
    },
  };
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function listInstances(env: NodeJS.ProcessEnv = process.env): InstanceInfo[] {
  const dir = instancesDir(env);
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const found: InstanceInfo[] = [];
  for (const name of names) {
    const file = join(dir, name);
    let info: InstanceInfo | null = null;
    try {
      info = JSON.parse(readFileSync(file, "utf8")) as InstanceInfo;
    } catch {}
    if (info && typeof info.pid === "number" && alive(info.pid)) found.push(info);
    else {
      rmSync(file, { force: true });
      if (info?.socket) rmSync(info.socket, { force: true });
    }
  }
  return found.sort((a, b) => b.startedAt - a.startedAt);
}
