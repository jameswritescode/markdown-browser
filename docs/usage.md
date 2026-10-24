# mdb usage guide

## File list

When you start `mdb` or `mdb <folder>`, mdb shows a list of the markdown files in the folder and its subfolders.

Each row shows:

- The document title. This is the first level-1 heading. If the document has no level-1 heading, mdb uses the file name.
- The path from the folder.
- The time of the last change.

mdb shows files with the extensions `.md`, `.markdown`, and `.mdx`.

mdb does not show these files:

- Files and folders with a name that starts with a dot (`.`).
- Files in `node_modules` folders.
- Files that a `.gitignore` file excludes.
- Files in the `Library` folder of your home folder.

mdb shows a maximum of 5,000 files. If a folder has more files, the status line shows "showing first 5,000 docs".

### Filter the list

Type text to filter the list. mdb compares the text to the title and the path of each file. The letters do not have to be adjacent. For example, `gst` finds `guide/setup.md`. The matching letters are highlighted.

### Search the text

Press `/` when the filter is empty. Then type text. mdb finds the text in the documents and shows the line with the text. mdb shows a maximum of 3 results for each file.

Press `enter` to open the document. mdb highlights the text that you searched for. Press `n` and `N` to go to the other matches.

Press `esc` to clear the text. Press `esc` again to go back to the filter.

## Document

mdb shows the document like the GitHub page for a README file. mdb uses the colors of your terminal.

mdb shows these items:

- Headings, lists, tables, quotes, and links.
- Task lists.
- Footnotes.
- Alerts, for example `> [!NOTE]` and `> [!WARNING]`.
- Code blocks with syntax colors.
- Images. mdb finds a relative image path from the folder of the document.
- Mermaid diagrams in ` ```mermaid ` code blocks.

mdb does not run scripts in documents.

### Status line

The status line is at the bottom of the document. It shows the path of the document and how far you scrolled. It also shows the keys that you can use.

### Find text in the document

1. Press `/`. A text field opens in the status line.
2. Type the text. mdb highlights all the matches and goes to the first match below the top of the page. The status line shows the number of matches.
3. Press `enter` to close the text field. The highlights stay.
4. Press `n` to go to the next match. Press `N` to go to the previous match.
5. Press `esc` to remove the highlights.

If you press `esc` while you type, mdb closes the text field and removes the highlights.

mdb does not find text that crosses formatting, for example text that is part bold and part not bold.

When you open a document from a text search in the file list, mdb highlights the text that you searched for.

### Outline

The outline is on the left side. It shows the level-1, level-2, and level-3 headings. The outline highlights the section that you read. Click a heading in the outline to go to that section.

If the terminal is narrow, mdb hides the outline. Press `ctrl+b` to show or hide the outline.

### Links

| Link                                          | Result                                         |
| --------------------------------------------- | ---------------------------------------------- |
| A link to a heading (`#name`)                 | mdb goes to the heading.                       |
| A link to a markdown file                     | mdb opens the file. Press `ctrl+[` to go back. |
| A link to a markdown file that does not exist | mdb shows "Not found" next to the link.        |
| A link to a different local file              | Finder shows the file. mdb does not open it.   |
| A web link                                    | Your default browser opens the link.           |

### Changes to the file

mdb shows the changes to the document when the file changes. mdb keeps the scroll position.

If you delete the file, mdb shows "This file no longer exists". Press `esc` to go back to the file list.

### Diagrams

mdb uses Pele to draw Mermaid diagrams. Pele uses the colors of your terminal. Pele ignores `%%{init}%%` theme settings in a diagram.

If a diagram has an error, mdb shows the diagram text and the error message.

### Go back and forward

Press `ctrl+[` to go back to the previous document. Press `ctrl+]` to go forward. `cmd+[` and `cmd+]` also work if your terminal sends them to mdb.

mdb can only see `ctrl+[` if your terminal uses the kitty keyboard protocol. Ghostty, kitty, and cmux use it. In a different terminal, `ctrl+[` is the same as `esc`, and mdb goes back to the file list.

## Copy text

1. Select text with the mouse.
2. Press `cmd+c`, or right-click and click **Copy**.

To copy a link address, right-click the link and click **Copy link address**.

## Background

By default, the page is transparent. Your terminal background shows behind the page.

To use the terminal background color, do one of these steps:

- Start mdb with `--solid`.
- Set the environment variable `MDB_BACKGROUND=solid`.

## Troubleshooting

### mdb says that the terminal has no graphics support

Your terminal does not support the kitty graphics protocol. Use a terminal that supports it, for example Ghostty, kitty, or cmux.

### macOS shows "Electron is damaged"

pnpm copied Electron from its cache without the correct links. Do these steps:

1. Click **Cancel**. Do not move Electron to the Trash.
2. Remove mdb:

   ```sh
   pnpm rm -g mdb
   ```

3. Install mdb again with the `--config.side-effects-cache=false` option. The full command is in the README.

### mdb stops

mdb writes a log to `~/.local/state/pixel/logs/mdb.stderr.log`. Read this log to find the cause.
