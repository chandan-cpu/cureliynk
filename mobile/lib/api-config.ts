/**
 * Base URLs for the two backends the app talks to.
 *
 * They live here rather than in either client because `lib/session` needs the
 * Node API's URL to refresh a token, and `lib/api` needs `lib/session` — so
 * keeping the constant in `lib/api` would make the two modules import each
 * other in a cycle.
 *
 * Where the values come from depends on the build:
 *
 *   - development  `mobile/.env` — normally a LAN IP, so a phone on the same
 *                  network can reach a server running on the laptop.
 *   - preview /    `eas.json`'s per-profile `env` block, which overrides
 *     production   `.env` at build time. This is what keeps a developer's LAN
 *                  address out of a build that leaves the building.
 */

/** The Node API (`server/`): accounts, doctors, records. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

/** The Python medical assistant (`CureliynkMedical/backend`). */
export const MEDICAL_API_BASE_URL =
  process.env.EXPO_PUBLIC_MEDICAL_API_BASE_URL ?? "http://localhost:8000";

/** Still carrying the placeholder from eas.json — nobody filled it in. */
function isUnconfiguredPlaceholder(url: string): boolean {
  return url.includes("REPLACE-ME");
}

/**
 * An address that resolves only on the machine, or the network, it was built
 * on. A release build carrying one of these is the failure mode worth
 * catching: the bundle exports fine, the APK installs, and every request fails
 * for every user who is not sitting on the developer's network.
 */
function isLocalAddress(url: string): boolean {
  return (
    /\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) ||
    // RFC 1918 private ranges: 10/8, 192.168/16, 172.16-31/12.
    /\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)
  );
}

// `__DEV__` is false in a release bundle, and `expo export` builds one — it
// evaluates this module while prerendering the web output — so this block runs
// on an ordinary local export as well as on a real release build. Hence the
// split: an unreplaced placeholder is a configuration error nobody meant to
// ship and stops the build, while a LAN address is the normal development
// value and only warns, so exporting locally still works.
if (!__DEV__) {
  const entries: [string, string][] = [
    ["EXPO_PUBLIC_API_BASE_URL", API_BASE_URL],
    ["EXPO_PUBLIC_MEDICAL_API_BASE_URL", MEDICAL_API_BASE_URL],
  ];

  const format = (bad: [string, string][]) =>
    bad.map(([name, url]) => `  ${name}=${url}`).join("\n");

  const placeholders = entries.filter(([, url]) => isUnconfiguredPlaceholder(url));

  if (placeholders.length) {
    throw new Error(
      `This build still has the placeholder API URLs from eas.json:\n${format(placeholders)}\n` +
        `Replace them with the deployed HTTPS URLs in the matching build profile.`,
    );
  }

  const local = entries.filter(([, url]) => isLocalAddress(url));

  if (local.length) {
    console.warn(
      `[api-config] Release bundle points at a local address — it will fail for ` +
        `anyone off this network:\n${format(local)}\n` +
        `Fine for a local export; set the deployed HTTPS URLs in eas.json before ` +
        `building anything you hand out.`,
    );
  }
}
