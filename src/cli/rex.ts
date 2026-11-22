import type { Terminal } from "@zenbu-labs/pixel/terminal";
import type { Render } from "../shared/types.ts";
import type { Host } from "./host.ts";
import { type Cell, queryCell, resized } from "./pane-size.ts";

// Over a slow link, such as a Rex app that connects through Tailscale, more frames make Rex lag.
// 60 is smooth on a local display. pixel chooses the frames and how to send them.
const REX_RENDER: Render = { fps: 60, frames: null, present: null };

// When mdb cannot read the cell size, it waits only for a short time, because the pane can be a
// real 80x24 pane.
const SIZE_WAIT_MS = 1_000;

/**
 * The Rex terminal (https://www.superlogical.com/rex). pixel finds Rex panes, opens them, and
 * chooses how to draw in Rex, at most at 60 frames each second. A pane is a Rex block, and its
 * tab is the block's window.
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
    async ready() {
      const { columns, rows } = process.stdout;
      if (columns !== 80 || rows !== 24) return;
      const cell = await queryCell();
      if (!cell) await resized(SIZE_WAIT_MS);
      else if (placeholderSize(columns, rows, cell)) await resized(null);
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
