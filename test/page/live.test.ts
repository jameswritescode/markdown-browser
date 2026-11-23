import { afterEach, expect, test } from "vitest";
import { makeFiles, openPage, type Page, removeFile, writeFile } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("the reader shows changes to the file, and a message when the file is removed", async () => {
  makeFiles({
    "build/page-files/live/doc.md":
      "# Live\n\nFirst version.\n\n```mermaid\nflowchart LR\n  A --> \n```\n",
  });
  page = await openPage({ args: ["build/page-files/live/doc.md"], width: 900, height: 500 });
  await expect
    .poll(() => page.eval("document.querySelector('.diagram-error')?.textContent"))
    .toBe(
      "Diagram error: Parse error on line 2:\n  A -->\n-------^\nExpecting 'NODE_STRING', got 'EOF'",
    );
  await page.shot("1-first");

  writeFile("build/page-files/live/doc.md", "# Live\n\nSecond version.\n");
  await expect
    .poll(() => page.eval("document.querySelector('.markdown-body p')?.textContent"))
    .toBe("Second version.");
  await page.shot("2-reloaded");

  removeFile("build/page-files/live/doc.md");
  await expect
    .poll(() => page.eval("document.querySelector('.missing-title')?.textContent"))
    .toBe("This file no longer exists");
  await page.shot("3-deleted");
  await page.key("Escape");
  await expect
    .poll(() => page.eval("!!document.querySelector('.finder:not([hidden])')"))
    .toBe(true);
});
