const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 * @param {string} plainPassword
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password with a hashed password
 *
 * An account created through Google sign-in has no `password` field at all,
 * and bcrypt throws "Illegal arguments" rather than returning false when the
 * hash is undefined — which surfaced to the user as a 500. A missing hash
 * means "no password will ever match this account", so answer that directly.
 *
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    if (typeof plainPassword !== "string" || typeof hashedPassword !== "string") {
        return false;
    }

    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
