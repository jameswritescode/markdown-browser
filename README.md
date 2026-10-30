# mdb

mdb is a markdown browser for the terminal. It shows markdown documents with real fonts, headings, images, and diagrams. It draws each page as pixels with the kitty graphics protocol.

Use mdb to find and read the markdown files in a folder. mdb is similar to [glow](https://github.com/charmbracelet/glow), but it shows each document as a full web page.

## Features

- Documents look like a README on GitHub, in the colors of your terminal.
- Images, tables, footnotes, task lists, frontmatter, and code with syntax colors.
- Mermaid diagrams, drawn with [Pele](https://github.com/obsidianmd/pele).
- A file list with a filter, and a search for text in all the documents.
- Tabs, an outline, and find in the document.
- Documents show changes to their files immediately.
- Markdown from stdin, with no file.
- Coding agents can show you documents in a pane next to the conversation.

## Requirements

- macOS.
- A terminal that supports the kitty graphics protocol, for example Ghostty, kitty, cmux, or Rex.
- Node.js 24.
- pnpm or npm.

## Install

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

To update mdb, run the install command again.

To change mdb and use your changes, install it from a local copy. Read [Develop mdb](docs/development.md).

## Start mdb

| Command         | Result                                          |
| --------------- | ----------------------------------------------- |
| `mdb`           | Shows the markdown files in the current folder. |
| `mdb <folder>`  | Shows the markdown files in `<folder>`.         |
| `mdb <file.md>` | Opens `<file.md>`.                              |
| `… \| mdb`      | Shows the markdown on stdin.                    |

These keys get you started:

| Key                | Action                                                   |
| ------------------ | -------------------------------------------------------- |
| Type text          | Filter the file list.                                    |
| `enter`            | Open the selected document.                              |
| `esc`              | Go back to the file list.                                |
| `/`                | Search the documents, or find text in the open document. |
| `ctrl+t`, `ctrl+w` | Open a new tab, or close the tab.                        |
| `ctrl+c`, `ctrl+q` | Quit.                                                    |

For all the keys and options, read the [usage guide](docs/usage.md). To see each markdown item that mdb can show, open the showcase: `mdb docs/showcase.md`.

## Use mdb with coding agents

mdb has a skill for Claude Code and Codex. With the skill, an agent can show you a plan or a document in a pane next to the conversation. To install the skill, run this command:

```sh
mdb skill install
```

After you update mdb, run the command again. For more information, read [Panes and coding agents](docs/usage.md#panes-and-coding-agents).

## Documentation

- [Usage guide](docs/usage.md): all the features, keys, and options.
- [Showcase](docs/showcase.md): each markdown item that mdb can show.
- [Develop mdb](docs/development.md): install from a local copy, run the checks, and publish a release.
- [Architecture](docs/architecture.md): how mdb works.
- [Testing](docs/testing.md): the test tools.

## Uninstall

```sh
pnpm rm -g @jamesnewton/mdb
```

If you installed mdb with npm, use `npm rm -g @jamesnewton/mdb`.

If you installed the agent skill, also remove `~/.claude/skills/mdb` and `~/.codex/skills/mdb`.

## Acknowledgements

[terminal-browser](https://github.com/zenbu-labs/terminal-browser) by Zenbu Labs gave the idea for mdb. mdb draws into the terminal with [pixel](https://github.com/zenbu-labs/terminal-browser/tree/main/pixel), the library that terminal-browser uses. [Pele](https://github.com/obsidianmd/pele) draws the Mermaid diagrams.

## License

mdb is under the [MIT license](LICENSE). Some code comes from other projects. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) gives their licenses.
