const QUERY_TIMEOUT_MS = 500;
const ESC = "\x1b";

export interface Cell {
  width: number;
  height: number;
}

/** The cell size in a reply to CSI 16 t (ESC [ 6 ; height ; width t). */
export function cellSize(reply: string): Cell | null {
  const match = new RegExp(`${ESC}\\[6;(\\d+);(\\d+)t`).exec(reply);
  return match ? { width: Number(match[2]), height: Number(match[1]) } : null;
}

/**
 * Asks the terminal for its cell size. Null when stdin and stdout are not a terminal, or when the
 * terminal does not answer.
 */
export function queryCell(): Promise<Cell | null> {
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
