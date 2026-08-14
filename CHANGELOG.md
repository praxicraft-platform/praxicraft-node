# Changelog

## [0.1.1] — 2026-08-14

### Changed

- Patch release so Publish can tag `v0.1.1` and ship to npm (`v0.1.0` already exists).

## [0.1.0] — 2026-08-14

### Added

- Initial `@praxicraft/assess` Node.js / TypeScript SDK for the Assess Public API.
- `Client` with Bearer API-key auth (`PRAXICRAFT_API_KEY` / `PRAXICRAFT_API_BASE_URL`).
- Automatic retries on `429` / `5xx` / transport errors (default `maxRetries: 2`), honouring numeric and HTTP-date `Retry-After`.
- Exported TypeScript response types (`Org`, `Assessment`, `Invite`, …).
- Typed errors mapped from the Public API `{ error: { code, message } }` envelope.
- Resources: `org`, `assessments`, `invites`, `results`, `webhooks`, `pipelines`.
- Local helper `verifySignature` for `X-Praxicraft-Signature` (`null`/`undefined` body = empty payload).
- CI on Node 18/20/22 and tag-triggered npm publish from `main`.
