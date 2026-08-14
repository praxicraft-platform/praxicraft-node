import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";

export class WebhooksResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>) {
    return this.client.get("/webhooks/", { params });
  }

  create(args: {
    url: string;
    events: string[];
    [key: string]: unknown;
  }) {
    const { url, events, ...extra } = args;
    if (!String(url ?? "").trim()) throw new Error("url is required");
    if (!events?.length) throw new Error("events must be a non-empty list");
    return this.client.post("/webhooks/create/", {
      json: { url, events, ...extra },
    });
  }

  retrieve(webhookId: string) {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.get(`/webhooks/${key}/`);
  }

  update(webhookId: string, fields: Record<string, unknown>) {
    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("update() requires at least one field to change");
    }
    const key = pathSegment(webhookId, "webhookId");
    return this.client.patch(`/webhooks/${key}/`, { json: fields });
  }

  delete(webhookId: string) {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.delete(`/webhooks/${key}/`);
  }

  deliveries(webhookId: string) {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.get(`/webhooks/${key}/deliveries/`);
  }

  test(webhookId: string) {
    const key = pathSegment(webhookId, "webhookId");
    return this.client.post(`/webhooks/${key}/test/`);
  }
}
