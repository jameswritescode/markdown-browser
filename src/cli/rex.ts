import { join } from "node:path";
import { type Detect, type Direction, shellIn } from "@zenbu-labs/pixel/terminal";
import type { Render } from "../shared/types.ts";
import type { FindHost } from "./host.ts";

// Rex does not take shared memory frames, and it falls behind when a large pane gets many full
// frames each second.
const REX_RENDER: Render = { fps: 10, frames: "file", present: "animation" };
const SIZE_WAIT_MS = 1_000;

const PLACES: Record<Direction, string> = {
  right: "right",
  left: "left",
  down: "below",
  up: "above",
};

/**
 * The Rex terminal (https://www.superlogical.com/rex), which pixel does not know. A pane is a
 * Rex block, and its tab is the block's window.
 */
export const rex: Detect = (env, run) => {
  const session = env.REX_SESSION;
  const block = env.REX_BLOCK;
  // Inside tmux, the Rex variables come from the shell that started tmux.
  if (!session || !block || env.TMUX) return null;
  const binary = env.REX_BIN_DIR ? join(env.REX_BIN_DIR, "rex") : "rex";
  const call = (args: string[]) => run(binary, args);

  return {
    name: "rex",
    async getCurrentPane() {
      const reply = JSON.parse(await call(["block", "inspect", block, "-s", session, "--json"]));
      const { block_id: id, window_id: tab } = reply.block ?? {};
      return id && tab ? { id, tab } : null;
    },
    async split({ from, direction, command, size }) {
      const ratio = size === null ? [] : ["--ratio", String(Math.round(size * 100))];
      await call([
        "split",
        "-s",
        session,
        "-b",
        from.id,
        `--split=${PLACES[direction]}`,
        ...ratio,
        "-c",
        process.cwd(),
        "--label",
        "mdb",
        "--",
        ...command,
      ]);
    },
  };
};

/** The Rex host, or null outside Rex. */
export const rexHost: FindHost = (env) => {
  const terminal = rex(env, shellIn(env));
  if (!terminal) return null;
  return {
    terminal,
    render: REX_RENDER,
    async tab() {
      const pane = await terminal
        .getCurrentPane?.({ tty: null, cwd: process.cwd() })
        .catch(() => null);
      return pane?.tab ?? null;
    },
    async ready() {
      if (placeholderSize(process.stdout.columns, process.stdout.rows)) await resized(SIZE_WAIT_MS);
    },
  };
};

/**
 * A new Rex pane starts at 80x24 with no pixel size, and gets its real size about half a second
 * later. pixel reads the size once when it starts, so mdb must wait for the real size.
 */
export function placeholderSize(columns: number, rows: number): boolean {
  return columns === 80 && rows === 24;
}

function resized(ms: number): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      clearTimeout(timer);
      process.stdout.off("resize", finish);
      done();
    };
    const timer = setTimeout(finish, ms);
    process.stdout.on("resize", finish);
  });
}
