import { createInterface } from "node:readline";
import { app } from "@zenbu-labs/pixel/electron";
import { openPage, type PageConfig } from "./page-driver.ts";
import { type Command, PREFIX } from "./page-protocol.ts";

// Starts with the page config as JSON in argv[2]. Then reads one command on each stdin line.
const send = (message: object) => process.stdout.write(`${PREFIX}${JSON.stringify(message)}\n`);

async function run(): Promise<void> {
  app.dock?.hide();
  const config = JSON.parse(process.argv[2] ?? "{}") as PageConfig;
  const page = await openPage(config, {
    console: (level, message) => send({ event: "console", level, message }),
    gone: (reason) => send({ event: "gone", reason }),
    quit: () => send({ event: "quit" }),
  });
  send({ event: "ready" });
  const lines = createInterface({ input: process.stdin });
  lines.on("line", async (line) => {
    const { id, action, args } = JSON.parse(line) as Command;
    try {
      const value =
        action === "clipboard"
          ? page.clipboard
          : await (page[action] as (...a: unknown[]) => Promise<unknown>)(...args);
      send({ id, value: value ?? null });
    } catch (error) {
      send({ id, error: error instanceof Error ? error.message : String(error) });
    }
  });
  lines.on("close", () => app.exit(0));
}

app
  .whenReady()
  .then(run)
  .catch((error) => {
    send({ event: "error", message: String(error) });
    app.exit(1);
  });
