import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

test("the reader keys scroll, and / finds text in the document", async () => {
  page = await openPage({ args: ["test/fixtures/docs/README.md"], width: 1100, height: 600 });
  await expect
    .poll(() => page.eval(`document.querySelector('.reader .status')?.textContent`))
    .toEqual("README.md · 0%// find · esc files · ctrl+b outline · ctrl+[ back");
  await page.shot("1-bar");
  await page.key("j");
  await page.key("j");
  expect(await page.eval(`document.querySelector('.reader-scroll').scrollTop`)).toEqual(120);
  expect(await page.eval(`document.querySelector('.where')?.textContent`)).toEqual(
    "README.md · 13%",
  );
  await page.key("k");
  expect(await page.eval(`document.querySelector('.reader-scroll').scrollTop`)).toEqual(60);
  await page.key("j", ["control"]);
  expect(await page.eval(`document.querySelector('.reader-scroll').scrollTop`)).toEqual(60);
  await page.key("d");
  expect(
    await page.eval(
      `[document.querySelector('.reader-scroll').scrollTop, document.querySelector('.reader-scroll').clientHeight]`,
    ),
  ).toEqual([342, 563]);
  await page.key("u");
  expect(
    await page.eval(
      `[document.querySelector('.reader-scroll').scrollTop, document.querySelector('.reader-scroll').clientHeight]`,
    ),
  ).toEqual([61, 563]);
  await page.key("/");
  await page.type("the");
  await expect
    .poll(() =>
      page.eval(
        `[document.querySelector('.find-count')?.textContent, document.querySelector('.hints')?.textContent]`,
      ),
    )
    .toEqual(["1 of 3", "enter done · esc cancel"]);
  await page.shot("2-typing");
  await page.key("j");
  expect(await page.eval(`document.querySelector('.find-query').value`)).toEqual("thej");
  await page.key("Backspace");
  await page.key("Return");
  expect(
    await page.eval(
      `[document.activeElement?.className, document.querySelector('.where')?.textContent]`,
    ),
  ).toEqual(["", "/the · 1 of 3"]);
  await page.key("n");
  await page.key("n");
  expect(await page.eval(`document.querySelector('.where')?.textContent`)).toEqual("/the · 3 of 3");
  await page.key("N", ["shift"]);
  expect(await page.eval(`document.querySelector('.where')?.textContent`)).toEqual("/the · 2 of 3");
  await page.shot("3-matches");
  await page.key("Escape");
  expect(
    await page.eval(
      `[CSS.highlights.get('mdb-find')?.size ?? 0, document.querySelector('.where')?.textContent, !!document.querySelector('.reader:not([hidden])')]`,
    ),
  ).toEqual([0, "README.md · 0%", true]);
  await page.key("/");
  await page.type("zzzz");
  expect(await page.eval(`document.querySelector('.find-count')?.textContent`)).toEqual(
    "no matches",
  );
  await page.key("Escape");
  expect(
    await page.eval(
      `[document.querySelector('.find').hidden, !!document.querySelector('.reader:not([hidden])')]`,
    ),
  ).toEqual([true, true]);
  await page.key("Escape");
  await expect
    .poll(() => page.eval(`!!document.querySelector('.finder:not([hidden])')`))
    .toEqual(true);
});
