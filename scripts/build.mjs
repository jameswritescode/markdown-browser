import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });

const shared = {
  bundle: true,
  logLevel: "warning",
  legalComments: "none",
  metafile: true,
  target: "es2023",
};

const results = await Promise.all([
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
    entryPoints: [join(root, "src/cli/main.ts")],
    outfile: join(dist, "cli/main.js"),
    platform: "node",
    format: "cjs",
    external: ["@zenbu-labs/pixel", "@zenbu-labs/pixel/*"],
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

// The bundles hold code from these packages, so the package ships their license texts.
const packages = new Set();
for (const { metafile } of results) {
  for (const input of Object.keys(metafile.inputs)) {
    const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input);
    if (match) packages.add(join(root, match[1]));
  }
}
const notices = [...packages]
  .map((dir) => {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const file = readdirSync(dir).find((name) => /^((un)?licen[cs]e|copying)([.-]|$)/i.test(name));
    const text = file ? readFileSync(join(dir, file), "utf8").trim() : `License: ${pkg.license}`;
    return { name: `${pkg.name}@${pkg.version}`, text };
  })
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(({ name, text }) => `${name}\n${"-".repeat(name.length)}\n\n${text}\n`);
writeFileSync(
  join(dist, "THIRD_PARTY_LICENSES.txt"),
  `mdb includes code from these packages.\n\n${notices.join("\n")}`,
);
