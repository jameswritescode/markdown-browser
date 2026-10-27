# mdb usage guide

## File list

When you start `mdb` or `mdb <folder>`, mdb shows a list of the markdown files in the folder and its subfolders.

The list stays up to date. When you add, rename, or delete a markdown file in the folder, the list changes. mdb also reads the folder again each time that you go back to the list.

Each row shows:

- The document title. This is the `title` value in the frontmatter. If there is no `title` value, mdb uses the first level-1 heading. If the document has no level-1 heading, mdb uses the file name.
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
- YAML frontmatter. Refer to [Frontmatter](#frontmatter).

mdb does not run scripts in documents.

### Frontmatter

Frontmatter is YAML at the start of a document, between two `---` lines:

```markdown
---
title: Release notes
tags: [markdown, terminal]
---
```

mdb shows the frontmatter as a list of properties at the top of the document. A list value, for example `tags`, shows as a set of labels. The frontmatter is not in the outline.

If the YAML has an error, mdb shows the frontmatter text as a code block.

mdb supports only YAML frontmatter. It does not support TOML frontmatter (`+++`).

### Status line

The status line is at the bottom of the document. It shows the path of the document and how far you scrolled. It also shows the keys that you can use. When mdb has two or more tabs, the status line also shows the position of the tab, for example `2 of 3`.

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

The outline is hidden when mdb starts. Press `ctrl+b` to show or hide the outline. mdb keeps your choice when you open a different document.

The outline is on the left side. It shows the level-1, level-2, and level-3 headings. The outline highlights the section that you read. Click a heading in the outline to go to that section.

### Links

| Link                                          | Result                                         |
| --------------------------------------------- | ---------------------------------------------- |
| A link to a heading (`#name`)                 | mdb goes to the heading.                       |
| A link to a markdown file                     | mdb opens the file. Press `ctrl+[` to go back. |
| A link to a markdown file that does not exist | mdb shows "Not found" next to the link.        |
| A link to a different local file              | Finder shows the file. mdb does not open it.   |
| A web link                                    | Your default browser opens the link.           |

### Changes to the file

mdb shows the changes to the document when the file changes. mdb keeps the scroll position. This also occurs in tabs that you do not see. For more information, read [Tabs](#tabs).

If you delete the file, mdb shows "This file no longer exists". Press `esc` to go back to the file list.

### Diagrams

mdb uses Pele to draw Mermaid diagrams. Pele uses the colors of your terminal. Pele ignores `%%{init}%%` theme settings in a diagram.

If a diagram has an error, mdb shows the diagram text and the error message.

### Go back and forward

Press `ctrl+[` to go back to the previous document. Press `ctrl+]` to go forward. `cmd+[` and `cmd+]` also work if your terminal sends them to mdb. Each tab has its own history.

mdb can only see `ctrl+[` if your terminal uses the kitty keyboard protocol. Ghostty, kitty, and cmux use it. In a different terminal, `ctrl+[` is the same as `esc`, and mdb goes back to the file list.

## Tabs

One mdb can show many documents. Each document is in a tab. When mdb has two or more tabs, a bar at the top shows the tabs.

- Press `ctrl+t` to open a new tab. The new tab shows the file list of the folder of the current tab.
- Press `ctrl+w` to close the current tab. When you close the last tab, mdb stops.
- Press `ctrl+h` to go to the previous tab. Press `ctrl+l` to go to the next tab.
- Click a tab to go to it. Click ✕ on a tab to close it. Click + to open a new tab.

Each tab has its own folder, back and forward history, scroll position, and find. Press `esc` in a tab to show the file list of the folder of that tab.

A tab shows the title of its document, as the file list does. If the document has no title, the tab shows the file name. When two tabs have the same title, the tab also shows the file name, or the name of the folder if the file names are also the same. The status line shows the full path and the position of the tab, for example `plan.md · 2 of 3 · 40%`.

When the file of a tab that you do not see changes, mdb shows the new document in that tab and puts a dot on the tab. The dot goes away when you go to the tab.

mdb can only see `ctrl+h` and `ctrl+l` if your terminal uses the kitty keyboard protocol. Ghostty, kitty, and cmux use it. In a different terminal, `ctrl+h` can be the same as `backspace`. Click the tabs instead.

## Panes and coding agents

mdb can open in a new pane beside your current pane. Use `--split` with a direction:

```sh
mdb docs/plan.md --split right
```

Use `--size` to set the size of the new pane, for example `--size 0.4`. Some terminals, for example cmux, do not use the size.

When the output of mdb is not a terminal, mdb acts as if you gave `--split right`. This occurs when a coding agent runs mdb in its shell. Thus, the agent does not take your current pane.

### Use the pane again

With `--split`, mdb first looks for an mdb in the same terminal tab. If it finds one, it shows the document in that pane and does not open a new pane:

- If a tab in that pane already shows the document, mdb goes to that tab.
- If the current tab shows the file list, mdb shows the document in that tab.
- If not, mdb opens the document in a new tab.

Thus, many agents in one terminal tab can show you documents in the same pane, and they do not replace the documents of each other.

To show the document in the current tab, add `--replace`. Press `ctrl+[` in that tab to go back to the previous document.

This works only for a file. For a folder, mdb always opens a new pane.

To always open a new pane, add `--new`.

mdb can find an mdb that it opened in a pane. In cmux, it can also find an mdb that you started yourself. In other terminals, mdb cannot find an mdb that you started yourself.

### Go to a heading

Add `--heading` to go to a heading:

```sh
mdb docs/plan.md --heading "Open questions"
```

mdb compares the text to the heading text. Upper case and lower case are the same. You can also use a heading id, for example `open-questions`. If no heading matches, mdb shows the top of the document. The status line shows "no heading matches" for 5 seconds. When mdb uses an mdb pane that is already open, the command also shows a warning.

### Terminals

| Terminal             | Panes                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| cmux                 | Yes.                                                                                                                                        |
| Ghostty 1.3 or later | Yes. The first time, macOS asks if your terminal or agent can control Ghostty. Click **Allow**.                                             |
| kitty                | Yes, when remote control is on. Add `allow_remote_control socket-only` and `listen_on unix:/tmp/kitty` to `kitty.conf`, then restart kitty. |
| tmux                 | Yes.                                                                                                                                        |
| WezTerm              | Yes.                                                                                                                                        |

mdb uses pixel to open panes. If your terminal cannot open panes, mdb shows a message and stops.

### The agent skill

Run `mdb skill install` to install the skill for Claude Code and Codex. The skill tells the agent when to use mdb and how to use it. If a skill file is already there and mdb did not write it, mdb does not change it.

In Codex, the agent must run mdb with escalated permissions. The Codex sandbox stops the commands that mdb uses to find the terminal pane.

## Copy text

1. Select text with the mouse.
2. Press `cmd+c`, or right-click and click **Copy**.

To copy a link address, right-click the link and click **Copy link address**.

To copy all of a code block, move the pointer over the block and click the copy button in its top-right corner. The button shows a check mark when the text is on the clipboard.

### Ghostty and cmd+c

By default, Ghostty uses `cmd+c` for its own copy command. Ghostty does not send the key to mdb, so `cmd+c` does nothing in mdb. The right-click menu continues to work.

To send `cmd+c` to mdb, add this line to `~/.config/ghostty/config`:

```
keybind = performable:super+c=copy_to_clipboard
```

With this line, Ghostty copies only when it has its own selection. When it has no selection, Ghostty sends `cmd+c` to mdb. Restart Ghostty or reload its configuration after you change the file.

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
