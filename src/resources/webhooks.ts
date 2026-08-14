import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";
import type { Page, WebhookEndpoint } from "../types.js";

export class WebhooksResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>): Promise<Page<WebhookEndpoint>> {
    return this.client.get("/webhooks/", { params }) as Promise<Page<WebhookEndpoint>>;
  }

  create(args: {
    url: string;
    events: string[];
    [key: string]: unknown;
  }): Promise<WebhookEndpoint> {
    const { url, events, ...extra } = args;
    if (!String(url ?? "").trim()) throw new Error("url is required");
    if (!events?.length) throw new Error("events must be a non-empty list");
    return this.client.post("/webhooks/create/", {
      json: { url, events, ...extra },
    }) as Promise<WebhookEndpoint>;
  }

  retrieve(webhookId: string): Promise<WebhookEndpoint> {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.get(`/webhooks/${key}/`) as Promise<WebhookEndpoint>;
  }

  update(webhookId: string, fields: Record<string, unknown>): Promise<WebhookEndpoint> {
    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("update() requires at least one field to change");
    }
    const key = pathSegment(webhookId, "webhookId");
    return this.client.patch(`/webhooks/${key}/`, { json: fields }) as Promise<WebhookEndpoint>;
  }

  delete(webhookId: string): Promise<null> {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.delete(`/webhooks/${key}/`) as Promise<null>;
  }

  deliveries(webhookId: string): Promise<Record<string, unknown>> {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.get(`/webhooks/${key}/deliveries/`) as Promise<Record<string, unknown>>;
  }

  test(webhookId: string): Promise<Record<string, unknown>> {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.post(`/webhooks/${key}/test/`) as Promise<Record<string, unknown>>;
  }
}
