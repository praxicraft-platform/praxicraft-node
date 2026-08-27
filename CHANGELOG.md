# Changelog

## 1.0.0

### Breaking

- Rename assessment task methods from `listCases` / `attachCases` / `replaceCases` / `removeCase` to `listTasks` / `attachTasks` / `replaceTasks` / `removeTask`.
- Wire paths use `/tasks/` instead of `/cases/`; JSON keys use `tasks`, `task_id`, and `assessment_task_id`.

## 0.1.2

- ci: auto-bump releases with GitHub Release + package publish
- Add GitHub Release publishing to the Publish workflow.
- Update API reference link in README

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
