import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIConnectionError,
  APIError,
  APIStatusError,
  AuthenticationError,
  Client,
  InsufficientScopeError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  verifySignature,
} from "../src/index.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  const { setSleepFn } = await import("../src/retry.js");
  setSleepFn(async () => {});
});

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("Client auth", () => {
  it("rejects missing api key", () => {
    const prev = process.env.PRAXICRAFT_API_KEY;
    delete process.env.PRAXICRAFT_API_KEY;
    expect(() => new Client()).toThrow(APIError);
    if (prev !== undefined) process.env.PRAXICRAFT_API_KEY = prev;
  });

  it("rejects blank api key", () => {
    expect(() => new Client({ apiKey: "   " })).toThrow(APIError);
  });
});

describe("HTTP + errors", () => {
  it("returns flat JSON on success", async () => {
    mockFetch(async () => jsonResponse(200, { name: "Acme", plan: "starter" }));
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.org.retrieve()).resolves.toEqual({ name: "Acme", plan: "starter" });
  });

  it("maps 401", async () => {
    mockFetch(async () =>
      jsonResponse(401, { error: { code: "INVALID_API_KEY", message: "bad key" } }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.org.retrieve()).rejects.toMatchObject({
      name: "AuthenticationError",
      code: "INVALID_API_KEY",
      statusCode: 401,
    });
  });

  it("maps 403 and required_plan", async () => {
    mockFetch(async () =>
      jsonResponse(403, {
        error: {
          code: "PLAN_REQUIRED",
          message: "Starter required",
          required_plan: "starter",
        },
      }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    try {
      await client.org.stats();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientScopeError);
      expect((err as InsufficientScopeError).requiredPlan).toBe("starter");
    }
  });

  it("maps 429 retry-after", async () => {
    mockFetch(async () =>
      jsonResponse(
        429,
        { error: { code: "RATE_LIMITED", message: "slow down" } },
        { "Retry-After": "12" },
      ),
    );
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 0,
    });
    try {
      await client.assessments.list();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(12);
    }
  });

  it("maps HTML 502 to status error", async () => {
    mockFetch(async () => new Response("<html>Bad Gateway</html>", { status: 502 }));
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 0,
    });
    await expect(client.org.retrieve()).rejects.toBeInstanceOf(APIStatusError);
  });

  it("maps validation errors", async () => {
    mockFetch(async () =>
      jsonResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "invalid",
          details: { email: "bad" },
        },
      }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(
      client.invites.create("demo", { email: "x@example.com" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps 404", async () => {
    mockFetch(async () =>
      jsonResponse(404, { error: { code: "NOT_FOUND", message: "missing" } }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.assessments.retrieve("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("preserves Authorization even if caller tries to override headers", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer ct_live_test");
      expect(headers.get("User-Agent")).toMatch(/^praxicraft-node\//);
      return jsonResponse(200, { ok: true });
    });
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await client.request("GET", "/org/", {
      headers: { Authorization: "Bearer stolen", "User-Agent": "evil" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns null for 204", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.invites.cancel("11111111-1111-1111-1111-111111111111")).resolves.toBeNull();
  });

  it("instanceof works for AuthenticationError", async () => {
    mockFetch(async () =>
      jsonResponse(401, { error: { code: "EXPIRED_API_KEY", message: "expired" } }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.org.retrieve()).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("resources", () => {
  it("invites with invite_token field", async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      expect(init?.method).toBe("POST");
      return jsonResponse(201, {
        invite_token: "11111111-1111-1111-1111-111111111111",
        status: "pending",
      });
    });
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    const invite = (await client.invites.create("demo", {
      email: "jane@example.com",
      send_email: true,
    })) as { invite_token: string };
    expect(invite.invite_token).toContain("11111111");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/assessments/demo/invites/");
  });

  it("encodes path segments", async () => {
    mockFetch(async (url) => {
      expect(String(url)).toContain("/assessments/a%2Fb/");
      return jsonResponse(200, { slug: "a/b" });
    });
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await client.assessments.retrieve("a/b");
  });

  it("rejects empty assessment slug", async () => {
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    expect(() => client.assessments.retrieve("  ")).toThrow(/non-empty/);
  });

  it("rejects empty invite email client-side", async () => {
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    expect(() => client.invites.create("demo", { email: "  " })).toThrow(/email is required/);
  });

  it("rejects empty webhook update", async () => {
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    expect(() => client.webhooks.update("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", {})).toThrow(
      /at least one field/,
    );
  });

  it("activates assessment", async () => {
    mockFetch(async (_url, init) => {
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(String(init?.body))).toEqual({ status: "active" });
      return jsonResponse(200, { status: "active" });
    });
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    await expect(client.assessments.activate("demo")).resolves.toEqual({ status: "active" });
  });

  it("enrolls pipeline candidate", async () => {
    mockFetch(async () =>
      jsonResponse(201, {
        enrollment_id: "11111111-1111-1111-1111-111111111111",
        status: "in_progress",
      }),
    );
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    const row = (await client.pipelines.enroll("grad-2025", {
      email: "alex@example.com",
    })) as { enrollment_id: string };
    expect(row.enrollment_id).toBeTruthy();
  });

  it("iterAll follows cursor and stops on repeats", async () => {
    let calls = 0;
    mockFetch(async (url) => {
      calls += 1;
      const href = String(url);
      if (!href.includes("cursor=")) {
        return jsonResponse(200, {
          next: "https://assess.example.com/api/v1/public/assessments/demo/results/?cursor=stuck",
          results: [{ email: "a@example.com" }],
        });
      }
      return jsonResponse(200, {
        next: "https://assess.example.com/api/v1/public/assessments/demo/results/?cursor=stuck",
        results: [{ email: "b@example.com" }],
      });
    });
    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });
    const rows: unknown[] = [];
    for await (const row of client.results.iterAll("demo")) {
      rows.push(row);
    }
    expect(rows).toEqual([{ email: "a@example.com" }, { email: "b@example.com" }]);
    expect(calls).toBe(2);
  });
});

describe("verifySignature", () => {
  it("accepts valid sha256 signature", () => {
    const secret = "whsec_test";
    const body = Buffer.from('{"event":"webhook.test"}');
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifySignature(secret, body, `sha256=${digest}`)).toBe(true);
  });

  it("accepts legacy hex", () => {
    const secret = "whsec_test";
    const body = Buffer.from("{}");
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifySignature(secret, body, digest)).toBe(true);
  });

  it("rejects mismatched length without throwing", () => {
    expect(verifySignature("whsec_x", Buffer.from("{}"), "sha256=ab")).toBe(false);
  });

  it("accepts utf8 string bodies", () => {
    const secret = "whsec_test";
    const body = '{"event":"webhook.test"}';
    const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifySignature(secret, body, `sha256=${digest}`)).toBe(true);
  });

  it("rejects non-body object inputs", () => {
    expect(verifySignature("whsec_x", { a: 1 } as unknown as Buffer, "sha256=ab")).toBe(false);
  });

  it("treats null/undefined body as empty payload", () => {
    const secret = "whsec_test";
    const digest = createHmac("sha256", secret).update(Buffer.alloc(0)).digest("hex");
    expect(verifySignature(secret, null, `sha256=${digest}`)).toBe(true);
    expect(verifySignature(secret, undefined, `sha256=${digest}`)).toBe(true);
  });
});

describe("retries", () => {
  it("retries 429 then succeeds", async () => {
    const { setSleepFn } = await import("../src/retry.js");
    setSleepFn(async () => {});
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(
          429,
          { error: { code: "RATE_LIMITED", message: "slow" } },
          { "Retry-After": "0" },
        );
      }
      return jsonResponse(200, { name: "Acme" });
    });
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 2,
    });
    await expect(client.org.retrieve()).resolves.toEqual({ name: "Acme" });
    expect(calls).toBe(2);
  });

  it("parses HTTP-date Retry-After on RateLimitError", async () => {
    const when = new Date(Date.now() + 2500).toUTCString();
    mockFetch(async () =>
      jsonResponse(
        429,
        { error: { code: "RATE_LIMITED", message: "slow" } },
        { "Retry-After": when },
      ),
    );
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 0,
    });
    try {
      await client.assessments.list();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      const ra = (err as RateLimitError).retryAfter;
      expect(ra).toBeTypeOf("number");
      expect(ra!).toBeGreaterThanOrEqual(0);
      expect(ra!).toBeLessThanOrEqual(5);
    }
  });

  it("does not retry validation errors", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return jsonResponse(400, {
        error: { code: "VALIDATION_ERROR", message: "bad" },
      });
    });
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 3,
    });
    await expect(
      client.invites.create("demo", { email: "x@example.com" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(calls).toBe(1);
  });
});

describe("connection errors", () => {
  it("wraps transport failures", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new Client({
      apiKey: "ct_live_test",
      baseUrl: "https://assess.example.com",
      maxRetries: 0,
    });
    await expect(client.org.retrieve()).rejects.toBeInstanceOf(APIConnectionError);
  });
});

describe("assessment tasks", () => {
  it("attach, list, replace, and remove tasks", async () => {
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });

      if (url.endsWith("/tasks/attach/")) {
        return jsonResponse(200, { attached: 1 });
      }
      if (url.endsWith("/tasks/") && method === "GET") {
        return jsonResponse(200, { results: [{ id: "row-1" }] });
      }
      if (url.endsWith("/tasks/replace/")) {
        return jsonResponse(200, { replaced: true });
      }
      if (url.endsWith("/tasks/remove/")) {
        return new Response(null, { status: 204 });
      }
      return jsonResponse(404, { error: { code: "NOT_FOUND", message: "missing" } });
    });

    const client = new Client({ apiKey: "ct_live_test", baseUrl: "https://assess.example.com" });

    await expect(
      client.assessments.attachTasks("demo", {
        tasks: [{ task_id: "task-1", source: "platform" }],
      }),
    ).resolves.toEqual({ attached: 1 });

    await expect(client.assessments.listTasks("demo")).resolves.toEqual({
      results: [{ id: "row-1" }],
    });

    await expect(
      client.assessments.replaceTasks("demo", [{ task_id: "task-2", source: "org" }]),
    ).resolves.toEqual({ replaced: true });

    await expect(client.assessments.removeTask("demo", "row-1")).resolves.toBeNull();

    expect(calls[0]).toMatchObject({
      method: "POST",
      body: { tasks: [{ task_id: "task-1", source: "platform" }] },
    });
    expect(calls[1].url).toContain("/assessments/demo/tasks/");
    expect(calls[2].body).toEqual({ tasks: [{ task_id: "task-2", source: "org" }] });
    expect(calls[3].body).toEqual({ assessment_task_id: "row-1" });
  });
});
