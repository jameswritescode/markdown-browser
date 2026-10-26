import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { sendControl, serveControl } from "../src/core/control.ts";
import { instancesDir, listInstances, registerInstance } from "../src/core/registry.ts";

let state: string;
let env: NodeJS.ProcessEnv;
beforeEach(() => {
  state = mkdtempSync(join(tmpdir(), "mdb-registry-"));
  env = { XDG_STATE_HOME: state };
});
afterEach(() => rmSync(state, { recursive: true, force: true }));

test("instances live under XDG_STATE_HOME, or ~/.local/state", () => {
  expect(instancesDir(env)).toBe(join(state, "mdb", "instances"));
  expect(instancesDir({ HOME: "/h" })).toMatch(/\.local\/state\/mdb\/instances$/);
});

test("a registered instance is listed until it is withdrawn", () => {
  const record = registerInstance({ tab: "w:1" }, env);
  expect(record.socket).toBe(join(instancesDir(env), `${process.pid}.sock`));
  expect(listInstances(env)).toEqual([
    { pid: process.pid, socket: record.socket, tab: "w:1", startedAt: expect.any(Number) },
  ]);
  record.withdraw();
  expect(listInstances(env)).toEqual([]);
});

test("records of dead processes and unreadable records are removed", () => {
  registerInstance({ tab: null }, env);
  const dir = instancesDir(env);
  const dead = join(dir, "999999.json");
  writeFileSync(dead, JSON.stringify({ pid: 999999, socket: "x", tab: "w:1", startedAt: 1 }));
  writeFileSync(join(dir, "bad.json"), "{");
  expect(listInstances(env).map((r) => r.pid)).toEqual([process.pid]);
  expect(existsSync(dead)).toBe(false);
  expect(existsSync(join(dir, "bad.json"))).toBe(false);
});

test("a control message reaches the handler and its reply comes back", async () => {
  const socket = join(state, "c.sock");
  const server = await serveControl(socket, async (message) => ({ ok: true, echo: message }));
  expect(await sendControl(socket, { cmd: "open", path: "/a.md", heading: null })).toEqual({
    ok: true,
    echo: { cmd: "open", path: "/a.md", heading: null },
  });
  server.close();
});

test("a handler error comes back as an error reply", async () => {
  const socket = join(state, "c.sock");
  const server = await serveControl(socket, async () => {
    throw new Error("boom");
  });
  expect(await sendControl(socket, { cmd: "open", path: "/a.md", heading: null })).toEqual({
    error: "boom",
  });
  server.close();
});

test("sending to a missing socket rejects", async () => {
  await expect(
    sendControl(join(state, "none.sock"), { cmd: "open", path: "/a.md", heading: null }),
  ).rejects.toThrow();
});

test("serving creates the socket's folder when it is missing", async () => {
  const socket = join(instancesDir(env), "c.sock");
  const server = await serveControl(socket, async () => ({ ok: true }));
  expect(await sendControl(socket, { cmd: "open", path: "/a.md", heading: null })).toEqual({
    ok: true,
  });
  server.close();
});

test("serving replaces a stale socket file", async () => {
  const socket = join(state, "c.sock");
  writeFileSync(socket, "");
  const server = await serveControl(socket, async () => ({ ok: true }));
  expect(await sendControl(socket, { cmd: "open", path: "/a.md", heading: null })).toEqual({
    ok: true,
  });
  server.close();
});

test("a connection that sends no full message is closed", async () => {
  const socket = join(state, "c.sock");
  const server = await serveControl(socket, async () => ({ ok: true }), 100);
  const { createConnection } = await import("node:net");
  const closed = await new Promise<boolean>((done) => {
    const connection = createConnection(socket, () => connection.write("{"));
    connection.on("close", () => done(true));
    setTimeout(() => done(false), 1000);
  });
  expect(closed).toBe(true);
  server.close();
});

test("only the first message on a connection is handled", async () => {
  const socket = join(state, "c.sock");
  let calls = 0;
  const server = await serveControl(socket, async () => ({ ok: true, calls: ++calls }));
  const { createConnection } = await import("node:net");
  const reply = await new Promise<string>((done) => {
    let text = "";
    const connection = createConnection(socket, () => {
      const line = JSON.stringify({ cmd: "open", path: "/a.md", heading: null });
      connection.write(`${line}\n${line}\n`);
    });
    connection.on("data", (chunk) => (text += chunk));
    connection.on("end", () => done(text));
  });
  expect(reply).toBe('{"ok":true,"calls":1}\n');
  expect(calls).toBe(1);
  server.close();
});
