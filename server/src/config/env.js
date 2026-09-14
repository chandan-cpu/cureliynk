/**
 * Boot-time environment check.
 *
 * Every value below is read far from startup — `JWT_SECRET` inside a token
 * helper, `MONGO_URL` inside the connection call — so a missing one used to
 * surface as a 500 on the first request that happened to need it, long after
 * the deploy looked healthy. Checking here turns that into a refusal to start,
 * which is the failure a deploy pipeline can actually see.
 */

/** Required in every environment. */
const REQUIRED = ["MONGO_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

/**
 * Required only in production. In development these degrade to a clear
 * per-feature error ("Google Maps API key is missing") rather than blocking
 * work on the parts of the app that do not need them.
 */
const REQUIRED_IN_PRODUCTION = ["ADMIN_SECRET_KEY", "GOOGLE_CLIENT_ID", "ALLOWED_ORIGINS"];

/**
 * A signing secret short enough to brute force is worse than no auth at all,
 * because it looks like auth. 32 characters of the generated hex that
 * `openssl rand -hex 32` produces is the floor.
 */
const MIN_SECRET_LENGTH = 32;

const SECRETS = ["JWT_SECRET", "JWT_REFRESH_SECRET", "ADMIN_SECRET_KEY"];

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Throws with every problem at once rather than one per restart.
 */
const validateEnv = () => {
    const problems = [];

    const required = isProduction() ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION] : REQUIRED;

    for (const key of required) {
        if (!process.env[key] || !String(process.env[key]).trim()) {
            problems.push(`${key} is not set`);
        }
    }

    for (const key of SECRETS) {
        const value = process.env[key];
        if (value && value.length < MIN_SECRET_LENGTH) {
            problems.push(`${key} is only ${value.length} characters; use at least ${MIN_SECRET_LENGTH}`);
        }
    }

    // Reusing one secret for both token types means a refresh token is
    // accepted anywhere an access token is — including by `authenticate`,
    // which would hand a 7-day token the access of a 15-minute one.
    if (
        process.env.JWT_SECRET &&
        process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET
    ) {
        problems.push("JWT_SECRET and JWT_REFRESH_SECRET must be different values");
    }

    if (problems.length) {
        throw new Error(
            `Invalid server environment:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
            `Copy server/.env.example to server/.env and fill these in.`
        );
    }
};

module.exports = { validateEnv, isProduction };
