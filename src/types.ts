/** Typed Public API response shapes. */

export type Org = {
  id?: string;
  name?: string;
  slug?: string;
  plan?: string;
  invites_remaining?: number;
  invites_used?: number;
  invites_limit?: number;
};

export type Assessment = {
  id?: string;
  slug?: string;
  title?: string;
  status?: string;
};

/** Invite create responses use `invite_token` (not `token`). */
export type Invite = {
  id?: string;
  invite_token?: string;
  invite_url?: string;
  email?: string;
  name?: string;
  status?: string;
  assessment?: string;
};

export type ResultRow = {
  invite_token?: string;
  email?: string;
  name?: string;
  status?: string;
  score?: number;
  passed?: boolean;
};

export type WebhookEndpoint = {
  id?: string;
  url?: string;
  events?: string[];
  is_active?: boolean;
  secret_key?: string;
};

export type Pipeline = {
  id?: string;
  slug?: string;
  name?: string;
  status?: string;
};

export type Enrollment = {
  enrollment_id?: string;
  id?: string;
  email?: string;
  name?: string;
  status?: string;
};

export type Page<T = unknown> = {
  results?: T[];
  next?: string | null;
  previous?: string | null;
  next_cursor?: string | null;
  count?: number;
};
