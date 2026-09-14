const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { errorResponse } = require("../utils/response.utils");

/**
 * Per-caller request budgets.
 *
 * Three tiers, because the routes are not equally expensive to serve:
 *
 *   - `globalLimiter`    a ceiling on everything, so one client cannot
 *                        saturate the process.
 *   - `authLimiter`      credential endpoints. Without it, `POST /auth/login`
 *                        is an offline password guess run online, and
 *                        `POST /auth/register/admin` is a free guess at
 *                        ADMIN_SECRET_KEY on every request.
 *   - `expensiveLimiter` routes that spend money per call — chat hits Gemini,
 *                        /chat/doctors hits Google Places, /location hits
 *                        Nominatim (whose usage policy caps us at 1 req/s).
 *
 * The counters live in this process's memory, which is correct for the single
 * instance this runs on today. Behind more than one instance each enforces its
 * own share of the budget — move the window into Redis at that point.
 */

/**
 * Keys on the account when the caller is authenticated, and on the address
 * when they are not.
 *
 * The account key matters: an address-keyed window puts everyone behind one
 * mobile carrier NAT into a single budget, so a busy user throttles strangers.
 * `ipKeyGenerator` is what normalises an IPv6 address to its /56 prefix —
 * without it a caller with a v6 range gets an unlimited supply of fresh keys.
 * It takes the address itself, not the request: handing it `req` returns the
 * object unchanged, and every caller then shares one meaningless key.
 */
const keyByUserOrIp = (req) =>
    req.user?._id ? `user:${req.user._id}` : `ip:${ipKeyGenerator(req.ip)}`;

/** Rejects in the same `{ success, message }` envelope as every other route. */
const reject = (message) => (req, res) => {
    const retryAfterSeconds = Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        res.set("Retry-After", String(retryAfterSeconds));
    }

    return errorResponse(res, 429, message);
};

const baseOptions = {
    // `RateLimit-*` per the IETF draft; the older `X-RateLimit-*` pair is off
    // because it doubles the header bytes on every single response.
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
};

const globalLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    limit: 300,
    handler: reject("Too many requests. Please slow down and try again shortly."),
});

const authLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    // A correct password should not consume budget, or a user who mistypes
    // once and then succeeds still pays for the mistake on their next login.
    skipSuccessfulRequests: true,
    handler: reject("Too many attempts. Please wait a few minutes and try again."),
});

const expensiveLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000,
    limit: 20,
    handler: reject("Too many requests at once. Please wait a moment and try again."),
});

module.exports = { globalLimiter, authLimiter, expensiveLimiter };
