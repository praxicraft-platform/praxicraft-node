# Praxicraft Assess Node SDK

Official Node.js / TypeScript client for the **[Praxicraft Assess](https://assess.praxicraft.com)** Public API.

Use it to invite candidates, check invite quota, manage webhooks, enroll hiring pipelines, and fetch results from your ATS, backend, or automation scripts.

```bash
npm install @praxicraft/assess
```

**Requires Node.js 18+.** Full API reference: [https://docs.praxicraft.com](https://docs.praxicraft.com/sdks/node)

## Table of Contents

- [Authentication](#authentication)
- [Quickstart](#quickstart)
- [What you can do](#what-you-can-do)
  - [Check invite quota before bulk sends](#check-invite-quota-before-bulk-sends)
  - [Register and test a webhook](#register-and-test-a-webhook)
  - [Verify webhook signatures](#verify-webhook-signatures)
  - [Paginate cohort results](#paginate-cohort-results)
- [Errors](#errors)
- [Requirements & support](#requirements--support)
- [License](#license)

---

## Authentication

Create an organisation API key in Assess:

**Assess → Developer → API Keys** → create key → copy `ct_live_…` (shown once).

```bash
export PRAXICRAFT_API_KEY="ct_live_xxxxxxxxxxxxxxxx"
```

Or pass the key when constructing the client:

```ts
import { Client } from "@praxicraft/assess";

const client = new Client({ apiKey: "ct_live_xxxxxxxxxxxxxxxx" });
```

Optional: override the API host with `PRAXICRAFT_API_BASE_URL` or `new Client({ baseUrl })`.
Default host: `https://assess.praxicraft.com`.

Never commit API keys. Prefer environment variables or a secrets manager.

Scopes and rotation: [Authentication](https://docs.praxicraft.com/authentication)

---

## Quickstart

```ts
import { Client } from "@praxicraft/assess";

const client = new Client(); // reads PRAXICRAFT_API_KEY

const page = (await client.assessments.list()) as { results: Array<{ slug: string; status: string }> };
for (const assessment of page.results) {
  console.log(assessment.slug, assessment.status);
}

// Invite a candidate (idempotent on email — safe to retry)
const invite = (await client.invites.create("senior-backend-screen", {
  email: "candidate@example.com",
  name: "Jane Doe",
  send_email: true,
})) as { invite_token: string; invite_url?: string };

console.log(invite.invite_token, invite.invite_url);

const result = await client.results.retrieve(invite.invite_token);
console.log(result);
```

Responses are **flat JSON** (same shape as the Public API — no `{ data: … }` wrapper).

---

## What you can do

| Resource | Common methods |
|----------|----------------|
| `client.org` | `retrieve()`, `stats()` |
| `client.assessments` | `list()`, `retrieve()`, `create()`, `update()`, `activate()`, `listTasks()`, `attachTasks()`, `replaceTasks()`, `removeTask()` |
| `client.invites` | `create()`, `bulkCreate()`, `list()`, `retrieve()`, `remind()`, `cancel()` |
| `client.results` | `list()`, `retrieve()`, `iterAll()` |
| `client.webhooks` | `list()`, `create()`, `retrieve()`, `update()`, `delete()`, `test()`, `deliveries()` |
| `client.pipelines` | `list()`, `retrieve()`, `enroll()`, `bulkEnroll()`, `listEnrollments()`, `getEnrollment()` |
| `verifySignature` | Verify `X-Praxicraft-Signature` on webhook payloads |

All paths target `/api/v1/public/…` on the Assess host.

### Check invite quota before bulk sends

```ts
const org = (await client.org.retrieve()) as { invites_remaining?: number };
if ((org.invites_remaining ?? 0) < candidates.length) {
  throw new Error("Not enough invites remaining this month");
}
```

### Register and test a webhook

```ts
const hook = (await client.webhooks.create({
  url: "https://example.com/hooks/praxicraft",
  events: ["assessment.completed", "candidate.passed"],
})) as { id: string; secret_key: string };

// Store hook.secret_key (whsec_…) — shown once
await client.webhooks.test(hook.id);
await client.webhooks.update(hook.id, { is_active: true });
```

### Verify webhook signatures

```ts
import { verifySignature } from "@praxicraft/assess";

function handleWebhook(rawBody: Buffer, signatureHeader: string, secret: string) {
  return verifySignature(secret, rawBody, signatureHeader);
}
```

Header format: `X-Praxicraft-Signature: sha256=<hex>`

Event catalog: [Webhooks](https://docs.praxicraft.com/webhooks)

### Paginate cohort results

```ts
for await (const row of client.results.iterAll("senior-backend-screen", { page_size: 50 })) {
  console.log(row);
}
```

---

## Errors

Branch on `error.code` (stable), not the message text:

```ts
import {
  AuthenticationError,
  InsufficientScopeError,
  RateLimitError,
  ValidationError,
} from "@praxicraft/assess";

try {
  await client.invites.create("demo", { email: "candidate@example.com" });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code, err.details);
  } else if (err instanceof InsufficientScopeError) {
    console.log(err.code, err.requiredPlan);
  } else if (err instanceof AuthenticationError) {
    console.log(err.code);
  } else if (err instanceof RateLimitError) {
    console.log(err.retryAfter);
  } else {
    throw err;
  }
}
```

Error codes: [Errors](https://docs.praxicraft.com/errors)

---

## Requirements & support

- Node.js **18+** (native `fetch`)
- Product docs: [docs.praxicraft.com](https://docs.praxicraft.com)
- Issues: [GitHub Issues](https://github.com/praxicraft-platform/praxicraft-node/issues)

---

## License

[MIT](LICENSE)
