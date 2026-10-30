import { expect, test } from "vitest";
import { placeholderSize, rex } from "../src/cli/rex.ts";

const ENV = {
  REX_SESSION: "session:S",
  REX_BLOCK: "block:B",
  REX_BIN_DIR: "/rex/bin",
};

function recorder(replies: Record<string, string> = {}) {
  const calls: { bin: string; args: string[] }[] = [];
  const run = async (bin: string, args: string[]) => {
    calls.push({ bin, args });
    return replies[args[1] ?? ""] ?? "{}";
  };
  return { calls, run };
}

test("rex is found only inside a Rex pane, and not inside tmux", () => {
  const { run } = recorder();
  expect(rex(ENV, run)?.name).toBe("rex");
  expect(rex({ ...ENV, REX_BLOCK: undefined }, run)).toBeNull();
  expect(rex({ ...ENV, TMUX: "/tmp/tmux" }, run)).toBeNull();
});

test("the current pane is the caller's block, and its tab is the block's window", async () => {
  const { calls, run } = recorder({
    inspect: JSON.stringify({ block: { block_id: "block:B", window_id: "window:W" } }),
  });
  const pane = await rex(ENV, run)!.getCurrentPane!({ tty: null, cwd: "/w" });
  expect(pane).toEqual({ id: "block:B", tab: "window:W" });
  expect(calls[0]).toEqual({
    bin: "/rex/bin/rex",
    args: ["block", "inspect", "block:B", "-s", "session:S", "--json"],
  });
});

test("rex on the PATH is used when Rex does not give its folder", async () => {
  const { calls, run } = recorder();
  await rex({ ...ENV, REX_BIN_DIR: undefined }, run)!.getCurrentPane!({
    tty: null,
    cwd: "/w",
  }).catch(() => null);
  expect(calls[0]?.bin).toBe("rex");
});

test("a split opens a block beside the caller that runs the command", async () => {
  const { calls, run } = recorder();
  await rex(ENV, run)!.split!({
    from: { id: "block:B", tab: "window:W" },
    direction: "down",
    command: ["/bin/node", "/mdb/bin/mdb.js", "/d/a.md"],
    size: 0.4,
    tty: null,
  });
  expect(calls[0]?.args).toEqual([
    "split",
    "-s",
    "session:S",
    "-b",
    "block:B",
    "--split=below",
    "--ratio",
    "40",
    "-c",
    process.cwd(),
    "--label",
    "mdb",
    "--",
    "/bin/node",
    "/mdb/bin/mdb.js",
    "/d/a.md",
  ]);
});

test("a split with no size lets Rex choose the size", async () => {
  const { calls, run } = recorder();
  await rex(ENV, run)!.split!({
    from: { id: "block:B", tab: "window:W" },
    direction: "up",
    command: ["mdb"],
    size: null,
    tty: null,
  });
  expect(calls[0]?.args).toContain("--split=above");
  expect(calls[0]?.args).not.toContain("--ratio");
});

test("in a new Rex pane, mdb waits for the real size, because the pane starts at 80x24", () => {
  expect(placeholderSize(80, 24)).toBe(true);
  expect(placeholderSize(154, 22)).toBe(false);
});
