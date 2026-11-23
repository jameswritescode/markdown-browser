import { afterEach, expect, test } from "vitest";
import { openPage, type Page, sleep } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("a code block has a copy button that copies the code and shows that it did", async () => {
  page = await openPage({ args: ["test/fixtures/pages/showcase.md"], height: 700 });
  await expect
    .poll(() =>
      page.eval(
        "[document.querySelectorAll('.markdown-body pre > code').length, document.querySelectorAll('.copy-code').length, document.querySelectorAll('.frontmatter-raw .copy-code').length]",
      ),
    )
    .toEqual([3, 3, 0]);
  await page.hover(".code-block");
  await sleep(200);
  await page.shot("1-hover");

  await page.click(".code-block .copy-code");
  const copied = () =>
    page.eval("document.querySelector('.code-block .copy-code')?.classList.contains('copied')");
  expect(await copied()).toBe(true);
  expect(await page.clipboard()).toEqual([
    await page.eval("document.querySelector('.code-block code')?.textContent"),
  ]);
  await page.shot("2-copied");
  await expect.poll(copied).toBe(false);
});
