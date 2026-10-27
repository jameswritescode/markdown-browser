import { mkdirSync, rmSync } from "node:fs";
import { createConnection, createServer, type Server } from "node:net";
import { dirname } from "node:path";

export interface StdinContent {
  key: string;
  text: string;
  title: string | null;
}

export interface OpenMessage {
  cmd: "open";
  /** A file, a stdin key (with `content`), or null for the file list of `root`. */
  path: string | null;
  heading: string | null;
  // An mdb from before tabs sends neither.
  root?: string;
  mode?: "tab" | "replace";
  content?: StdinContent;
}

export interface OpenRequest {
  path: string | null;
  root: string;
  heading: string | null;
  mode: "tab" | "replace";
  content?: StdinContent;
}

/** Fills in what an older mdb leaves out: the file's folder, and a new tab. */
export function openRequest(message: OpenMessage): OpenRequest {
  const root = message.root ?? (message.path === null ? null : dirname(message.path));
  if (root === null) throw new Error("an open with no path needs a root");
  return {
    path: message.path,
    root,
    heading: message.heading,
    mode: message.mode === "replace" ? "replace" : "tab",
    ...(message.content ? { content: message.content } : {}),
  };
}

export type ControlMessage = OpenMessage;
export type ControlReply = { error: string } | ({ ok: true } & Record<string, unknown>);

export function serveControl(
  socket: string,
  handle: (message: ControlMessage) => Promise<ControlReply>,
  idleMs = 5000,
): Promise<Server> {
  mkdirSync(dirname(socket), { recursive: true });
  rmSync(socket, { force: true });
  const server = createServer((connection) => {
    let buffer = "";
    let handled = false;
    connection.setEncoding("utf8");
    connection.setTimeout(idleMs, () => connection.destroy());
    connection.on("error", () => {});
    connection.on("data", (chunk: string) => {
      if (handled) return;
      buffer += chunk;
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      const line = buffer.slice(0, end);
      handled = true;
      connection.setTimeout(0);
      void (async () => {
        let reply: ControlReply;
        try {
          reply = await handle(JSON.parse(line) as ControlMessage);
        } catch (error) {
          reply = { error: error instanceof Error ? error.message : String(error) };
        }
        connection.end(`${JSON.stringify(reply)}\n`);
      })();
    });
  });
  return new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(socket, () => done(server));
  });
}

export function sendControl(
  socket: string,
  message: ControlMessage,
  timeoutMs = 15_000,
): Promise<ControlReply> {
  return new Promise((done, fail) => {
    const connection = createConnection(socket);
    let buffer = "";
    const timer = setTimeout(() => {
      connection.destroy();
      fail(new Error("mdb did not answer"));
    }, timeoutMs);
    connection.setEncoding("utf8");
    connection.on("connect", () => connection.write(`${JSON.stringify(message)}\n`));
    connection.on("data", (chunk: string) => (buffer += chunk));
    connection.on("error", (error) => {
      clearTimeout(timer);
      fail(error);
    });
    connection.on("end", () => {
      clearTimeout(timer);
      try {
        done(JSON.parse(buffer) as ControlReply);
      } catch {
        fail(new Error("mdb sent a reply that is not JSON"));
      }
    });
  });
}
