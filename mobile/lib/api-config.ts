/**
 * Base URLs for the two backends the app talks to.
 *
 * They live here rather than in either client because `lib/session` needs the
 * Node API's URL to refresh a token, and `lib/api` needs `lib/session` — so
 * keeping the constant in `lib/api` would make the two modules import each
 * other in a cycle.
 */

/** The Node API (`server/`): accounts, doctors, records. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

/** The Python medical assistant (`CureliynkMedical/backend`). */
export const MEDICAL_API_BASE_URL =
  process.env.EXPO_PUBLIC_MEDICAL_API_BASE_URL ?? "http://localhost:8000";
