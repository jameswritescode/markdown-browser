import { afterEach, expect, test } from "vitest";
import { makeFiles, openPage, type Page, removeFile, sleep, writeFile } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

const titles = () =>
  page.eval<string[]>(
    "[...document.querySelectorAll('.finder:not([hidden]) .row-title')].map((t) => t.textContent)",
  );

test("a folder with no markdown files shows a message", async () => {
  makeFiles({ "build/page-files/empty-folder/": null });
  page = await openPage({ args: ["build/page-files/empty-folder"], width: 900, height: 240 });
  await expect
    .poll(() =>
      page.eval("document.querySelector('.finder .empty')?.textContent.replace(/ in .*/, ' in …')"),
    )
    .toBe("No markdown files in …");
  await page.shot("empty");
});

test("the finder shows files that are added or removed, also while the reader is open", async () => {
  makeFiles({
    "build/page-files/fresh/alpha.md": "# Alpha\n\nThe first document.\n",
    "build/page-files/fresh/beta.md": null,
    "build/page-files/fresh/gamma.md": null,
  });
  page = await openPage({ args: ["build/page-files/fresh"], width: 1000, height: 600 });
  await expect.poll(titles).toEqual(["Alpha"]);
  writeFile("build/page-files/fresh/beta.md", "# Beta\n");
  await expect.poll(titles).toEqual(["Alpha", "Beta"]);

  await page.type("alp");
  await page.key("Enter");
  await expect.poll(() => page.eval("document.title")).toBe("Alpha");
  writeFile("build/page-files/fresh/gamma.md", "# Gamma\n");
  await sleep(500);
  await page.key("Escape");
  await expect
    .poll(() => page.eval("!!document.querySelector('.finder:not([hidden])')"))
    .toBe(true);
  await page.key("Escape");
  await expect.poll(titles).toEqual(["Alpha", "Beta", "Gamma"]);

  removeFile("build/page-files/fresh/beta.md");
  await expect.poll(titles).toEqual(["Alpha", "Gamma"]);
  await page.shot("fresh");
});
