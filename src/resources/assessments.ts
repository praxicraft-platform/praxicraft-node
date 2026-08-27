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

  listTasks(assessment: string, params?: Record<string, unknown>): Promise<Page> {
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/tasks/`, { params }) as Promise<Page>;
  }

  attachTasks(
    assessment: string,
    args: {
      tasks?: Record<string, unknown>[];
      task_id?: string;
      source?: string;
      [key: string]: unknown;
    },
  ): Promise<Record<string, unknown>> {
    const { tasks, ...rest } = args;
    const body: Record<string, unknown> = { ...rest };
    if (tasks !== undefined) body.tasks = tasks;
    if (Object.keys(body).length === 0) {
      throw new Error("attachTasks() requires tasks or task_id");
    }
    const key = pathSegment(assessment, "assessment");
    return this.client.post(`/assessments/${key}/tasks/attach/`, { json: body }) as Promise<
      Record<string, unknown>
    >;
  }

  replaceTasks(
    assessment: string,
    tasks: Record<string, unknown>[],
    extra: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const key = pathSegment(assessment, "assessment");
    return this.client.put(`/assessments/${key}/tasks/replace/`, {
      json: { tasks, ...extra },
    }) as Promise<Record<string, unknown>>;
  }

  removeTask(assessment: string, assessmentTaskId: string): Promise<null> {
    const key = pathSegment(assessment, "assessment");
    const taskId = String(assessmentTaskId).trim();
    if (!taskId) {
      throw new Error("assessmentTaskId must be a non-empty string");
    }
    return this.client.delete(`/assessments/${key}/tasks/remove/`, {
      json: { assessment_task_id: taskId },
    }) as Promise<null>;
  }
}
