import { afterEach, expect, test } from "vitest";
import { openPage, type Page, sleep } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

const open = async () => {
  page = await openPage({ args: ["test/fixtures/docs"], width: 1000, height: 420 });
  await expect.poll(() => page.eval("document.querySelectorAll('.row').length")).toBeGreaterThan(2);
};
const selected = () =>
  page.eval<number>(
    "[...document.querySelectorAll('.row')].findIndex((r) => r.classList.contains('selected'))",
  );
const query = () => page.eval<string>("document.querySelector('.query')?.value");

test("the finder filters by name, searches the text, and opens the selected file", async () => {
  await open();
  await page.shot("1-list");
  await page.type("gst");
  await page.shot("2-filter-gst");
  await page.key("Escape");
  await page.key("/");
  await page.type("kitty");
  await sleep(400);
  await page.shot("3-search-kitty");
  await page.key("Escape");
  await page.key("Escape");
  await page.shot("4-back-to-list");

  await page.key("j", ["control"]);
  await page.key("j", ["control"]);
  expect(await selected()).toBe(2);
  await page.key("k", ["control"]);
  expect(await selected()).toBe(1);
  expect(await query()).toBe("");
  await page.key("Down");
  await page.key("Return");
  await expect.poll(() => page.eval("document.title")).toBe("Setup Guide");
});

test("the mouse selects the row under it, also after a key moves the selection", async () => {
  await open();
  await page.hover(".row:nth-child(2)");
  expect(await selected()).toBe(1);
  await page.key("Down");
  await sleep(300);
  await page.hover(".row:nth-child(2)");
  expect(await selected()).toBe(2);
  await page.key("Up");
  await page.key("Up");
  await expect.poll(selected).toBe(0);
  await page.hover(".row:nth-child(3)");
  expect(await selected()).toBe(2);
});

test("the finder keys work when the query field does not have the focus", async () => {
  await open();
  await page.click(".status");
  expect(await page.eval("document.activeElement?.className")).toBe("");
  await page.key("Down");
  await page.key("j", ["control"]);
  expect(await selected()).toBe(2);
  await page.key("k", ["control"]);
  expect(await selected()).toBe(1);
  await page.click(".status");
  await page.type("gst");
  expect(await query()).toBe("gst");
  await page.key("Escape");
  await page.click(".status");
  await page.key("Return");
  await expect.poll(() => page.eval("document.title")).toBe("Fixture Docs");

  await page.key("Escape");
  await expect
    .poll(() => page.eval("!!document.querySelector('.finder:not([hidden])')"))
    .toBe(true);
  await page.click(".status");
  await page.key("Down");
  expect(await selected()).toBe(1);
  await page.type("gst");
  await page.key("Return");
  await sleep(400);
  await page.key("Escape");
  await expect
    .poll(() =>
      page.eval(
        "[document.querySelector('.query')?.value, document.querySelectorAll('.row').length]",
      ),
    )
    .toEqual(["gst", 1]);
});

test("the finder fills a window of the default size", async () => {
  page = await openPage({ args: ["test/fixtures/docs"] });
  await expect.poll(() => page.eval("document.querySelectorAll('.row').length")).toBeGreaterThan(2);
  await page.shot("default-size");
});
