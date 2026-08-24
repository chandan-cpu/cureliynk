const { errorResponse } = require("../utils/response.utils");

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Supports Zod v3 and v4 error formats.
 *
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // Zod v4 uses result.error.issues, v3 uses result.error.errors
        const rawErrors = result.error.issues || result.error.errors || [];

        const errors = rawErrors.map((issue) => ({
            field: issue.path.join(".") || "unknown",
            message: issue.message,
        }));

        return errorResponse(res, 400, "Validation failed", errors);
    }

    // Attach validated (and transformed) data to req for use in controllers
    req.validatedBody = result.data;
    next();
};

/**
 * Middleware factory that validates req.params against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
        const rawErrors = result.error.issues || result.error.errors || [];
        const errors = rawErrors.map((issue) => ({
            field: issue.path.join(".") || "unknown",
            message: issue.message,
        }));
        return errorResponse(res, 400, "Invalid request parameters", errors);
    }
    req.validatedParams = result.data;
    next();
};

module.exports = { validate, validateParams };