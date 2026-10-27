import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("--"));
const named = args.filter((arg) => !arg.startsWith("--"));
const scriptFiles = flags.includes("--all")
  ? readdirSync(join(root, "tophat"))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => join(root, "tophat", file))
  : named.map((file) => resolve(file));
if (scriptFiles.length === 0) {
  process.stderr.write(
    "usage: pnpm tophat <script.json>... [--update]\n       pnpm tophat --all [--update]\n",
  );
  process.exit(2);
}

const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  logLevel: "warning",
  target: "es2023",
};
await build({
  ...shared,
  entryPoints: [join(root, "src/dev/tophat.ts")],
  outfile: join(root, "build/dev/tophat.js"),
  external: ["electron"],
});
await build({
  ...shared,
  entryPoints: [join(root, "src/dev/tophat-preload.ts")],
  outfile: join(root, "build/dev/tophat-preload.js"),
  external: ["electron"],
});

const electron = join(
  root,
  "node_modules/@zenbu-labs/pixel/electron/dist/Electron.app/Contents/MacOS/pixel",
);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const passthrough = flags.filter((flag) => flag === "--update");
const failed = [];
for (const file of scriptFiles) {
  if (scriptFiles.length > 1) process.stdout.write(`\n== ${relative(root, file)}\n`);
  const result = spawnSync(electron, [join(root, "build/dev/tophat.js"), file, ...passthrough], {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) failed.push(relative(root, file));
}
if (scriptFiles.length > 1) {
  process.stdout.write(
    failed.length
      ? `\ntophat: ${failed.length} of ${scriptFiles.length} scripts failed: ${failed.join(", ")}\n`
      : `\ntophat: all ${scriptFiles.length} scripts passed\n`,
  );
}
process.exit(failed.length ? 1 : 0);
