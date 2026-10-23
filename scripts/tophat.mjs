import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scriptFile = process.argv[2];
if (!scriptFile) {
  process.stderr.write("usage: pnpm tophat <script.json>\n");
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
const result = spawnSync(electron, [join(root, "build/dev/tophat.js"), resolve(scriptFile)], {
  stdio: "inherit",
  env,
});
process.exit(result.status ?? 1);
