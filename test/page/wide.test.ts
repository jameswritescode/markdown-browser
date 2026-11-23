import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("in a wide window, the finder and the reader stay in the center", async () => {
  page = await openPage({ args: ["test/fixtures/pages"], width: 1600, height: 700 });
  await expect
    .poll(() =>
      page.eval(
        `(() => { const p = document.querySelector('.prompt').getBoundingClientRect(); const r = document.querySelector('.row').getBoundingClientRect(); return { prompt: [Math.round(p.left), Math.round(innerWidth - p.right)], row: [Math.round(r.left), Math.round(innerWidth - r.right)] } })()`,
      ),
    )
    .toEqual({ prompt: [360, 360], row: [360, 360] });
  await page.shot("finder");
  await page.type("showcase");
  await page.key("Enter");
  await expect
    .poll(() =>
      page.eval(
        `(() => { const r = document.querySelector('.markdown-body').getBoundingClientRect(); return [Math.round(r.left), Math.round(innerWidth - r.right)] })()`,
      ),
    )
    .toEqual([356, 364]);
  await page.shot("centered");
  await page.key("b", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `(() => { const o = document.querySelector('.outline').getBoundingClientRect(); const r = document.querySelector('.markdown-body').getBoundingClientRect(); return [Math.round(o.left), Math.round(innerWidth - r.right)] })()`,
      ),
    )
    .toEqual([230, 230]);
  await page.shot("outline");
});
