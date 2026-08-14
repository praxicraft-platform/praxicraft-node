import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";
import type { Assessment, Page } from "../types.js";

export class AssessmentsResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>): Promise<Page<Assessment>> {
    return this.client.get("/assessments/", { params }) as Promise<Page<Assessment>>;
  }

  retrieve(assessment: string): Promise<Assessment> {
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/`) as Promise<Assessment>;
  }

  create(fields: Record<string, unknown>): Promise<Assessment> {
    return this.client.post("/assessments/create/", { json: fields }) as Promise<Assessment>;
  }

  update(assessment: string, fields: Record<string, unknown>): Promise<Assessment> {
    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("update() requires at least one field to change");
    }
    const key = pathSegment(assessment, "assessment");
    return this.client.patch(`/assessments/${key}/update/`, { json: fields }) as Promise<Assessment>;
  }

  activate(assessment: string): Promise<Assessment> {
    return this.update(assessment, { status: "active" });
  }

  listCases(assessment: string, params?: Record<string, unknown>): Promise<Page> {
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/cases/`, { params }) as Promise<Page>;
  }

  attachCases(
    assessment: string,
    args: {
      cases?: Record<string, unknown>[];
      case_id?: string;
      source?: string;
      [key: string]: unknown;
    },
  ): Promise<Record<string, unknown>> {
    const { cases, ...rest } = args;
    const body: Record<string, unknown> = { ...rest };
    if (cases !== undefined) body.cases = cases;
    if (Object.keys(body).length === 0) {
      throw new Error("attachCases() requires cases or case_id");
    }
    const key = pathSegment(assessment, "assessment");
    return this.client.post(`/assessments/${key}/cases/attach/`, { json: body }) as Promise<
      Record<string, unknown>
    >;
  }

  replaceCases(
    assessment: string,
    cases: Record<string, unknown>[],
    extra: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const key = pathSegment(assessment, "assessment");
    return this.client.put(`/assessments/${key}/cases/replace/`, {
      json: { cases, ...extra },
    }) as Promise<Record<string, unknown>>;
  }

  removeCase(assessment: string, assessmentCaseId: string): Promise<null> {
    const key = pathSegment(assessment, "assessment");
    const caseId = String(assessmentCaseId).trim();
    if (!caseId) {
      throw new Error("assessmentCaseId must be a non-empty string");
    }
    return this.client.delete(`/assessments/${key}/cases/remove/`, {
      json: { assessment_case_id: caseId },
    }) as Promise<null>;
  }
}
