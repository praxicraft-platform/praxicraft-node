import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";

export class AssessmentsResource {
  constructor(private readonly client: Client) {}

  list(params?: Record<string, unknown>) {
    return this.client.get("/assessments/", { params });
  }

  retrieve(assessment: string) {
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/`);
  }

  create(fields: Record<string, unknown>) {
    return this.client.post("/assessments/create/", { json: fields });
  }

  update(assessment: string, fields: Record<string, unknown>) {
    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("update() requires at least one field to change");
    }
    const key = pathSegment(assessment, "assessment");
    return this.client.patch(`/assessments/${key}/update/`, { json: fields });
  }

  activate(assessment: string) {
    return this.update(assessment, { status: "active" });
  }

  listCases(assessment: string, params?: Record<string, unknown>) {
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/cases/`, { params });
  }

  attachCases(
    assessment: string,
    args: {
      cases?: Record<string, unknown>[];
      case_id?: string;
      source?: string;
      [key: string]: unknown;
    },
  ) {
    const { cases, ...rest } = args;
    const body: Record<string, unknown> = { ...rest };
    if (cases !== undefined) body.cases = cases;
    if (Object.keys(body).length === 0) {
      throw new Error("attachCases() requires cases or case_id");
    }
    const key = pathSegment(assessment, "assessment");
    return this.client.post(`/assessments/${key}/cases/attach/`, { json: body });
  }

  replaceCases(
    assessment: string,
    cases: Record<string, unknown>[],
    extra: Record<string, unknown> = {},
  ) {
    const key = pathSegment(assessment, "assessment");
    return this.client.put(`/assessments/${key}/cases/replace/`, {
      json: { cases, ...extra },
    });
  }

  removeCase(assessment: string, assessmentCaseId: string) {
    const key = pathSegment(assessment, "assessment");
    const caseId = String(assessmentCaseId).trim();
    if (!caseId) {
      throw new Error("assessmentCaseId must be a non-empty string");
    }
    return this.client.delete(`/assessments/${key}/cases/remove/`, {
      json: { assessment_case_id: caseId },
    });
  }
}
