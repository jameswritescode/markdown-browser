import { afterEach, expect, test } from "vitest";
import { makeFiles, openPage, type Page, sleep, writeFile } from "./page.ts";

let page: Page;

/** A document that is long enough to scroll. */
const live = (version: string) =>
  `# Live\n\n${version}\n\n${Array.from({ length: 120 }, (_, i) => `Paragraph ${i} of the live document, long enough to scroll.\n\n`).join("")}`;
afterEach(() => page?.close());

test("tabs open, switch, keep their own state, show file changes, and close", async () => {
  makeFiles({
    "build/page-files/tabs-live.md": live("First version."),
    "build/page-files/tabs-long/a-very-long-design-document-name-one.md": "# One\n",
    "build/page-files/tabs-long/a-very-long-design-document-name-two.md": "# Two\n",
    "build/page-files/tabs-long/a-very-long-design-document-name-three.md": "# Three\n",
    "build/page-files/tabs-long/a-very-long-design-document-name-four.md": "# Four\n",
    "build/page-files/tabs-long/a-very-long-design-document-name-five.md": "# Five\n",
    "build/page-files/tabs-long/a-very-long-design-document-name-six.md": "# Six\n",
  });
  page = await openPage({ args: ["test/fixtures/pages/showcase.md"], height: 700 });
  await expect.poll(() => page.eval("document.title")).toBe("Markdown showcase");
  expect(
    await page.eval(
      "(window.T = { repo: location.pathname.replace(/dist\\/page\\/index.html$/, ''), at: (r) => T.repo + r, dir: (p) => p.slice(0, p.lastIndexOf('/')), open: (r, mode = 'tab', heading = null) => window.mdbRemote.open({ path: T.at(r), root: T.dir(T.at(r)), heading, mode }).then((x) => x.result), labels: () => [...document.querySelectorAll('.tab .tab-label')].map((t) => t.textContent), active: () => [...document.querySelectorAll('.tab')].findIndex((t) => t.classList.contains('active')), state: () => ({ labels: T.labels(), active: T.active(), title: document.title }) }) && [document.querySelector('.tabbar').hidden, document.querySelectorAll('.tab-pane').length]",
    ),
  ).toEqual([true, 1]);
  expect(await page.eval(`T.open('test/fixtures/pages/usage.md')`)).toEqual("tab");
  await expect
    .poll(() => page.eval(`[document.querySelector('.tabbar').hidden, T.state()]`))
    .toEqual([
      false,
      { labels: ["Markdown showcase", "mdb usage guide"], active: 1, title: "mdb usage guide" },
    ]);
  await page.shot("two-tabs");
  expect(await page.eval(`T.open('test/fixtures/pages/showcase.md', 'tab', 'tables')`)).toEqual(
    "switched",
  );
  await expect
    .poll(() =>
      page.eval(
        `[T.state(), Math.round(document.querySelector('.tab-pane:not(.background) #tables').getBoundingClientRect().top)]`,
      ),
    )
    .toEqual([
      { labels: ["Markdown showcase", "mdb usage guide"], active: 0, title: "Markdown showcase" },
      48,
    ]);
  await page.key("l", ["control"]);
  expect(await page.eval(`T.active()`)).toEqual(1);
  await page.key("h", ["control"]);
  await page.key("h", ["control"]);
  expect(await page.eval(`T.active()`)).toEqual(1);
  await page.key("/");
  await page.type("mdb");
  await page.key("Enter");
  await expect
    .poll(() => page.eval(`[T.active(), CSS.highlights.get('mdb-find')?.size ?? 0]`))
    .toEqual([1, 61]);
  await page.key("h", ["control"]);
  await expect
    .poll(() => page.eval(`[T.active(), CSS.highlights.get('mdb-find')?.size ?? 0]`))
    .toEqual([0, 0]);
  await page.key("l", ["control"]);
  await expect
    .poll(() => page.eval(`[T.active(), CSS.highlights.get('mdb-find')?.size ?? 0]`))
    .toEqual([1, 61]);
  await page.key("t", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `[T.state(), document.activeElement?.classList.contains('query'), document.querySelector('.tab-pane:not(.background) .reader:not([hidden]) .where')?.textContent ?? document.querySelector('.tab-pane:not(.background) .finder .hints')?.textContent]`,
      ),
    )
    .toEqual([
      {
        labels: ["Markdown showcase", "mdb usage guide", "Files · pages"],
        active: 2,
        title: "mdb",
      },
      true,
      "enter open · / search text · esc clear · ctrl+c quit · ctrl+t new tab · ctrl+w close",
    ]);
  await page.shot("finder-tab");
  await page.type("ab");
  await page.key("h", ["control"]);
  expect(
    await page.eval(
      `[T.active(), document.querySelectorAll('.tab-pane')[2].querySelector('.query').value]`,
    ),
  ).toEqual([1, "ab"]);
  await page.key("l", ["control"]);
  expect(await page.eval(`T.open('test/fixtures/pages/usage.md')`)).toEqual("switched");
  await expect
    .poll(() => page.eval(`T.state()`))
    .toEqual({
      labels: ["Markdown showcase", "mdb usage guide", "Files · pages"],
      active: 1,
      title: "mdb usage guide",
    });
  await page.key("t", ["control"]);
  await sleep(800);
  expect(await page.eval(`T.open('test/fixtures/docs/README.md')`)).toEqual("tab");
  await expect
    .poll(() => page.eval(`T.state()`))
    .toEqual({
      labels: ["Markdown showcase", "mdb usage guide", "Files · pages", "Fixture Docs"],
      active: 3,
      title: "Fixture Docs",
    });
  expect(await page.eval(`T.open('test/fixtures/pages/showcase.md', 'replace')`)).toEqual(
    "switched",
  );
  await expect
    .poll(() => page.eval(`T.state()`))
    .toEqual({
      labels: ["Markdown showcase", "mdb usage guide", "Files · pages", "Fixture Docs"],
      active: 0,
      title: "Markdown showcase",
    });
  expect(
    await page.eval(
      `document.querySelector('.tab-pane:not(.background) .where').textContent + ' | ' + document.querySelector('.tab-pane:not(.background) .reader .hints').textContent`,
    ),
  ).toEqual(
    "showcase.md · 1 of 4 · 65% | / find · esc files · ctrl+b outline · ctrl+[ back · ctrl+t new tab · ctrl+w close",
  );
  expect(await page.eval(`T.open('build/page-files/tabs-live.md')`)).toEqual("tab");
  await expect.poll(() => page.eval("document.title")).toBe("Live");
  await page.eval(
    `document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop = 400`,
  );
  await expect
    .poll(() =>
      page.eval(`document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop`),
    )
    .toEqual(400);
  await page.key("h", ["control"]);
  writeFile("build/page-files/tabs-live.md", live("Second version."));
  await expect
    .poll(() =>
      page.eval(
        `[...document.querySelectorAll('.tab')].map((t) => t.classList.contains('changed'))`,
      ),
    )
    .toEqual([false, false, false, false, true]);
  await page.key("l", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `[...document.querySelectorAll('.tab')].map((t) => t.classList.contains('changed')).concat([document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop, document.querySelector('.tab-pane:not(.background) .markdown-body p').textContent])`,
      ),
    )
    .toEqual([false, false, false, false, false, 400, "Second version."]);
  await page.key("/");
  await page.type("Paragraph");
  await page.key("Enter");
  await expect.poll(() => page.eval("CSS.highlights.get('mdb-find')?.size ?? 0")).toBe(119);
  await page.eval(
    `document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop = 2000`,
  );
  await expect
    .poll(() =>
      page.eval(
        `[document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop, CSS.highlights.get('mdb-find')?.size ?? 0]`,
      ),
    )
    .toEqual([2000, 119]);
  await page.key("h", ["control"]);
  writeFile("build/page-files/tabs-live.md", live("Third version."));
  await sleep(1300);
  await page.key("l", ["control"]);
  await expect
    .poll(() =>
      page.eval(
        `[document.querySelector('.tab-pane:not(.background) .reader-scroll').scrollTop, document.querySelector('.tab-pane:not(.background) .markdown-body p').textContent]`,
      ),
    )
    .toEqual([2000, "Third version."]);
  await page.click(".tab:nth-child(1)");
  expect(await page.eval(`T.active()`)).toEqual(0);
  await page.click(".tab-new");
  await expect
    .poll(() => page.eval(`T.state()`))
    .toEqual({
      labels: [
        "Markdown showcase",
        "mdb usage guide",
        "Files · pages",
        "Fixture Docs",
        "Live",
        "Files · pages",
      ],
      active: 5,
      title: "mdb",
    });
  await page.click(".tab.active .tab-close");
  expect(await page.eval(`[T.state(), document.querySelectorAll('.tab-pane').length]`)).toEqual([
    {
      labels: ["Markdown showcase", "mdb usage guide", "Files · pages", "Fixture Docs", "Live"],
      active: 4,
      title: "Live",
    },
    5,
  ]);
  for (const name of ["one", "two", "three", "four", "five", "six"])
    expect(
      await page.eval(
        `T.open('build/page-files/tabs-long/a-very-long-design-document-name-${name}.md')`,
      ),
    ).toBe("tab");
  await expect
    .poll(() =>
      page.eval(
        `(() => { const bar = document.querySelector('.tabbar').getBoundingClientRect(); const a = document.querySelector('.tab.active').getBoundingClientRect(); return [document.querySelectorAll('.tab').length, Math.round(a.left) >= Math.round(bar.left), Math.round(a.right) <= Math.round(bar.right), Math.round(document.querySelector('.tab').getBoundingClientRect().width)] })()`,
      ),
    )
    .toEqual([11, true, true, 106]);
  await page.shot("long-labels");
  await page.key("w", ["control"]);
  expect(await page.eval(`[T.state(), document.querySelectorAll('.tab-pane').length]`)).toEqual([
    {
      labels: [
        "Markdown showcase",
        "mdb usage guide",
        "Files · pages",
        "Fixture Docs",
        "Live",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
      ],
      active: 9,
      title: "Five",
    },
    10,
  ]);
  for (let i = 0; i < 9; i++) await page.key("w", ["control"]);
  expect(
    await page.eval(
      `[document.querySelector('.tabbar').hidden, document.querySelectorAll('.tab-pane').length]`,
    ),
  ).toEqual([true, 1]);
  await page.key("w", ["control"]);
  await expect.poll(() => page.log).toContain("quit");
});
