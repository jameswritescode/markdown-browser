import type { Terminal } from "@zenbu-labs/pixel/terminal";
import type { Render } from "../shared/types.ts";
import type { Host } from "./host.ts";

// Rex does not take shared memory frames, and it falls behind when a large pane gets many full
// frames each second.
const REX_RENDER: Render = { fps: 10, frames: "file", present: "animation" };
// When mdb cannot read the cell size, it waits only for a short time, because the pane can be a
// real 80x24 pane.
const SIZE_WAIT_MS = 1_000;
const QUERY_TIMEOUT_MS = 500;
const ESC = "\x1b";

interface Cell {
  width: number;
  height: number;
}

/**
 * The Rex terminal (https://www.superlogical.com/rex). pixel finds Rex panes and opens them. A
 * pane is a Rex block, and its tab is the block's window. mdb draws differently in Rex.
 */
export function rexHost(terminal: Terminal): Host {
  return {
    terminal,
    render: REX_RENDER,
    async tab() {
      const pane = await terminal
        .getCurrentPane?.({ tty: null, cwd: process.cwd() })
        .catch(() => null);
      return pane?.tab ?? null;
    },
    async ready(waiting) {
      const { columns, rows } = process.stdout;
      if (columns !== 80 || rows !== 24) return;
      const cell = await queryCell();
      if (!cell) await resized(SIZE_WAIT_MS);
      else if (placeholderSize(columns, rows, cell)) {
        waiting();
        await resized(null);
      }
    },
  };
}

/**
 * A new Rex pane starts at 80x24 with 8x16 cells, and gets its real size when a Rex window shows
 * it. That can be many seconds later, for example when the Rex window is minimized. If pixel
 * starts before that, it draws at the wrong size and then zooms the page.
 */
export function placeholderSize(columns: number, rows: number, cell: Cell): boolean {
  return columns === 80 && rows === 24 && cell.width === 8 && cell.height === 16;
}

/** The cell size in a reply to CSI 16 t (ESC [ 6 ; height ; width t). */
export function cellSize(reply: string): Cell | null {
  const match = new RegExp(`${ESC}\\[6;(\\d+);(\\d+)t`).exec(reply);
  return match ? { width: Number(match[2]), height: Number(match[1]) } : null;
}

function queryCell(): Promise<Cell | null> {
  const { stdin } = process;
  if (!stdin.isTTY || !process.stdout.isTTY) return Promise.resolve(null);
  const wasRaw = stdin.isRaw;
  return new Promise((done) => {
    let reply = "";
    const finish = (cell: Cell | null) => {
      clearTimeout(timer);
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      done(cell);
    };
    const onData = (chunk: Buffer) => {
      reply += chunk.toString("binary");
      const cell = cellSize(reply);
      if (cell) finish(cell);
    };
    const timer = setTimeout(() => finish(null), QUERY_TIMEOUT_MS);
    stdin.setRawMode(true);
    stdin.on("data", onData);
    stdin.resume();
    process.stdout.write(`${ESC}[16t`);
  });
}

/** Resolves when the pane changes size, or after ms. With null, it waits for the change only. */
export function resized(ms: number | null): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      clearTimeout(timer);
      process.stdout.off("resize", finish);
      done();
    };
    // A resize listener does not keep Node alive, so a wait with no limit also needs a timer.
    const timer = setTimeout(finish, ms ?? 2 ** 31 - 1);
    process.stdout.on("resize", finish);
  });
}
