import type { Client } from "../client.js";
import type { Org } from "../types.js";

export class OrgResource {
  constructor(private readonly client: Client) {}

  /** `GET /org/` — workspace summary (plan + invite quota). */
  retrieve(): Promise<Org> {
    return this.client.get("/org/") as Promise<Org>;
  }

  /** `GET /org/stats/` — aggregate hiring analytics. */
  stats(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.client.get("/org/stats/", { params }) as Promise<
      Record<string, unknown>
    >;
  }
}
