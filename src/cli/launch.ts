import { type InstanceInfo, PROTOCOL } from "../core/registry.ts";
import type { Direction, Launch } from "../shared/types.ts";

export type Action =
  | { kind: "here" }
  | { kind: "reuse"; instance: InstanceInfo }
  | { kind: "split"; direction: Direction };

export interface Situation {
  tty: boolean;
  tab: string | null;
  instances: InstanceInfo[];
}

export function chooseAction(launch: Launch, situation: Situation): Action {
  const direction = launch.split ?? (situation.tty ? null : "right");
  if (direction === null) return { kind: "here" };
  if (!launch.fresh && situation.tab !== null) {
    const instance = situation.instances.find((found) => found.tab === situation.tab);
    // An mdb from before folder and stdin tabs can take only a file.
    const fits = launch.start.openPath !== null || (instance?.protocol ?? 0) >= PROTOCOL;
    if (instance && fits) return { kind: "reuse", instance };
  }
  return { kind: "split", direction };
}

export function splitCommand(
  node: string,
  bin: string,
  launch: Launch,
  tab: string | null,
  waitToken: string | null = null,
): string[] {
  const { start } = launch;
  const command = [node, bin, start.openPath ?? start.root];
  if (waitToken) command.push(`--wait-token=${waitToken}`);
  if (start.background === "solid") command.push("--solid");
  if (start.heading) command.push(`--heading=${start.heading}`);
  if (tab) command.push("--tab", tab);
  return command;
}

const VALUE_FLAGS = new Set(["--split", "--size", "--heading", "--tab", "--title", "--wait-token"]);

export function wantsHelp(argv: string[]): boolean {
  return argv.some(
    (arg, i) => (arg === "--help" || arg === "-h") && !VALUE_FLAGS.has(argv[i - 1] ?? ""),
  );
}

export function wantsSkill(argv: string[]): boolean {
  return argv[0] === "skill" && argv[1] === "install";
}

/** The line the CLI prints after a reused mdb pane answers. */
export function reuseLine(result: unknown, shown: string): string {
  if (result === "tab") return `mdb: opened ${shown} in a tab in the mdb pane`;
  if (result === "switched") return `mdb: switched to ${shown} in the mdb pane`;
  if (result === "updated") return `mdb: updated ${shown} in the mdb pane`;
  // "replaced", or an mdb from before tabs, which replaces the document.
  return `mdb: showing ${shown} in the mdb pane`;
}

/** The warning for a heading that matched nothing in the document mdb opened. */
export function headingWarning(
  reply: Record<string, unknown>,
  heading: string | null,
): string | null {
  return heading && reply.heading === false ? `mdb: no heading matches "${heading}"` : null;
}

export function isGone(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOENT" || code === "ECONNREFUSED";
}
