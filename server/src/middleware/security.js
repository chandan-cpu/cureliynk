const helmet = require("helmet");
const cors = require("cors");
const { isProduction } = require("../config/env");

/**
 * Response hardening for a JSON API.
 *
 * helmet was already a dependency but was never mounted, so until now every
 * response left here with no `X-Content-Type-Options`, no `X-Frame-Options`,
 * no HSTS, and an `X-Powered-By: Express` banner announcing the stack.
 */

/**
 * Origins allowed to call this API from a browser, as a comma-separated list
 * in `ALLOWED_ORIGINS`.
 *
 * Native mobile builds send no `Origin` header, so CORS never applies to them
 * and this list does not need to mention the app. It exists for the Vite web
 * client and Expo web, and it stays an explicit list rather than a wildcard
 * because any browser origin that can reach these routes can spend the
 * Gemini and Google Places budget attached to them.
 */
const parseAllowedOrigins = () =>
    (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const buildCorsOptions = () => {
    const allowed = parseAllowedOrigins();

    return {
        origin(origin, callback) {
            // No Origin: a native app, curl, or a same-origin request. These
            // are not browser cross-origin calls, so CORS has no say — the
            // Authorization header is what guards them.
            if (!origin) return callback(null, true);

            if (allowed.includes(origin)) return callback(null, true);

            // Outside production an empty list means "developer has not set
            // this up yet"; reflecting the origin keeps a local Vite server
            // working. In production an empty list denies every browser
            // origin, which is the safe reading of "not configured".
            if (!allowed.length && !isProduction()) return callback(null, true);

            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Authorization", "Content-Type"],
        // Hidden from page JS by default even on an allowed origin, so the web
        // client cannot back off correctly on a 429 without this line.
        exposedHeaders: ["Retry-After", "RateLimit-Policy", "RateLimit"],
        maxAge: 600,
    };
};

const helmetOptions = {
    // This API serves JSON, never markup, so the default CSP's script/style
    // sources are noise. `default-src 'none'` is the honest policy for a body
    // that should never be rendered, and it is what makes a reflected value
    // inert if a browser is ever tricked into treating a response as a page.
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'none'"],
            "frame-ancestors": ["'none'"],
        },
    },
    // Nothing here is meant to be framed.
    frameguard: { action: "deny" },
    // Never leak an API path or query string to a third-party site.
    referrerPolicy: { policy: "no-referrer" },
    // Only meaningful over TLS, and actively harmful while a developer is
    // still on plain http://localhost — it would pin their browser to HTTPS
    // for the whole origin.
    strictTransportSecurity: isProduction()
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
};

/**
 * The headers helmet does not set, but a health API wants.
 */
const extraSecurityHeaders = (req, res, next) => {
    // Responses carry medication lists, symptoms and locations. Keep them out
    // of shared caches and off disk.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");

    res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

    next();
};

/**
 * Mounts the whole response-hardening stack onto an Express app.
 */
const applySecurity = (app) => {
    // Rate limiting and logging both key on the caller's address. Behind a
    // reverse proxy (Render, Railway, nginx) every request arrives from the
    // proxy, so without this one key would hold the entire internet's budget.
    // `1` trusts exactly one hop — trusting all of them would let a caller
    // forge X-Forwarded-For and mint a fresh budget per request.
    app.set("trust proxy", 1);

    // Redundant with helmet, which removes it too, but this is the line that
    // keeps the banner off if helmet is ever reconfigured.
    app.disable("x-powered-by");

    app.use(helmet(helmetOptions));
    app.use(extraSecurityHeaders);

    const corsOptions = buildCorsOptions();
    app.use(cors(corsOptions));
    app.options(/.*/, cors(corsOptions));
};

module.exports = { applySecurity, parseAllowedOrigins };
