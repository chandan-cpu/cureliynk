const crypto = require("crypto");

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Only the SHA-256 hash of the reset token is ever persisted — the raw
 * token exists only in the email and the client's hands. If the database
 * leaked, a stored raw token would let anyone reset the matching account
 * without needing the email at all.
 */
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const generateResetToken = () => {
    const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    return {
        token,
        hashedToken: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS),
    };
};

module.exports = { generateResetToken, hashResetToken, RESET_TOKEN_EXPIRES_MS };
