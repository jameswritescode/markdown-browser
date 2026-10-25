---
name: mdb
description: Show a markdown document to the user in a terminal pane next to the conversation, rendered like a GitHub README with real fonts, images, and Mermaid diagrams. Use it to show a plan, spec, README, design doc, or any markdown file you wrote or want the user to read, instead of pasting long markdown into the chat.
---

`mdb` is a markdown viewer that runs in the terminal. From your shell, it opens in a
new pane beside the user, so they can read the document while they talk to you.

## Show a document

```sh
mdb docs/plan.md
```

Your shell has no terminal, so mdb opens a pane to the right of the user's pane.
If this terminal tab already shows mdb, mdb shows the file in that pane instead of
opening a new one. (A folder always opens a new pane.) The user can press `ctrl+[` there to go back to the previous document.

Point the user at a section:

```sh
mdb docs/plan.md --heading "Open questions"
```

`--heading` matches the heading text without regard to case, or a heading id such as
`open-questions`. If no heading matches, mdb opens the top of the document and its status
line says "no heading matches". When mdb uses an existing pane, the command also prints a
warning; when it opens a new pane, it does not.

Other options:

- `--split down` (or `left`, `up`) chooses where the new pane goes. The default is `right`.
- `--size 0.4` sets the size of a new pane, as a fraction of the current pane.
- `--new` opens a new pane even if the tab already shows mdb.
- `mdb <folder>` opens the file list for a folder, where the user can search the markdown files.

mdb reloads the document when the file changes. After you edit a file that mdb shows, you do
not need to run mdb again.

## When to use it

- You wrote or changed a document that the user should read: a plan, a spec, release notes.
- The user asks to see a markdown file, or a document has diagrams, tables, or images that do
  not read well as text.

Do not use it for short answers. Tell the user in one line what you opened, for example
"I opened the plan in mdb, at Open questions."

## If it fails

- `cannot open panes`: the terminal cannot be scripted. Ask the user to run the `mdb` command
  themselves.
- `did not start in it`: the new pane opened, but mdb did not start in it. Ask the user what
  the new pane shows.

Run `mdb --help` for the full list of options.
