import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";
import type { Invite, Page } from "../types.js";

export class InvitesResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>): Promise<Page<Invite>> {
    return this.client.get("/invites/", { params }) as Promise<Page<Invite>>;
  }

  retrieve(inviteToken: string): Promise<Invite> {
    const token = pathSegment(inviteToken, "inviteToken");
    return this.client.get(`/invites/${token}/`) as Promise<Invite>;
  }

  create(
    assessment: string,
    args: {
      email: string;
      name?: string;
      role?: string;
      expires_days?: number;
      send_email?: boolean;
      [key: string]: unknown;
    },
  ): Promise<Invite> {
    const { email, name, role, expires_days, send_email, ...extra } = args;
    if (!String(email ?? "").trim()) {
      throw new Error("email is required");
    }
    const body: Record<string, unknown> = { email, ...extra };
    if (name !== undefined) body.name = name;
    if (role !== undefined) body.role = role;
    if (expires_days !== undefined) body.expires_days = expires_days;
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(assessment, "assessment");
    return this.client.post(`/assessments/${key}/invites/`, { json: body }) as Promise<Invite>;
  }

  bulkCreate(
    assessment: string,
    candidates: Record<string, unknown>[],
    args: { send_email?: boolean; [key: string]: unknown } = {},
  ): Promise<Record<string, unknown>> {
    const { send_email, ...extra } = args;
    const body: Record<string, unknown> = { candidates, ...extra };
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(assessment, "assessment");
    return this.client.post(`/assessments/${key}/invites/bulk/`, { json: body }) as Promise<
      Record<string, unknown>
    >;
  }

  remind(inviteToken: string): Promise<Invite> {
    const token = pathSegment(inviteToken, "inviteToken");
    return this.client.post(`/invites/${token}/remind/`) as Promise<Invite>;
  }

  cancel(inviteToken: string): Promise<null> {
    const token = pathSegment(inviteToken, "inviteToken");
    return this.client.delete(`/invites/${token}/`) as Promise<null>;
  }
}
