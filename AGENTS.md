# AGENTS.md

Instructions for coding agents that work in this repository.

## The project

mdb is a markdown browser for the terminal. It is an Electron app that draws into the terminal with the kitty graphics protocol, through the [pixel](https://github.com/zenbu-labs/terminal-browser/tree/main/pixel) library. It targets macOS only.

Read these documents before you change code:

- [README.md](README.md): what mdb does, install, keys, options.
- [docs/architecture.md](docs/architecture.md): the CLI, the main process, and the page, and how they work together.
- [docs/testing.md](docs/testing.md): unit tests, tophat, the smoke test, and live checks.
- [docs/usage.md](docs/usage.md): the user guide.

## Tools

- Use mise for tool versions (`mise.toml`: Node 24, pnpm 12.6.0). Run `mise install` once.
- Use pnpm. Do not use npm or yarn.
- `pnpm-workspace.yaml` sets `sideEffectsCache: false`. Do not remove it: with the cache, pnpm copies pixel's Electron without its links, and macOS says that "Electron is damaged".
- Lint with oxlint and format with oxfmt. Do not add ESLint or Prettier.

## Commands

| Command             | Use                                                                 |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm build`        | Builds `dist/` with esbuild. `dist/` is not in git.                 |
| `pnpm test`         | Unit tests (vitest).                                                |
| `pnpm typecheck`    | TypeScript.                                                         |
| `pnpm lint`         | oxlint.                                                             |
| `pnpm format`       | Formats all files with oxfmt. `pnpm format:check` only checks.      |
| `pnpm tophat:all`   | Builds, then runs every script in `tophat/` and checks the results. |
| `pnpm tophat <f>`   | Builds, then runs one tophat script.                                |
| `pnpm smoke [path]` | Starts the real mdb in a pseudo-terminal for 6 seconds.             |
| `node bin/mdb.js …` | Runs your copy of mdb. Run `pnpm build` first.                      |

Before you commit, these must pass:

```sh
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm tophat:all
```

Run `pnpm smoke` too when you change the main process, the CLI, or the build.

## How to work

- **Write the test first.** For logic, write a unit test. For page behavior, write or extend a tophat script with `expect` values. Run it, and see it fail for the correct reason before you change the code. [docs/testing.md](docs/testing.md) tells you how.
- **Look at the page.** After a page change, look at the tophat screenshots in `build/tophat/`. An `expect` value does not show if the page looks wrong.
- **Check terminal behavior live.** tophat does not use the terminal. For panes, the control socket, terminal keys, and the right-click menu, test by hand with `node bin/mdb.js`. An mdb that is already open runs its old code. Close only the panes that you opened.
- **Keep the layers apart.**
  - `src/core` has no Electron and no DOM imports. The CLI and the main process both use it.
  - `src/page` has no Node access. It uses only the `window.mdb` bridge (`MdbBridge` in `src/shared/types.ts`).
  - If page code has logic that you can test alone, put it in its own module without DOM calls, for example `src/page/tab-route.ts`.
- **Remember that the page has many tabs.** Each tab has a finder and a reader. Code in a finder or a reader must check `isActive()` before it handles keys or paints shared state such as `CSS.highlights`. Read the "Tabs" part of the architecture document.
- **Keep the agent skill up to date.** When you change the `mdb` command, its options, or what it prints, also change `skill/SKILL.md`, the `USAGE` text in `src/cli/main.ts`, the README, and `docs/usage.md`. The skill tells other agents how to use mdb.

## Documentation

- Write the documents in `docs/`, the README, and the skill in ASD-STE100 (Simplified Technical English), where possible: short sentences, active voice, one instruction in each sentence, and simple words.
- `docs/superpowers/` is for local planning files (designs and plans). It is in `.gitignore`. Do not commit it.
- When you change how mdb works, update `docs/architecture.md`. When you change a test tool or add a tophat script, update `docs/testing.md`.

## Code style

- TypeScript, strict. Match the code around your change.
- Use few comments. Write a comment only to say why, when the code cannot say it. Use `/** … */` on exported functions and types when the name does not tell the full story.
- Do not add a dependency if a few lines of code can do the job.

## Commits

- Write the subject as a short sentence in the imperative, with a capital letter and no period, for example `Keep the file list up to date when docs are added or removed`. Do not use prefixes such as `feat:`.
- In the body, tell what changed for the user, and why.
- Work on a branch. The maintainer squash-merges pull requests into `main`.

## Releases

mdb is a private package in GitHub Packages: `@jameswritescode/mdb`. A `v*` tag on `main` starts `.github/workflows/publish.yml`. The tag must agree with the version in `package.json`. Do not publish or push tags unless the user asks.
