import { existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..", "..");

export async function setup() {
  if (!existsSync(join(root, "dist/page/index.html")))
    throw new Error("Run pnpm build first, or use pnpm test:page.");
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
