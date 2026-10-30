# Develop mdb

To learn how mdb works, read [mdb architecture](architecture.md).

## Set up

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

## Install from a local copy

This install uses the code in your copy of the repository. The `mdb` command runs that code directly. It has the same name as the npm package, so it replaces an npm install with pnpm. To go back, install from npm again.

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

## Publish a release

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

### The first release on npm

npm lets you add a trusted publisher only to a package that exists. So publish the first release from your computer:

1. On `main`, change the version with `pnpm version` and publish with `pnpm publish`.
2. On npmjs.com, open the settings of the package. Add a trusted publisher: GitHub Actions, this repository, and the workflow `publish.yml`.
3. Push the commit and the tag with `git push --follow-tags`. The workflow fails at the publish step, because the version is already on npm. This is correct for the first release only.

## Test tools

For the full guide, read [Testing mdb](testing.md).

- `pnpm tophat:all` runs all the scripts in `tophat/` and fails if a check fails. `pnpm tophat <script.json>` runs one script. tophat opens the mdb page in an offscreen window. It sends the keys in the script and saves screenshots and page text. The scripts are in `tophat/`. The output goes to `build/tophat/`.
- `pnpm smoke [file or folder]` starts mdb in a pseudo-terminal for 6 seconds. It makes sure that mdb stays open, sends kitty graphics, and writes no errors to its log.
