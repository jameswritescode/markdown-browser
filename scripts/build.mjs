import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });

const shared = { bundle: true, logLevel: "warning", legalComments: "none", target: "es2023" };

await Promise.all([
  build({
    ...shared,
    entryPoints: [join(root, "src/main/main.tsx")],
    outfile: join(dist, "main/main.js"),
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    external: ["electron", "@zenbu-labs/pixel", "@zenbu-labs/pixel/*", "react", "react/*"],
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/main/preload.ts")],
    outfile: join(dist, "main/preload.js"),
    platform: "node",
    format: "cjs",
    external: ["electron"],
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/core/args.ts")],
    outfile: join(dist, "core/args.js"),
    platform: "node",
    format: "cjs",
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/page/app.ts")],
    outfile: join(dist, "page/app.js"),
    platform: "browser",
    format: "iife",
  }),
]);

mkdirSync(join(dist, "page"), { recursive: true });
for (const file of ["index.html", "style.css"]) {
  cpSync(join(root, "src/page", file), join(dist, "page", file));
}
