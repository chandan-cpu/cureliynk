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
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
