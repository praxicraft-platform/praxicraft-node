import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";

export class PipelinesResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>) {
    return this.client.get("/pipelines/", { params });
  }

  retrieve(pipeline: string) {
    const key = pathSegment(pipeline, "pipeline");
    return this.client.get(`/pipelines/${key}/`);
  }

  enroll(
    pipeline: string,
    args: {
      email: string;
      name?: string;
      send_email?: boolean;
      [key: string]: unknown;
    },
  ) {
    const { email, name, send_email, ...extra } = args;
    if (!String(email ?? "").trim()) throw new Error("email is required");
    const body: Record<string, unknown> = { email, ...extra };
    if (name !== undefined) body.name = name;
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(pipeline, "pipeline");
    return this.client.post(`/pipelines/${key}/enroll/`, { json: body });
  }

  bulkEnroll(
    pipeline: string,
    candidates: Record<string, unknown>[],
    args: { send_email?: boolean; [key: string]: unknown } = {},
  ) {
    const { send_email, ...extra } = args;
    const body: Record<string, unknown> = { candidates, ...extra };
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(pipeline, "pipeline");
    return this.client.post(`/pipelines/${key}/enroll/bulk/`, { json: body });
  }

  listEnrollments(pipeline: string, params?: Record<string, unknown>) {
    const key = pathSegment(pipeline, "pipeline");
    return this.client.get(`/pipelines/${key}/enrollments/`, { params });
  }

  getEnrollment(enrollmentId: string) {
    const key = pathSegment(enrollmentId, "enrollmentId");
    return this.client.get(`/pipelines/enrollments/${key}/`);
  }
}
