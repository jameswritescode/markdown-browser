import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("a remote open goes to the heading, and says when no heading matches", async () => {
  page = await openPage({
    args: ["test/fixtures/pages/showcase.md", "--heading", "tables"],
    width: 1000,
    height: 600,
  });
  await expect
    .poll(() =>
      page.eval(
        `[document.querySelector('.reader-scroll').scrollTop > 0, Math.round(document.getElementById('tables').getBoundingClientRect().top)]`,
      ),
    )
    .toEqual([true, 16]);
  await page.shot("start-heading");
  expect(
    await page.eval(
      "(() => { const path = location.pathname.replace(/dist\\/page\\/index.html$/, 'test/fixtures/pages/usage.md'); return window.mdbRemote.open({ path, root: path.slice(0, path.lastIndexOf('/')), heading: 'Outline', mode: 'replace' }) })()",
    ),
  ).toEqual({ heading: true, result: "replaced" });
  await expect
    .poll(() =>
      page.eval(
        `[document.title, Math.round(document.getElementById('outline').getBoundingClientRect().top)]`,
      ),
    )
    .toEqual(["mdb usage guide", 16]);
  expect(
    await page.eval(
      "(() => { const path = location.pathname.replace(/dist\\/page\\/index.html$/, 'test/fixtures/pages/showcase.md'); return window.mdbRemote.open({ path, root: path.slice(0, path.lastIndexOf('/')), heading: 'Nothing like this', mode: 'replace' }) })()",
    ),
  ).toEqual({ heading: false, result: "replaced" });
  await expect
    .poll(() =>
      page.eval(
        `[document.querySelector('.reader-scroll').scrollTop, document.querySelector('.where').textContent]`,
      ),
    )
    .toEqual([0, 'showcase.md · 0% · no heading matches "Nothing like this"']);
  await page.shot("missing-heading");
  await page.key("[", ["control"]);
  await expect.poll(() => page.eval(`document.title`)).toEqual("mdb usage guide");
});
