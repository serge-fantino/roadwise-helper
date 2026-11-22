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
- Each pull request adds or completes its entry in `docs/release-notes.json` (newest first: `version`
  `0.N`, `date`, `heure`, `titre`, `changements` in plain words for the driver, `stories` with the
  issue numbers, `liens`). An entry without `heure` is not released; it gets its date and time when it
  reaches `master`.
- The build writes `version.json`, and the splash screen shows the version, from the first released
  entry; `package.json` > `version` follows (`0.N.0`).
- Never skip or disable a failing test: say so in the pull request.
- Never write a secret's value in the repository.

## Documentation

- [docs/tech-overview.md](docs/tech-overview.md): architecture and services.
- [docs/curve-assist-notes.md](docs/curve-assist-notes.md): curve detection notes.
- `meta/`: refactoring notes (in French).
