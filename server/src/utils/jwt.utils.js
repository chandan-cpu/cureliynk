const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generate a short-lived access token
 * @param {Object} payload - { id, role, email }
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
};

/**
 * Generate a long-lived refresh token
 * @param {Object} payload - { id, role }
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
};

/**
 * Verify and decode an access token
 * @param {string} token
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify and decode a refresh token
 * @param {string} token
 */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
