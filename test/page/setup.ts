import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..", "..");

export async function setup() {
  if (!existsSync(join(root, "dist/page/index.html")))
    throw new Error("Run pnpm build first, or use pnpm test:page.");
  // An Electron that a test stopped can exit after vitest, before it removes its user data.
  rmSync(join(root, "build/page-data"), { recursive: true, force: true });
  const shared = {
    bundle: true,
    platform: "node",
    format: "cjs",
    logLevel: "warning",
    target: "es2023",
  } as const;
  await build({
    ...shared,
    entryPoints: [join(root, "src/dev/page-harness.ts")],
    outfile: join(root, "build/dev/page-harness.js"),
    external: ["electron"],
  });
  await build({
    ...shared,
    entryPoints: [join(root, "src/dev/page-preload.ts")],
    outfile: join(root, "build/dev/page-preload.js"),
    external: ["electron"],
  });
}
