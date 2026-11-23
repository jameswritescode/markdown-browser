import { afterEach, expect, test } from "vitest";
import { openPage, type Page } from "./page.ts";

let page: Page;

/** A summary that is long enough to scroll, with a link at the end. */
const summary = (step: string) =>
  `# Draft\n\n${step}\n\n${Array.from({ length: 80 }, (_, i) => `Paragraph ${i} of the summary, long enough to scroll.\n\n`).join("")}[usage](usage.md)\n`;
afterEach(() => page?.close());

test("stdin documents open in tabs, update in place, and go away when their tabs close", async () => {
  page = await openPage({ args: ["test/fixtures/pages/showcase.md"], height: 700 });
  await expect.poll(() => page.eval("document.title")).toBe("Markdown showcase");
  expect(
    await page.eval(
      "(window.T = { repo: location.pathname.replace(/dist\\/page\\/index.html$/, ''), put: (title, text, heading = null) => window.mdbRemote.open({ path: 'stdin:title:' + title, root: T.repo + 'test/fixtures/pages', heading, mode: 'tab', content: { key: 'stdin:title:' + title, text, title } }).then((x) => x.result), folder: (r) => window.mdbRemote.open({ path: null, root: T.repo + r, heading: null, mode: 'tab' }).then((x) => x.result), labels: () => [...document.querySelectorAll('.tab .tab-label')].map((t) => t.textContent), active: () => [...document.querySelectorAll('.tab')].findIndex((t) => t.classList.contains('active')), dots: () => [...document.querySelectorAll('.tab')].map((t) => t.classList.contains('changed')) }) && true",
    ),
  ).toEqual(true);
  expect(await page.eval(`T.put('Work summary', ${JSON.stringify(summary("Step one."))})`)).toEqual(
    "tab",
  );
  await expect
    .poll(() =>
      page.eval(
        `[T.labels(), T.active(), document.querySelector('.tab-pane:not(.background) .where').textContent.startsWith('Work summary · 2 of 2')]`,
      ),
    )
    .toEqual([["Markdown showcase", "Work summary"], 1, true]);
  expect(await page.eval(`document.querySelectorAll('.tab')[1].title`)).toEqual("Work summary");
  await page.shot("summary");
  expect(
    await page.eval(
      `document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop = 600`,
    ),
  ).toEqual(600);
  await page.key("h", ["control"]);
  expect(await page.eval(`T.put('Work summary', ${JSON.stringify(summary("Step two."))})`)).toEqual(
    "updated",
  );
  await expect.poll(() => page.eval(`[T.active(), T.dots()]`)).toEqual([0, [false, true]]);
  await page.key("l", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `[Math.abs(document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop - 600) <= 2, document.querySelector('.tab-pane:not(.background) .markdown-body p').textContent, T.dots()]`,
      ),
    )
    .toEqual([true, "Step two.", [false, false]]);
  expect(
    await page.eval(
      `Promise.all([T.put('Twice', '# Once'), T.put('Twice', '# Again')]).then((r) => [r, T.labels()])`,
    ),
  ).toEqual([
    ["tab", "updated"],
    ["Markdown showcase", "Work summary", "Twice"],
  ]);
  expect(
    await page.eval(
      "T.put('Twice', '# Again\\n\\nA third time.').then((r) => (document.querySelectorAll('.tab')[1].click(), r))",
    ),
  ).toEqual("updated");
  await expect.poll(() => page.eval(`T.dots()`)).toEqual([false, false, false]);
  expect(
    await page.eval(
      `document.querySelector('.tab-pane:not(.background) .reader-scroll').querySelector('a[href="usage.md"]').click() ?? true`,
    ),
  ).toEqual(true);
  await expect
    .poll(() => page.eval(`[T.labels()[1], document.title]`))
    .toEqual(["mdb usage guide", "mdb usage guide"]);
  expect(await page.eval(`T.folder('test/fixtures/docs')`)).toEqual("tab");
  await expect.poll(() => page.eval(`[T.labels()[3], T.active()]`)).toEqual(["Files · docs", 3]);
  expect(await page.eval(`T.folder('test/fixtures/docs')`)).toEqual("switched");
  await page.shot("folder");
  expect(await page.eval("T.put('Work summary', '# Draft\\n\\nStep three.')")).toEqual("updated");
  expect(await page.eval(`T.dots()`)).toEqual([false, true, false, false]);
  expect(
    await page.eval(
      "window.mdbRemote.open({ path: 'stdin:title:Work summary', root: T.repo + 'test/fixtures/pages', heading: 'Next steps', mode: 'tab', content: { key: 'stdin:title:Work summary', text: '# Draft\\n\\nStep four.\\n\\n## Next steps\\n\\nMore.', title: 'Work summary' } }).then((x) => [x.result, x.heading])",
    ),
  ).toEqual(["updated", true]);
  await expect
    .poll(() =>
      page.eval(
        `[T.active(), document.querySelector('.tab-pane:not(.background) .where').textContent.startsWith('Work summary'), document.querySelector('.tab-pane:not(.background) .markdown-body p').textContent]`,
      ),
    )
    .toEqual([1, true, "Step four."]);
  await page.key("w", ["control"]);
  expect(await page.eval(`(document.querySelectorAll('.tab')[2].click(), true)`)).toEqual(true);
  await page.key("w", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `Promise.all([window.mdb.render('stdin:title:Work summary'), window.mdb.render('stdin:title:Twice')]).then((r) => [T.labels(), r.map((d) => 'missing' in d)])`,
      ),
    )
    .toEqual([
      ["Markdown showcase", "Twice"],
      [true, false],
    ]);
});
