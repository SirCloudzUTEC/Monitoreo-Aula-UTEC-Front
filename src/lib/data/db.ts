// Shared Neon client. Returns null when DATABASE_URL isn't configured so
// every caller can degrade honestly instead of throwing (phase 1: the
// database is optional in every environment except where writes matter).

import { neon } from "@neondatabase/serverless";

export function db() {
  const url = process.env.DATABASE_URL;
  return url && url.trim().length > 0 ? neon(url) : null;
}
