import { afterEach, expect, test } from "vitest";
import { openPage, type Page, sleep } from "./page.ts";

let page: Page;
afterEach(() => page?.close());

const open = () => openPage({ args: ["test/fixtures/docs/README.md"], height: 900 });
const title = () => page.eval<string>("document.title");
const activeHeading = () =>
  page.eval<string | undefined>("document.querySelector('.outline a.active')?.textContent");
const outlineShown = () =>
  page.eval<boolean>(
    "document.querySelector('.reader-content')?.classList.contains('with-outline') ?? null",
  );

test("ctrl-b shows and hides the outline, and the outline follows the scroll", async () => {
  page = await open();
  await expect.poll(title).toBe("Fixture Docs");
  expect(await outlineShown()).toBe(false);

  await page.key("b", ["control"]);
  await expect.poll(outlineShown).toBe(true);
  await page.shot("1-top");
  expect(await activeHeading()).toBe("Fixture Docs");

  await page.scroll(700);
  await expect.poll(activeHeading).toBe("Notes");
  await page.shot("2-middle");

  await page.key("b", ["control"]);
  await expect.poll(outlineShown).toBe(false);
  await page.shot("3-outline-hidden");
});

test("a mermaid block becomes a diagram", async () => {
  page = await open();
  await expect
    .poll(() =>
      page.eval(
        "document.querySelector('.diagram svg') ? 'svg' : document.querySelector('.diagram')?.textContent",
      ),
    )
    .toBe("svg");
});

test("a link opens the document, and the history keys go back and forward", async () => {
  page = await open();
  await expect.poll(title).toBe("Fixture Docs");

  await page.click("a[href='guide/setup.md']");
  await expect.poll(title).toBe("Setup Guide");
  await page.shot("4-linked-doc");

  await page.key("[", ["meta"]);
  await expect.poll(title).toBe("Fixture Docs");
  await page.key("]", ["control"]);
  await expect.poll(title).toBe("Setup Guide");
  await page.key("[", ["control"]);
  await expect.poll(title).toBe("Fixture Docs");
});

test("a link to a missing file shows a notice", async () => {
  page = await open();
  await expect.poll(title).toBe("Fixture Docs");
  await page.click("a[href='missing.md']");
  await expect
    .poll(() => page.eval("document.querySelector('.link-notice')?.textContent"))
    .toBe("Not found: missing.md");
});

test("escape in the reader opens the finder", async () => {
  page = await open();
  await expect.poll(title).toBe("Fixture Docs");
  await page.key("Escape");
  await expect
    .poll(() => page.eval("document.querySelector('.finder')?.hidden === false"))
    .toBe(true);
  await page.shot("5-finder-after-esc");
});

test("a narrow window hides the outline until ctrl-b shows it", async () => {
  page = await openPage({ args: ["test/fixtures/docs/README.md"], width: 600, height: 600 });
  await expect.poll(title).toBe("Fixture Docs");
  expect(await outlineShown()).toBe(false);
  await page.shot("narrow");
  await page.key("b", ["control"]);
  expect(await outlineShown()).toBe(true);
});

test("the page cannot navigate away from mdb", async () => {
  page = await openPage({ args: ["test/fixtures/docs/README.md"], width: 800, height: 400 });
  await expect.poll(title).toBe("Fixture Docs");
  await page.eval("location.href = 'file:///etc/hosts'");
  await sleep(500);
  expect(
    await page.eval("[location.pathname.endsWith('/dist/page/index.html'), typeof window.mdb]"),
  ).toEqual([true, "object"]);
});
