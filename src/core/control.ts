import { mkdirSync, rmSync } from "node:fs";
import { createConnection, createServer, type Server } from "node:net";
import { dirname } from "node:path";

export interface OpenMessage {
  cmd: "open";
  path: string;
  heading: string | null;
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
