# RoadWise

A driving assistant that sees the curves ahead and suggests the speed to take them; runs in the
browser, no position sent online.

> ⚠️ An educational project: not production-ready software, nor something to trust for driving.
> Keep that warning visible in the app and the README.

Production: https://roadwise-app.netlify.app (Netlify builds `master`: `npm run build` → `dist/`).
The project is piloted by La Fabrique extraordinaire (`.fabrique.json`).

## Stack

TypeScript, React 18, Vite (SWC), shadcn-ui, Tailwind, Leaflet (2D map), Three.js (3D drive view).
A static single-page app and a PWA (`public/sw.js`, `public/manifest.json`), served at the site's
root (`base: '/'`). No server: everything runs in the browser.

## Run, check, build

```sh
npm install          # also runs type-check and lint (`prepare`)
npm run dev          # http://localhost:8080
npm run type-check
npm run lint
npm test             # Jest + ts-jest, tests in src/**/__tests__/
npm run build        # dist/, with dist/version.json
node scripts/check-version.mjs   # dist/version.json matches the release notes
```

CI (`.github/workflows/ci.yml`) runs all of these on every pull request and push to `master`.

## Conventions

- One pull request per story, from a branch `claude/<issue>-<subject>` off `master`, to `master`.
  **Never push onto `master`.**
- Each pull request adds its entry on top of `docs/release-notes.json`, written `"version": "next"`,
  with `date` (today) and no `heure`: `titre`, `changements` in plain words for the driver, `stories`
  with the issue numbers, `liens`. A pull request never gives a number: two written at the same time
  would both take the same one. The release-notes file is La Fabrique's format, written by La Fabrique's
  release-notes tool, the same in all its projects (`scripts/fabrique/release-notes.js`, declared in
  `.fabrique.json` > `version.outil`; a copy of La Fabrique's `kit/release-notes.js`, never edited
  here: an update is copied over it):
  - merging (`.github/workflows/merge.yml`, La Fabrique's « Merge ») rebuilds the file from `master`'s
    with the pull request's entries on top, still `next`: never a conflict on that file. A conflict on
    it when bringing a branch up to date is solved with the tool, never by hand:
    `node scripts/fabrique/release-notes.js merge <base> <branch> <master> docs/release-notes.json --mode next`
    (the three versions from `git show`);
  - closing the sprint (`.github/workflows/release.yml`, La Fabrique's « Close the sprint ») turns the
    `next` entries of the stories done into one version `0.N`, dated and timed (Paris), and sets
    `package.json` > `version`.
- The build writes `version.json`, and the splash screen shows the version, from the first released
  entry (with `date` and `heure`); `package.json` > `version` follows (`0.N.0`), set by the release.
- Never skip or disable a failing test: say so in the pull request.
- Never write a secret's value in the repository.

## Documentation

- [docs/tech-overview.md](docs/tech-overview.md): architecture and services.
- [docs/curve-assist-notes.md](docs/curve-assist-notes.md): curve detection notes.
- `meta/`: refactoring notes (in French).
