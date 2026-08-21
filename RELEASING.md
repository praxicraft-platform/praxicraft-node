# Releasing

Maintainer notes for publishing `@praxicraft/assess` to npm.

## How publish works

[`.github/workflows/publish.yml`](.github/workflows/publish.yml) runs on pushes to **`main`** when:

- `src/**`
- `package.json`
- `CHANGELOG.md`
- `.github/workflows/publish.yml`

Flow:

1. Run tests on Node 18 / 20 / 22.
2. Read `version` from `package.json` (must match `src/version.ts`).
3. If git tag `v{version}` already exists → skip publish.
4. Otherwise create + push `v{version}`, build, `npm publish --access public --provenance`.

## Cut a release

1. Bump `version` in `package.json` and `src/version.ts`.
2. Update `CHANGELOG.md`.
3. Merge to `main`.

## One-time npm setup

1. Create the npm org / scope [`@praxicraft`](https://www.npmjs.com/) (or ensure you can publish under it).
2. Create GitHub Environment **`npm`** on `praxicraft-platform/praxicraft-node` (optional required reviewers).
3. Prefer **Trusted Publishing** on npm for this repo + workflow `publish.yml` + environment `npm`.  
   Or set repository secret `NPM_TOKEN` (granular automation token with publish access) as a fallback — the workflow uses OIDC provenance when configured.
4. Merge a version bump to `main` for the first release.

## GitHub Release

The Publish workflow also creates a **GitHub Release** for tag `v{version}` (with generated notes and package assets where applicable).

You can run **Actions → Publish → Run workflow** manually (`workflow_dispatch`) after bumping the version on `main`.
