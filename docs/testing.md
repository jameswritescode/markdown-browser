# Testing mdb

This document tells you how to test a change to mdb. It is for people and for coding agents. mdb has four types of test:

| Test        | Command                     | What it tests                                                                |
| ----------- | --------------------------- | ---------------------------------------------------------------------------- |
| Unit tests  | `pnpm test`                 | The logic in `src/core`, the CLI logic, the watchers, and pure page modules. |
| Page tests  | `pnpm test:page`            | The real page and the real IPC, in an offscreen Electron window.             |
| Smoke test  | `pnpm smoke [file\|folder]` | The real app in a pseudo-terminal: it starts, draws, and writes no errors.   |
| Live checks | `node bin/mdb.js …`         | The parts that need a real terminal: panes, terminal keys, and the drawing.  |

Before you commit, run all of these commands. They must pass:

```sh
pnpm test:all
pnpm typecheck
pnpm lint
pnpm format:check
```

`pnpm test:all` runs the unit tests, and then the page tests.

## Unit tests

The unit tests use vitest. They are in `test/`, one file for each module. Fixture folders and files are in `test/fixtures/`.

Write a unit test when the code does not need the DOM or Electron. If page code has logic that you can test alone, put the logic in its own module without DOM calls. For example, `src/page/tab-route.ts` and `src/page/tab-labels.ts` are pure modules, and `test/tab-route.test.ts` and `test/tab-labels.test.ts` test them.

## Page tests

The page tests use vitest. They are in `test/page/`. Each test opens the real mdb page in an offscreen Electron window, with the real preload and the real IPC handlers. Thus scan, search, render, links, and file watching are real. The test pushes keys, clicks, and runs JavaScript in the page, and checks the results with `expect`.

The page tests do not use pixel to draw, and they do not use a terminal. Thus they do not test the terminal keys, the right-click menu, the control socket, or the drawing in the terminal. Use the smoke test and live checks for those.

### Run the page tests

To build mdb and run all the page tests:

```sh
pnpm test:page
```

If you already built mdb, you can run the tests without a build. You can also give a part of a file name, or `-t` and a part of a test name:

```sh
pnpm exec vitest run --config vitest.page.config.mts reader
pnpm exec vitest run --config vitest.page.config.mts -t outline
```

`pnpm test` does not run the page tests, because they need a build and they are slower. `pnpm test:all` runs the two types of test.

### How the page tests work

- `test/page/page.ts` gives `openPage`. `openPage` starts the Electron of pixel with `src/dev/page-harness.ts`, and gives a `Page` object.
- The harness opens the page with `src/dev/page-driver.ts`. The harness reads one command on each stdin line, and writes the result on stdout.
- `src/dev/page-preload.ts` adds a small `window.pixel` stand-in to the real preload. The stand-in gives the page a terminal theme.
- `test/page/setup.ts` bundles the harness and the preload before the tests start.
- Each test starts its own window. Thus a test does not get the state of a different test. Call `page.close()` after each test.

### The Page object

| Call                         | Result                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `page.key("b", ["control"])` | Pushes a key, with modifiers if you give them. Use Electron key names, for example `Escape`. |
| `page.type("plan")`          | Types the text, one character at a time.                                                     |
| `page.click(selector)`       | Clicks the center of the element. Fails if the selector finds no element.                    |
| `page.hover(selector)`       | Moves the mouse to the center of the element. Fails if the selector finds no element.        |
| `page.scroll(700)`           | Scrolls the reader (or the page) down by the number of pixels.                               |
| `page.eval(code)`            | Runs JavaScript in the page and gives the result. If the result is a promise, it waits.      |
| `page.shot("top")`           | Saves `top.png` and `top.txt` in `build/page/<test file>/`.                                  |
| `page.clipboard()`           | Gives the text that the page copied with `window.mdb.copy`, in order.                        |
| `page.log`                   | The console messages of the page, and `quit` when the page asked mdb to quit.                |

`openPage` takes `args` (the `mdb` arguments), and also `cwd`, `width`, `height`, `theme`, and `background`. `args` are relative to `cwd`. The default `cwd` is the repository root.

`test/page/page.ts` also gives `makeFiles`, `writeFile`, `removeFile`, and `sleep`. The paths are relative to the repository root.

### Write a good page test

- **Prove the test first.** Write the test with the values that you want. Run it before you change the code, and make sure that it fails for the correct reason. Then change the code, and run it again.
- **Wait for a result, not for a time.** Use `await expect.poll(() => page.eval(…)).toBe(…)`. `expect.poll` tries again until the result is correct or 5 seconds pass.
- **Use `sleep` only to show that something does not change.** A poll passes at once if the value is already correct. For example, to show that a file change in a background tab does not change the front tab, wait, then check. A file change needs more than 500 ms, because the watchers wait before they tell the page.
- **Do not poll code that changes the page.** `expect.poll` can run the code many times. Run code such as `T.open(…)` or `scrollTop = 400` once with `await page.eval(…)`, and then poll for the result.
- **Use fixture documents, not the real docs.** Open files in `test/fixtures/`, or make them in `build/page-files/` with `makeFiles` and `writeFile`. Give each test file its own folder, because vitest runs the test files at the same time. Only the showcase test uses `docs/showcase.md`, because it checks that document. Do not change `test/fixtures/pages/` to show a new feature: change `docs/showcase.md`.
- **Return many values at once.** For example, `[document.title, document.querySelectorAll('.tab').length]`. The diff then shows all of them.
- **Use `?.` in `eval`.** Then a missing element gives `undefined`, not an error.
- **Use `toMatchInlineSnapshot()` for large values.** Run vitest with `-u` to write the value into the test. Then read the `git diff`, and make sure that the value is correct. `-u` writes what the page does now, and that can be wrong.
- **Do not expect values that change from run to run**, for example relative times ("2d ago"), absolute paths, or images from the web. Return only the stable part.
- **Find the front tab.** The page can have many tabs. The front tab is `.tab-pane:not(.background)`. The visible reader is `.reader:not([hidden])`, and the visible finder is `.finder:not([hidden])`.
- **Send a document from "outside".** `window.mdbRemote.open({ path, root, heading, mode })` does the same thing as an `mdb` command that uses an open mdb. It returns `{ heading, result }`. Build absolute paths from `location.pathname`. For an example, read `test/page/remote.test.ts`.
- **Make page helpers once.** An `eval` can make an object on `window`, and later calls can use it. `test/page/tabs.test.ts` makes `window.T`.
- **Look at the screenshots** in `build/page/`. An `expect` value does not show if the page looks wrong.

### The test files

| File                   | What it tests                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- |
| `reader.test.ts`       | The outline, a diagram, links, the history keys, a narrow window, and navigation. |
| `find.test.ts`         | The reader scroll keys, and find in the document.                                 |
| `finder.test.ts`       | The file list, the filter, text search, the mouse, and keys without the focus.    |
| `finder-files.test.ts` | An empty folder, and files that are added or removed.                             |
| `search-open.test.ts`  | Enter on a search result opens the file at the match.                             |
| `frontmatter.test.ts`  | Frontmatter titles in the finder, and the frontmatter block in the reader.        |
| `live.test.ts`         | The reader shows file changes and a removed file.                                 |
| `reopen.test.ts`       | A document opened from the finder never shows the old document.                   |
| `remote.test.ts`       | A remote open with a heading, and a heading that does not match.                  |
| `tabs.test.ts`         | Tabs: open, switch, the state of each tab, file changes, close, and quit.         |
| `stdin.test.ts`        | Documents from stdin in tabs.                                                     |
| `copy-code.test.ts`    | The copy button of a code block.                                                  |
| `wide.test.ts`         | The layout in a wide window.                                                      |
| `showcase.test.ts`     | `docs/showcase.md`: diagrams, images, alerts, and code, with screenshots.         |

## Smoke test

```sh
pnpm smoke docs/showcase.md
```

The smoke test starts the real `mdb` in a pseudo-terminal for 6 seconds. It reports three things:

- `alive after 6s`: mdb did not stop.
- `kitty graphics sent`: mdb sent images to the terminal.
- `log errors`: the number of errors in the pixel log (`~/.local/state/pixel/logs/`).

All three must be good. The smoke test does not show the page. Use the page tests for that.

The smoke test removes the `REX_`, `HERDR_`, and `TERM_PROGRAM` variables. Thus, in Rex, mdb does not wait for a Rex pane size in the pseudo-terminal. In herdr, pixel sends the frames to the pseudo-terminal, not to the herdr pane.

## Live checks

Some parts work only in a real terminal: panes, the control socket, the terminal keys, and the right-click menu. Do these checks by hand in cmux, Ghostty, Rex, or herdr. Use the code in your copy, not the installed `mdb`:

```sh
node bin/mdb.js docs/showcase.md --split right --new
node bin/mdb.js docs/usage.md                # opened … in a tab in the mdb pane
node bin/mdb.js docs/showcase.md --heading tables   # switched to …
node bin/mdb.js README.md --replace          # showing … in the mdb pane
node bin/mdb.js docs                         # opened the file list of docs in a tab …
printf '# One\n' | node bin/mdb.js --title Check   # opened Check in a tab …
printf '# Two\n' | node bin/mdb.js --title Check   # updated Check in the mdb pane
node bin/mdb.js - </dev/null                 # mdb: stdin is empty
```

To check a pipe into mdb in the current pane, run `printf '# Hi\n' | node bin/mdb.js` in a shell pane, and make sure that the keys work. `cmux send-key` does not reach mdb. To quit mdb from a script, send the raw byte: `cmux send --surface <surface> $'\x03'`.

Run `pnpm build` before these commands. An mdb that is already open uses its old code. Quit it with `ctrl+q`, or open a new pane with `--new`.

In cmux, an agent can find and close the test pane:

```sh
cmux tree                              # find the surface of the mdb pane
cmux close-surface --surface surface:56
```

In Rex, an agent can find and close the test pane:

```sh
rex block ls -s "$REX_SESSION"        # find the block of the mdb pane (the new block)
rex block close -s "$REX_SESSION" block:…
```

In herdr, an agent can find and close the test pane:

```sh
herdr pane list                       # find the pane id of the mdb pane
herdr pane close <pane_id>
```

Do not close panes that you did not open.

The page tests cannot send keys through the terminal. Thus, check new keys in a real terminal too. mdb sees `ctrl+[`, `ctrl+h`, and `ctrl+l` only if the terminal uses the kitty keyboard protocol.
