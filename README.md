# mdb

mdb is a markdown browser for the terminal. It shows markdown documents with real fonts, headings, images, and diagrams. It draws each page as pixels with the kitty graphics protocol.

Use mdb to find and read the markdown files in a folder. mdb is similar to [glow](https://github.com/charmbracelet/glow), but it shows each document as a full web page. One mdb can show many documents in tabs.

mdb uses [pixel](https://github.com/zenbu-labs/terminal-browser/tree/main/pixel), the library that [terminal-browser](https://github.com/zenbu-labs/terminal-browser) uses. Mermaid diagrams are drawn with [Pele](https://github.com/obsidianmd/pele).

## Requirements

- macOS.
- A terminal that supports the kitty graphics protocol, for example Ghostty, kitty, cmux, or Rex.
- Node.js 24.
- pnpm or npm.

## Install

You can install mdb in two ways:

- [From npm](#from-npm). Use this to use mdb.
- [From a local copy](#from-a-local-copy). Use this to change mdb and use your changes.

The two installs have the same name. When you install one, it replaces the other.

### From npm

mdb is the package `@jamesnewton/mdb` on npm. The command is `mdb`.

With pnpm:

1. Make sure that the pnpm global bin folder is in your `PATH`. If it is not, run this command one time:

   ```sh
   pnpm setup
   ```

2. Install mdb:

   ```sh
   pnpm add -g --config.side-effects-cache=false --allow-build=@zenbu-labs/pixel @jamesnewton/mdb
   ```

The `--allow-build` option lets pixel download its Electron runtime during the install.

The `--config.side-effects-cache=false` option is necessary. If you do not use it, pnpm can copy Electron from its cache without the correct links. Then macOS shows the message "Electron is damaged" and does not start mdb.

With npm:

```sh
npm install -g @jamesnewton/mdb
```

To update mdb, run the install command again. You get the most recent release. If you use the [agent skill](#use-mdb-with-coding-agents), also run `mdb skill install` again.

### From a local copy

This install uses the code in your copy of the repository. The `mdb` command runs that code directly.

1. Make sure that the pnpm global bin folder is in your `PATH`. If it is not, run this command one time:

   ```sh
   pnpm setup
   ```

2. Get the repository and install the tools and the dependencies:

   ```sh
   git clone git@github.com:jameswritescode/markdown-browser.git
   cd markdown-browser
   mise install
   pnpm install
   ```

3. Build mdb and install the local copy:

   ```sh
   pnpm build
   pnpm add -g "$PWD"
   ```

After you change the code or get new commits, run `pnpm build` again. You do not need to install again. If the dependencies change, run `pnpm install` before `pnpm build`.

## Start mdb

| Command         | Result                                                               |
| --------------- | -------------------------------------------------------------------- |
| `mdb`           | Shows the markdown files in the current folder.                      |
| `mdb <folder>`  | Shows the markdown files in `<folder>`.                              |
| `mdb <file.md>` | Opens `<file.md>`.                                                   |
| `mdb -`         | Shows the markdown on stdin.                                         |
| `… \| mdb`      | Shows the markdown on stdin, if it comes in 5 seconds.               |
| `mdb --solid`   | Uses the terminal background color. The default page is transparent. |
| `mdb --help`    | Shows the usage text.                                                |

You can also set `MDB_BACKGROUND=solid` to use the terminal background color.

### More options

| Option                | Result                                                             |
| --------------------- | ------------------------------------------------------------------ |
| `--heading <text>`    | Goes to the first heading that matches `<text>`.                   |
| `--title <text>`      | Names the stdin document. A later pipe with this title updates it. |
| `--split <direction>` | Opens mdb in a new pane: `right`, `left`, `down`, or `up`.         |
| `--size <fraction>`   | Sets the size of the new pane, from `0.2` to `0.95`.               |
| `--new`               | Opens a new pane, also when this terminal tab already shows mdb.   |
| `--replace`           | Shows the file in the current tab of the mdb pane, not a new tab.  |
| `--fps <n>`           | Draws at most `<n>` frames each second, from `1` to `240`.         |
| `--frames <how>`      | Sends frames to the terminal as `shared`, `file`, or `inline`.     |
| `--present <how>`     | Sends each frame as `full`, `patched`, or `animation`.             |

For more information about panes, read [Panes and coding agents](docs/usage.md#panes-and-coding-agents). For `--fps`, `--frames`, and `--present`, read [Frame rate and frames](docs/usage.md#frame-rate-and-frames).

## Use mdb with coding agents

mdb has a skill for Claude Code and Codex. With the skill, an agent can show you a document in a pane next to the conversation. For example, an agent can show you a plan that it wrote, at the section that it is talking about.

All agents in one terminal tab use the same mdb pane. Each document opens in its own tab in that pane, so an agent does not replace the document of a different agent.

An agent can also pipe markdown into mdb, with no file. For example, an agent can keep a summary of its work in one tab: `… | mdb --title "Work summary"`. Each pipe with the same title updates that tab.

To install the skill, run this command:

```sh
mdb skill install
```

The command writes `~/.claude/skills/mdb/SKILL.md` and `~/.codex/skills/mdb/SKILL.md`. After you update mdb, run the command again.

Panes work in cmux, Ghostty 1.3 or later, kitty, Rex, tmux, and WezTerm.

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

### Tabs

These keys work in the file list and in a document.

| Key                | Action                                                 |
| ------------------ | ------------------------------------------------------ |
| `ctrl+t`           | Open a new tab. The new tab shows the file list.       |
| `ctrl+w`           | Close the tab. When you close the last tab, mdb stops. |
| `ctrl+h`, `ctrl+l` | Go to the previous or the next tab.                    |

### Document

| Key                    | Action                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `esc`                  | Go back to the file list.                                                                     |
| `j` `k`, `↓` `↑`       | Scroll down or up.                                                                            |
| `/`                    | Find text in the document.                                                                    |
| `n`, `N`               | Go to the next or the previous match.                                                         |
| `d`, `u`               | Scroll half a page down or up.                                                                |
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

This command removes both types of install:

```sh
pnpm rm -g @jamesnewton/mdb
```

If you installed mdb with npm, use this command:

```sh
npm rm -g @jamesnewton/mdb
```

If you installed the agent skill, also remove `~/.claude/skills/mdb` and `~/.codex/skills/mdb`.

## Development

To use your changes as the `mdb` command, install mdb [from a local copy](#from-a-local-copy).

To learn how mdb works, read [mdb architecture](docs/architecture.md).

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
   pnpm tophat:all
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

The workflow publishes to npm as a trusted publisher, so it needs no token. The package settings on npmjs.com must name this repository and `publish.yml` as the trusted publisher.

You can also publish from your computer. You must be logged in to npm with an account that can publish `@jamesnewton/mdb`. Run `npm login` one time. On `main`, run:

```sh
pnpm publish
```

`pnpm publish` builds `dist/` before it publishes. It stops if you are not on `main`, or if you have changes that are not committed.

### Test tools

For the full guide, read [Testing mdb](docs/testing.md).

- `pnpm tophat:all` runs all the scripts in `tophat/` and fails if a check fails. `pnpm tophat <script.json>` runs one script. tophat opens the mdb page in an offscreen window. It sends the keys in the script and saves screenshots and page text. The scripts are in `tophat/`. The output goes to `build/tophat/`.
- `pnpm smoke [file or folder]` starts mdb in a pseudo-terminal for 6 seconds. It makes sure that mdb stays open, sends kitty graphics, and writes no errors to its log.

## Acknowledgements

[terminal-browser](https://github.com/zenbu-labs/terminal-browser) by Zenbu Labs gave the idea for mdb. mdb draws into the terminal with [pixel](https://github.com/zenbu-labs/terminal-browser/tree/main/pixel), the library that terminal-browser uses. [Pele](https://github.com/obsidianmd/pele) draws the Mermaid diagrams.

## License

mdb is under the [MIT license](LICENSE). Some code comes from other projects. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) gives their licenses.
