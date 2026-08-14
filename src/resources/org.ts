import type { Client } from "../client.js";

export class OrgResource {
  constructor(private readonly client: Client) {}

  /** `GET /org/` — workspace summary (plan + invite quota). */
  retrieve() {
    return this.client.get("/org/");
  }

  /** `GET /org/stats/` — aggregate hiring analytics. */
  stats(params?: Record<string, unknown>) {
    return this.client.get("/org/stats/", { params });
  }
}
