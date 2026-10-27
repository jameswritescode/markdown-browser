import { PassThrough, Readable } from "node:stream";
import { expect, test } from "vitest";
import { keyDevice, readStdin } from "../src/cli/stdin.ts";

test("reads the stream to its end", async () => {
  expect(await readStdin(Readable.from(["# a", "\n\nb"]), null)).toBe("# a\n\nb");
});

test("gives up when no byte comes in time", async () => {
  expect(await readStdin(new PassThrough(), 50)).toBeNull();
});

test("waits for a slow writer that starts in time", async () => {
  const stream = new PassThrough();
  setTimeout(() => stream.end("# late"), 30);
  expect(await readStdin(stream, 200)).toBe("# late");
});

test("only a named terminal device can give pixel its keys", () => {
  expect(keyDevice("/dev/ttys004")).toBe("/dev/ttys004");
  expect(keyDevice("/dev/tty")).toBeNull();
  expect(keyDevice("not a tty")).toBeNull();
  expect(keyDevice(null)).toBeNull();
});

test("says that it waits when a pipe stays open", async () => {
  const stream = new PassThrough();
  stream.write("# part");
  let said = 0;
  const read = readStdin(stream, null, { afterMs: 30, say: () => said++ });
  await new Promise((done) => setTimeout(done, 60));
  stream.end(" two");
  expect(await read).toBe("# part two");
  expect(said).toBe(1);
});

test("says nothing when stdin ends in time", async () => {
  let said = 0;
  expect(await readStdin(Readable.from(["# a"]), null, { afterMs: 30, say: () => said++ })).toBe(
    "# a",
  );
  await new Promise((done) => setTimeout(done, 60));
  expect(said).toBe(0);
});
