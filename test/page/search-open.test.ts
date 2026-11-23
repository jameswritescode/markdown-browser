import { afterEach, expect, test } from "vitest";
import { openPage, type Page, sleep } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("enter on a search result opens the file at the match", async () => {
  page = await openPage({ args: ["test/fixtures/docs"], width: 1000, height: 500 });
  await expect.poll(() => page.eval(`document.querySelectorAll('.row').length`)).toBeGreaterThan(2);
  await page.key("/");
  await page.type("kitty");
  await sleep(400);
  await page.key("Return");
  await expect
    .poll(() =>
      page.eval(
        `[document.title, document.querySelector('.where')?.textContent, CSS.highlights.get('mdb-find-current')?.size]`,
      ),
    )
    .toEqual(["Setup Guide", "/kitty · 1 of 1", 1]);
  await page.shot("opened");
});
