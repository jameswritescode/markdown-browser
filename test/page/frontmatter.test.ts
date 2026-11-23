import { afterEach, expect, test } from "vitest";
import { makeFiles, openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("the finder uses the frontmatter title, and the reader shows the frontmatter", async () => {
  makeFiles({
    "build/page-files/fm/sample.md":
      "---\ntitle: Release notes for mdb 0.2\ndate: 2026-10-24\nauthor: James\ntags: [markdown, terminal, release]\ndraft: false\n---\n\n# Release notes\n\nmdb 0.2 adds frontmatter support. The block above comes from the YAML at the top of this file.\n\n## What changed\n\n- Frontmatter shows at the top of the page.\n- The file list uses the `title` value.\n",
    "build/page-files/fm/broken.md":
      "---\ntitle: [unclosed\n---\n\n# Broken frontmatter\n\nThe YAML above does not parse.\n",
  });
  page = await openPage({ args: ["build/page-files/fm"], width: 900, height: 520 });
  await expect
    .poll(() =>
      page.eval(
        `[...document.querySelectorAll('.row')].map((r) => r.querySelector('.row-main').textContent)`,
      ),
    )
    .toEqual(["Broken frontmatterbroken.md", "Release notes for mdb 0.2sample.md"]);
  await page.shot("finder");
  await page.type("sample");
  await page.key("Enter");
  await expect
    .poll(() => page.eval(`document.querySelectorAll('.frontmatter .fm-row').length`))
    .toEqual(5);
  expect(
    await page.eval(`[...document.querySelectorAll('.outline a')].map((a) => a.textContent)`),
  ).toEqual(["Release notes", "What changed"]);
  await page.shot("reader");
  await page.key("Escape");
  await expect
    .poll(() => page.eval("!!document.querySelector('.finder:not([hidden])')"))
    .toBe(true);
  await page.key("Escape");
  await page.type("broken");
  await page.key("Enter");
  await expect
    .poll(() => page.eval(`document.querySelector('.markdown-body h1')?.textContent`))
    .toBe("Broken frontmatter");
  await page.shot("broken");
});
