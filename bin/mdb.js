#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const USAGE = `usage: mdb [file.md | folder] [--solid]

  mdb              browse the markdown files in this folder
  mdb <folder>     browse the markdown files in <folder>
  mdb <file.md>    open <file.md>
  --solid          paint the terminal's background colour instead of a transparent page
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const { parseArgs } = require("../dist/core/args.js");
const options = parseArgs(args, process.cwd(), process.env);
if ("error" in options) {
  process.stderr.write(`${options.error}\n`);
  process.exit(1);
}

const pixelDir = path.dirname(path.dirname(require.resolve("@zenbu-labs/pixel")));
const pixelBin = path.join(
  pixelDir,
  JSON.parse(readFileSync(path.join(pixelDir, "package.json"), "utf8")).bin.pixel,
);
const appDir = path.join(__dirname, "..");

const child = spawn(process.execPath, [pixelBin, appDir, "--", JSON.stringify(options)], {
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 128 : 0)));
