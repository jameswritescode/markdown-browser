import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("the showcase document draws its diagrams, images, alerts, and code", async () => {
  page = await openPage({ args: ["docs/showcase.md"], width: 1100, height: 900 });
  await expect
    .poll(() =>
      page.eval(
        `[...document.querySelectorAll('.diagram')].map((d) => (d.classList.contains('failed') ? 'FAILED: ' + d.previousElementSibling?.textContent + ' / ' + d.querySelector('.diagram-error')?.textContent.slice(0, 80) : d.querySelector('svg') ? 'ok' : 'waiting'))`,
      ),
    )
    .toEqual([
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "FAILED: mdb shows the diagram text and the error message: / Diagram error: Parse error on line 2:\n  A -->\n-------^\nExpecting 'NODE_STRING', ",
    ]);
  expect(
    await page.eval(
      `[...document.querySelectorAll('.markdown-body img')].filter((i) => !/^https?:/.test(i.getAttribute('src'))).map((i) => [i.getAttribute('src').split('/').pop(), i.complete && i.naturalWidth > 0])`,
    ),
  ).toEqual([
    ["sample.svg", true],
    ["missing.png", false],
  ]);
  expect(
    await page.eval(`document.querySelectorAll('.markdown-alert, [class*=alert]').length`),
  ).toEqual(10);
  expect(await page.eval(`!!document.querySelector('script')?.closest('.markdown-body')`)).toEqual(
    false,
  );
  expect(
    await page.eval(`document.querySelectorAll('pre code.hljs, pre code [class^=hljs-]').length`),
  ).toEqual(63);
  for (let shot = 1; shot <= 14; shot++) {
    if (shot > 1) await page.scroll(850);
    await page.shot(String(shot).padStart(2, "0"));
  }
});
