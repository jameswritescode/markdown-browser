import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const seconds = 6;
const outDir = join(root, "build", "smoke");
const out = join(outDir, "pty.out");
const log = join(
  process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"),
  "pixel",
  "logs",
  "markdown-browser.stderr.log",
);

mkdirSync(outDir, { recursive: true });
rmSync(out, { force: true });
rmSync(log, { force: true });

const quoted = [
  join(root, "bin", "mdb.js"),
  ...args.map((a) => (a.startsWith("-") ? a : resolve(a))),
]
  .map((a) => `'${a}'`)
  .join(" ");
const child = spawn(
  "script",
  ["-q", out, "sh", "-c", `stty cols 140 rows 45; PIXEL_SKIP_GRAPHICS_CHECK=1 node ${quoted}`],
  {
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  },
);

await new Promise((done) => setTimeout(done, seconds * 1000));
const alive = child.exitCode === null;
const logText = existsSync(log) ? readFileSync(log, "utf8") : "";
try {
  process.kill(-child.pid, "SIGTERM");
} catch {}
await new Promise((done) => setTimeout(done, 500));

const output = existsSync(out) ? readFileSync(out) : Buffer.alloc(0);
const graphics = output.includes(Buffer.from("\x1b_G"));
const errors = logText
  .split("\n")
  .filter((line) => /error|uncaught|exception/i.test(line) && !line.includes("sandbox_extension"));
const KNOWN_NOISE = /network_service_instance_impl/;
const warnings = errors.filter((line) => KNOWN_NOISE.test(line));
const failures = errors.filter((line) => !KNOWN_NOISE.test(line));

console.log(`alive after ${seconds}s: ${alive}`);
console.log(`kitty graphics sent: ${graphics} (${output.length} bytes)`);
console.log(`log errors: ${failures.length}`);
for (const line of failures.slice(0, 20)) console.log(`  ${line}`);
for (const line of warnings) console.log(`  (known Chromium noise) ${line}`);
process.exit(alive && graphics && failures.length === 0 ? 0 : 1);
