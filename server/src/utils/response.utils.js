/**
 * Send a standardized success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response data
 */
const successResponse = (res, statusCode = 200, message = "Success", data = null) => {
    const payload = { success: true, message };
    if (data !== null && data !== undefined) payload.data = data;
    return res.status(statusCode).json(payload);
};

/**
 * Send a standardized error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Optional error details
 */
const errorResponse = (res, statusCode = 500, message = "Internal Server Error", errors = null) => {
    const payload = { success: false, message };
    if (errors !== null && errors !== undefined) payload.errors = errors;
    return res.status(statusCode).json(payload);
};

module.exports = { successResponse, errorResponse };
