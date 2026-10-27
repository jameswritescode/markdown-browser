import { fstatSync } from "node:fs";

/** Reads all of stdin. When `waitFirstMs` is set and no byte arrives in time, returns null. */
export function readStdin(
  stream: NodeJS.ReadableStream,
  waitFirstMs: number | null,
): Promise<string | null> {
  return new Promise((done, fail) => {
    const chunks: string[] = [];
    const timer =
      waitFirstMs === null
        ? null
        : setTimeout(() => {
            stream.removeAllListeners("data");
            stream.removeAllListeners("end");
            stream.pause();
            (stream as { destroy?: () => void }).destroy?.();
            done(null);
          }, waitFirstMs);
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      if (timer) clearTimeout(timer);
      chunks.push(chunk);
    });
    stream.on("end", () => {
      if (timer) clearTimeout(timer);
      done(chunks.join(""));
    });
    stream.on("error", (error) => {
      if (timer) clearTimeout(timer);
      fail(error);
    });
  });
}

/**
 * True when stdin is a pipe, a socket (Node gives child processes socket pairs) or a regular
 * file; not a terminal or a device such as /dev/null.
 */
export function stdinHasInput(fd = 0): boolean {
  try {
    const stat = fstatSync(fd);
    return stat.isFIFO() || stat.isSocket() || stat.isFile();
  } catch {
    return false;
  }
}

/**
 * The terminal device that pixel can read keys from. pixel finds its pane by this name, so
 * /dev/tty, which names no pane, does not work.
 */
export function keyDevice(name: string | null): string | null {
  return name && name.startsWith("/dev/") && name !== "/dev/tty" ? name : null;
}
