#!/usr/bin/env node
"use strict";

require("../dist/cli/main.js")
  .main(process.argv.slice(2))
  .then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`mdb: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    },
  );
