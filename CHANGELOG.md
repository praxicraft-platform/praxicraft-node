# Changelog

## [0.1.0] — 2026-08-14

### Added

- Initial `@praxicraft/assess` Node.js / TypeScript SDK for the Assess Public API.
- `Client` with Bearer API-key auth (`PRAXICRAFT_API_KEY` / `PRAXICRAFT_API_BASE_URL`).
- Typed errors mapped from the Public API `{ error: { code, message } }` envelope.
- Resources: `org`, `assessments`, `invites`, `results`, `webhooks`, `pipelines`.
- Local helper `verifySignature` for `X-Praxicraft-Signature`.
- CI on Node 18/20/22 and tag-triggered npm publish from `main`.
