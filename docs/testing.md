# Testing mdb

This document tells you how to test a change to mdb. It is for people and for coding agents. mdb has four types of test:

| Test        | Command                     | What it tests                                                                |
| ----------- | --------------------------- | ---------------------------------------------------------------------------- |
| Unit tests  | `pnpm test`                 | The logic in `src/core`, the CLI logic, the watchers, and pure page modules. |
| tophat      | `pnpm tophat:all`           | The real page and the real IPC, in an offscreen Electron window.             |
| Smoke test  | `pnpm smoke [file\|folder]` | The real app in a pseudo-terminal: it starts, draws, and writes no errors.   |
| Live checks | `node bin/mdb.js …`         | The parts that need a real terminal: panes, terminal keys, and the drawing.  |

Before you commit, run all of these commands. They must pass:

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm tophat:all
```

## Unit tests

The unit tests use vitest. They are in `test/`, one file for each module. Fixture folders and files are in `test/fixtures/`.

Write a unit test when the code does not need the DOM or Electron. If page code has logic that you can test alone, put the logic in its own module without DOM calls. For example, `src/page/tab-route.ts` and `src/page/tab-labels.ts` are pure modules, and `test/tab-route.test.ts` and `test/tab-labels.test.ts` test them.

## tophat

tophat runs the mdb page in an offscreen Electron window, and does the steps in a JSON script. A step can push a key, type text, click, write a file, run JavaScript in the page, or save a screenshot. Use tophat to see a change in the page, and to prove that the page does the correct thing.

An `eval` step can have an `expect` value. tophat compares the result with the value. If they are not the same, tophat writes a `FAIL` line, and the script fails. A `click` or `hover` that finds no element also fails, and so does an `eval` that throws an error. tophat cannot check how a screenshot looks. Look at the screenshots yourself.

### How tophat works

`src/dev/tophat.ts` is the tophat program. `scripts/tophat.mjs` bundles it and starts it with the Electron of pixel.

- tophat uses the real page (`dist/page/`) and the real IPC handlers from `src/main/ipc.ts`. Thus scan, search, render, links, and file watching are real.
- tophat uses the real preload, plus a small `window.pixel` stand-in (`src/dev/tophat-preload.ts`). The stand-in gives the page a terminal theme.
- tophat does not use pixel to draw. The window is offscreen, and the screenshots come from Electron. tophat does not test the terminal, the terminal keys, the right-click menu, or the control socket.
- When the page calls `window.mdb.copy`, tophat records the text. The log ends with `clipboard: […]`.
- When the page calls `window.mdb.quit`, tophat writes `quit` in the log.

### Run the scripts

To run all the scripts:

```sh
pnpm tophat:all
```

The last line tells you if all scripts passed, or which scripts failed. If a script fails, the command exits with code 1.

To run one or more scripts:

```sh
pnpm tophat tophat/reader.json tophat/tabs.json
```

`pnpm tophat` and `pnpm tophat:all` build mdb first. If you already built mdb, you can run the scripts without a build:

```sh
node scripts/tophat.mjs tophat/reader.json
node scripts/tophat.mjs --all
```

tophat writes each step result to stdout and to `log.txt` in the output folder. Screenshots go to the same folder. Each script ends with a line such as `tophat: 12 checks, 0 failed`.

Electron writes some lines that are not tophat output, for example `sandbox_extension … failed` and `GPU process exited`. Ignore these lines. To see only the results, filter the output:

```sh
node scripts/tophat.mjs tophat/tabs.json 2>&1 | grep -E "^(FAIL|eval|shot|clipboard|quit|console|tophat)"
```

### Set the expected values

Add `--update` to write the result of each `eval` into the script as its `expect` value:

```sh
node scripts/tophat.mjs tophat/tabs.json --update
pnpm exec oxfmt tophat
```

Use `--update` when you add a script, or when you change the behavior on purpose. After `--update`, read the `git diff` of the script, and make sure that each value is correct. `--update` writes what the page does now, and that can be wrong.

Do not expect values that change from run to run, for example relative times ("2d ago"), absolute paths, or images from the web. Change the `eval` so that it returns only the stable part. For example, `tophat/showcase.json` checks only the local images, and `tophat/frontmatter.json` checks the row text without the time.

### Script format

A script is a JSON file in `tophat/`. Paths in a script are relative to the script file.

| Field        | Required | Value                                                                                                                                  |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `args`       | Yes      | The `mdb` arguments, for example `["../docs/showcase.md", "--heading", "tables"]`.                                                     |
| `out`        | Yes      | The output folder, for example `"../build/tophat/reader"`.                                                                             |
| `steps`      | Yes      | The steps, in order.                                                                                                                   |
| `files`      | No       | Files to make before mdb starts: `{ "path": "text" }`. A `null` value removes the file. A path that ends in `/` makes an empty folder. |
| `width`      | No       | The window width in pixels. The default is 1200.                                                                                       |
| `height`     | No       | The window height in pixels. The default is 800.                                                                                       |
| `cwd`        | No       | The working folder for `args`. The default is the folder of the script.                                                                |
| `theme`      | No       | The terminal colors: `{ "foreground": [r, g, b], "background": [r, g, b], "ansi": [[r, g, b], …] }`.                                   |
| `background` | No       | The window background color, for example `"#1e1e2e"`.                                                                                  |

tophat reads `args` before it does the steps. Thus, if mdb must start in a folder or on a file that the script makes, put that file in `files`, not in a `write` step.

### Steps

| Step                                          | Result                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `{ "wait": 500 }`                             | Waits the number of milliseconds.                                                                    |
| `{ "key": "j" }`                              | Pushes a key. Use Electron key names, for example `Enter`, `Escape`, `Down`, `Up`, `PageDown`.       |
| `{ "key": "l", "modifiers": ["control"] }`    | Pushes a key with modifiers: `control`, `shift`, `alt`, or `meta`.                                   |
| `{ "type": "plan" }`                          | Types the text, one character at a time.                                                             |
| `{ "click": ".tab:nth-child(2)" }`            | Clicks the center of the first element that the CSS selector finds.                                  |
| `{ "hover": ".row:nth-child(2)" }`            | Moves the mouse to the center of the element.                                                        |
| `{ "scroll": 700 }`                           | Scrolls the reader (or the page) down by the number of pixels.                                       |
| `{ "eval": "document.title" }`                | Runs JavaScript in the page and writes the result as JSON. If the result is a promise, tophat waits. |
| `{ "eval": "document.title", "expect": "X" }` | Also fails the script if the result is not the same as `expect` (compared as JSON).                  |
| `{ "write": "../build/x.md", "text": "# X" }` | Writes a file, and makes its folders. Then waits 500 ms.                                             |
| `{ "remove": "../build/x.md" }`               | Removes a file. Then waits 500 ms.                                                                   |
| `{ "shot": "top" }`                           | Saves `top.png` (a screenshot) and `top.txt` (the text of the page) in the output folder.            |

`click` and `hover` write `FAIL … no element for <selector>` if the selector finds nothing. `eval` writes `FAIL … error: <message>` if the JavaScript throws an error. In both cases, the script continues, but it fails at the end.

### Write a good script

- **Use fixture documents, not the real docs.** Open files in `test/fixtures/`, or write them in the script with `write`. An `expect` value that comes from `docs/` or the README (a count, a title, a scroll position) breaks when someone edits that document. Only `showcase.json` uses `docs/showcase.md`, because it checks that document. Do not change `test/fixtures/pages/` to show a new feature: change `docs/showcase.md`.
- **Check results with `eval`.** A screenshot shows how the page looks, but an `eval` result is exact and is easy to compare. Return arrays or objects that show many values at once, for example `[document.title, document.querySelectorAll('.tab').length]`.
- **Use `?.` in `eval`.** Write `document.querySelector('.x')?.textContent`, not `document.querySelector('.x').textContent`. Then a missing element gives `null`, not an error.
- **Wait after an action.** A render, a scan, and a file change take time. Use `wait` steps of 200 to 1,500 ms. A file change needs more than 500 ms, because the watchers wait before they tell the page.
- **Find the front tab.** The page can have many tabs. The front tab is `.tab-pane:not(.background)`. The visible reader is `.reader:not([hidden])`, and the visible finder is `.finder:not([hidden])`.
- **Make helpers once.** An `eval` can make an object on `window`, and later steps can use it. `tophat/tabs.json` makes `window.T` with helpers in its first `eval`.
- **Send a document from "outside".** `window.mdbRemote.open({ path, root, heading, mode })` does the same thing as an `mdb` command that uses an open mdb. It returns `{ heading, result }`. Build absolute paths from `location.pathname`. For an example, read `tophat/remote.json`.
- **Write test files in `build/`.** Do not change the files in `docs/` or `test/fixtures/`. Use `files` to make a clean start, for example `"../build/tophat/fresh/old.md": null`.
- **Prove the test first.** Write the script with the `expect` values that you want. Run it before you change the code, and make sure that it fails for the correct reason. Then change the code, and run it again.

### Compare with a baseline

The `expect` values catch most changes. A baseline also catches changes in results that have no `expect` value. If a change must not change the behavior, save the results of all scripts before the change, and compare them after the change:

```sh
mkdir -p build/baseline
pnpm build
for f in tophat/*.json; do
  node scripts/tophat.mjs "$f" 2>&1 | grep -E "^(eval|shot|click|hover|clipboard|key)" > "build/baseline/$(basename "$f" .json).txt"
done
# Make the change, run pnpm build, run the loop again into build/after, then:
diff -r build/baseline build/after
```

### The scripts

| Script              | What it shows                                                                   |
| ------------------- | ------------------------------------------------------------------------------- |
| `finder.json`       | The file list, the filter, and text search.                                     |
| `finder-blur.json`  | Keys in the file list when the query field does not have the focus.             |
| `finder-empty.json` | A folder with no markdown files.                                                |
| `finder-hover.json` | The selection stays when the mouse does not move.                               |
| `finder-fresh.json` | New, renamed, and deleted files show in the file list.                          |
| `search-open.json`  | A document opened from text search, with the matches highlighted.               |
| `reader.json`       | The reader, the outline, a link to a different document, and `esc` to the list. |
| `navigation.json`   | The page cannot navigate away from mdb.                                         |
| `find.json`         | Find in the document, and the scroll keys.                                      |
| `live.json`         | Live reload, a deleted file, and a diagram error.                               |
| `frontmatter.json`  | The frontmatter property list.                                                  |
| `showcase.json`     | All the markdown items in `docs/showcase.md`, including each diagram type.      |
| `copy-code.json`    | The copy button on code blocks.                                                 |
| `narrow.json`       | A narrow pane, where the outline stays hidden.                                  |
| `wide.json`         | The centered layout in a wide pane, with and without the outline.               |
| `shell.json`        | The first screen when mdb starts in a folder.                                   |
| `remote.json`       | `--heading`, and documents sent with `window.mdbRemote.open`.                   |
| `tabs.json`         | Tabs: routing, keys, find in many tabs, background reload, labels, and closing. |
| `stdin.json`        | Stdin documents: titled updates, two opens at once, links, folder tabs, forget. |

`showcase.json` and `live.json` each show one `Diagram error` result. This is correct: `docs/showcase.md` has a diagram with an error on purpose.

## Smoke test

```sh
pnpm smoke docs/showcase.md
```

The smoke test starts the real `mdb` in a pseudo-terminal for 6 seconds. It reports three things:

- `alive after 6s`: mdb did not stop.
- `kitty graphics sent`: mdb sent images to the terminal.
- `log errors`: the number of errors in the pixel log (`~/.local/state/pixel/logs/`).

All three must be good. The smoke test does not show the page. Use tophat for that.

## Live checks

Some parts work only in a real terminal: panes, the control socket, the terminal keys, and the right-click menu. Do these checks by hand in cmux or Ghostty. Use the code in your copy, not the installed `mdb`:

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

Do not close panes that you did not open.

tophat cannot send keys through the terminal. Thus, check new keys in a real terminal too. mdb sees `ctrl+[`, `ctrl+h`, and `ctrl+l` only if the terminal uses the kitty keyboard protocol.
