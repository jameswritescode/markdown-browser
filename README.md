# mdb

mdb is a markdown browser for the terminal. It shows markdown documents with real fonts, headings, images, and diagrams. It draws each page as pixels with the kitty graphics protocol.

Use mdb to find and read the markdown files in a folder. mdb is similar to [glow](https://github.com/charmbracelet/glow), but it shows each document as a full web page.

mdb uses [pixel](https://github.com/zenbu-labs/terminal-browser/tree/main/pixel), the library that [terminal-browser](https://github.com/zenbu-labs/terminal-browser) uses. Mermaid diagrams are drawn with [Pele](https://github.com/obsidianmd/pele).

## Requirements

- macOS.
- A terminal that supports the kitty graphics protocol, for example Ghostty, kitty, or cmux.
- Node.js 24 and pnpm. This repository uses [mise](https://mise.jdx.dev) to set the versions.
- Read access to this GitHub repository.

## Install

mdb is a private package in GitHub Packages.

1. Make sure that the pnpm global bin folder is in your `PATH`. If it is not, run this command one time:

   ```sh
   pnpm setup
   ```

2. Give pnpm access to GitHub Packages. Do this one time on each computer:

   ```sh
   gh auth refresh -s read:packages
   echo "@jameswritescode:registry=https://npm.pkg.github.com" >> ~/.npmrc
   echo "//npm.pkg.github.com/:_authToken=$(gh auth token)" >> ~/.npmrc
   ```

3. Install mdb:

   ```sh
   pnpm add -g --config.side-effects-cache=false --allow-build=@zenbu-labs/pixel @jameswritescode/mdb
   ```

To update mdb, do step 3 again.

The `--allow-build` option lets pixel download its Electron runtime during the install.

The `--config.side-effects-cache=false` option is necessary. If you do not use it, pnpm can copy Electron from its cache without the correct links. Then macOS shows the message "Electron is damaged" and does not start mdb.

### Install from a local copy

To use the code in a local copy of this repository, run these commands in the repository:

```sh
pnpm install
pnpm build
pnpm add -g "$PWD"
```

The installed `mdb` uses the local copy. After you change the code, run `pnpm build` again.

## Start mdb

| Command         | Result                                                               |
| --------------- | -------------------------------------------------------------------- |
| `mdb`           | Shows the markdown files in the current folder.                      |
| `mdb <folder>`  | Shows the markdown files in `<folder>`.                              |
| `mdb <file.md>` | Opens `<file.md>`.                                                   |
| `mdb --solid`   | Uses the terminal background color. The default page is transparent. |
| `mdb --help`    | Shows the usage text.                                                |

You can also set `MDB_BACKGROUND=solid` to use the terminal background color.

## Keys

### File list

| Key                        | Action                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| Type text                  | Filter the list by file name and title.                                  |
| `/`                        | Search the text in the documents. Use this key when the filter is empty. |
| `↓` `↑`, `ctrl+j` `ctrl+k` | Move the selection. You can also use `ctrl+n` and `ctrl+p`.              |
| `pagedown` `pageup`        | Move the selection 10 rows.                                              |
| `enter`                    | Open the selected document.                                              |
| `esc`                      | Clear the filter. In text search, go back to the filter.                 |
| `ctrl+c`, `ctrl+q`         | Quit.                                                                    |

### Document

| Key                    | Action                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `esc`                  | Go back to the file list.                                                                     |
| `j` `k`, `↓` `↑`       | Scroll down or up.                                                                            |
| `/`                    | Find text in the document.                                                                    |
| `n`, `N`               | Go to the next or the previous match.                                                         |
| `space`, `shift+space` | Scroll one page down or up.                                                                   |
| `g`, `G`               | Go to the top or the bottom.                                                                  |
| `ctrl+[`, `ctrl+]`     | Go back or forward after you follow a link.                                                   |
| `ctrl+b`               | Show or hide the outline.                                                                     |
| `cmd+c`                | Copy the selected text. In Ghostty, read [Ghostty and cmd+c](docs/usage.md#ghostty-and-cmdc). |
| Right-click            | Open the copy menu.                                                                           |
| `ctrl+c`, `ctrl+q`     | Quit.                                                                                         |

For more information, read the [usage guide](docs/usage.md).

To see each markdown item that mdb can show, open the [showcase](docs/showcase.md):

```sh
mdb docs/showcase.md
```

## Uninstall

```sh
pnpm rm -g @jameswritescode/mdb
```

## Development

1. Install the tools and the dependencies:

   ```sh
   mise install
   pnpm install
   ```

2. Run the checks:

   ```sh
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm format:check
   ```

3. Build and start mdb from the repository:

   ```sh
   pnpm build
   node bin/mdb.js test/fixtures/docs
   ```

The `dist/` folder is not in git. `pnpm build` makes it.

### Publish a release

Publish only from `main`.

1. Change the version and make a tag:

   ```sh
   pnpm version patch
   ```

   Use `minor` or `major` for larger changes.

2. Push the commit and the tag:

   ```sh
   git push --follow-tags
   ```

   The "Publish" workflow runs the checks and publishes the package. It stops if the tag is not on `main`, or if the tag does not agree with the version in `package.json`.

You can also publish from your computer. Your token must have the `write:packages` scope. Run `gh auth refresh -s write:packages`, then put the new `gh auth token` in `~/.npmrc`. On `main`, run:

```sh
pnpm publish
```

`pnpm publish` builds `dist/` before it publishes. It stops if you are not on `main`, or if you have changes that are not committed.

### Test tools

- `pnpm tophat <script.json>` opens the mdb page in an offscreen window. It sends the keys in the script and saves screenshots and page text. The scripts are in `tophat/`. The output goes to `build/tophat/`.
- `pnpm smoke [file or folder]` starts mdb in a pseudo-terminal for 6 seconds. It makes sure that mdb stays open, sends kitty graphics, and writes no errors to its log.
