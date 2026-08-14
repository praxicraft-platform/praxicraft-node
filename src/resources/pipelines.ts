import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";
import type { Enrollment, Page, Pipeline } from "../types.js";

export class PipelinesResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>): Promise<Page<Pipeline>> {
    return this.client.get("/pipelines/", { params }) as Promise<Page<Pipeline>>;
  }

  retrieve(pipeline: string): Promise<Pipeline> {
    const key = pathSegment(pipeline, "pipeline");
    return this.client.get(`/pipelines/${key}/`) as Promise<Pipeline>;
  }

  enroll(
    pipeline: string,
    args: {
      email: string;
      name?: string;
      send_email?: boolean;
      [key: string]: unknown;
    },
  ): Promise<Enrollment> {
    const { email, name, send_email, ...extra } = args;
    if (!String(email ?? "").trim()) throw new Error("email is required");
    const body: Record<string, unknown> = { email, ...extra };
    if (name !== undefined) body.name = name;
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(pipeline, "pipeline");
    return this.client.post(`/pipelines/${key}/enroll/`, { json: body }) as Promise<Enrollment>;
  }

  bulkEnroll(
    pipeline: string,
    candidates: Record<string, unknown>[],
    args: { send_email?: boolean; [key: string]: unknown } = {},
  ): Promise<Record<string, unknown>> {
    const { send_email, ...extra } = args;
    const body: Record<string, unknown> = { candidates, ...extra };
    if (send_email !== undefined) body.send_email = send_email;
    const key = pathSegment(pipeline, "pipeline");
    return this.client.post(`/pipelines/${key}/enroll/bulk/`, { json: body }) as Promise<
      Record<string, unknown>
    >;
  }

  listEnrollments(pipeline: string, params?: Record<string, unknown>): Promise<Page<Enrollment>> {
    const key = pathSegment(pipeline, "pipeline");
    return this.client.get(`/pipelines/${key}/enrollments/`, { params }) as Promise<
      Page<Enrollment>
    >;
  }

  getEnrollment(enrollmentId: string): Promise<Enrollment> {
    const key = pathSegment(enrollmentId, "enrollmentId");
    return this.client.get(`/pipelines/enrollments/${key}/`) as Promise<Enrollment>;
  }
}
