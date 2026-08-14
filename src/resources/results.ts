import type { Client } from "../client.js";
import { pathSegment } from "../paths.js";
import type { Page, ResultRow } from "../types.js";

const MAX_RESULT_PAGES = 10_000;

export class ResultsResource {
  constructor(private readonly client: Client) {}

  list(
    assessment: string,
    args: {
      cursor?: string;
      page_size?: number;
      params?: Record<string, unknown>;
    } = {},
  ): Promise<Page<ResultRow>> {
    const query: Record<string, unknown> = { ...(args.params ?? {}) };
    if (args.cursor !== undefined) query.cursor = args.cursor;
    if (args.page_size !== undefined) query.page_size = args.page_size;
    const key = pathSegment(assessment, "assessment");
    return this.client.get(`/assessments/${key}/results/`, { params: query }) as Promise<
      Page<ResultRow>
    >;
  }

  retrieve(inviteToken: string): Promise<ResultRow> {
    const token = pathSegment(inviteToken, "inviteToken");
    return this.client.get(`/invites/${token}/result/`) as Promise<ResultRow>;
  }

  async *iterAll(
    assessment: string,
    args: { page_size?: number; params?: Record<string, unknown> } = {},
  ): AsyncGenerator<ResultRow, void, unknown> {
    let cursor: string | undefined;
    const seen = new Set<string>();

    for (let i = 0; i < MAX_RESULT_PAGES; i += 1) {
      const page = await this.list(assessment, {
        cursor,
        page_size: args.page_size,
        params: args.params,
      });
      if (!page || typeof page !== "object") return;

      if (Array.isArray(page.results)) {
        for (const row of page.results) yield row;
      }

      const nextCursor = nextCursorFromPage(page);
      if (!nextCursor) return;
      if (seen.has(nextCursor)) return;
      seen.add(nextCursor);
      cursor = nextCursor;
    }
  }
}

function nextCursorFromPage(page: Page<ResultRow>): string | undefined {
  if (typeof page.next_cursor === "string" && page.next_cursor) {
    return page.next_cursor;
  }
  const nextLink = page.next;
  if (typeof nextLink !== "string" || !nextLink) return undefined;
  try {
    const url = new URL(nextLink);
    return url.searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}
