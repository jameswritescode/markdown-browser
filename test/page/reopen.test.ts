import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("a document opened from the finder shows only the new document, never the old one", async () => {
  page = await openPage({ args: ["test/fixtures/docs/README.md"], width: 1000, height: 500 });
  await expect.poll(() => page.eval(`document.title`)).toBe("Fixture Docs");
  await page.key("Escape");
  expect(
    await page.eval(
      `window.seen = new Set(); const watch = () => { const reader = document.querySelector('.reader'); if (reader.checkVisibility({ visibilityProperty: true })) window.seen.add(reader.querySelector('h1')?.textContent ?? ''); requestAnimationFrame(watch); }; watch(); 'watching'`,
    ),
  ).toBe("watching");
  await page.type("setup");
  await page.key("Enter");
  await expect.poll(() => page.eval(`[...window.seen]`)).toEqual(["Setup Guide"]);
  await page.shot("1-second-doc");
});
