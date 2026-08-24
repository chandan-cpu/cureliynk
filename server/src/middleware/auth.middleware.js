const { verifyAccessToken } = require("../utils/jwt.utils");
const { errorResponse } = require("../utils/response.utils");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Admin = require("../models/Admin");

/**
 * Map of role to their respective Mongoose models
 */
const MODEL_MAP = {
    user: User,
    doctor: Doctor,
    admin: Admin,
};

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return errorResponse(res, 401, "Access denied. No token provided.");
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return errorResponse(res, 401, "Access denied. Token is malformed.");
        }

        // Verify the token
        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return errorResponse(res, 401, "Token has expired. Please login again.");
            }
            if (err.name === "JsonWebTokenError") {
                return errorResponse(res, 401, "Invalid token. Please login again.");
            }
            return errorResponse(res, 401, "Token verification failed.");
        }

        // decoded should contain { id, role, email }
        const { id, role } = decoded;

        if (!id || !role) {
            return errorResponse(res, 401, "Token payload is invalid.");
        }

        const Model = MODEL_MAP[role];
        if (!Model) {
            return errorResponse(res, 401, "Invalid role in token.");
        }

        // Fetch user from DB (exclude sensitive fields)
        const user = await Model.findById(id).select("-password -refreshToken");

        if (!user) {
            return errorResponse(res, 401, "User not found. Token may be stale.");
        }

        if (!user.isActive) {
            return errorResponse(res, 403, "Your account has been deactivated. Please contact support.");
        }

        // Doctor-specific: must be approved by admin
        if (role === "doctor" && !user.isApproved) {
            return errorResponse(res, 403, "Your doctor account is pending admin approval.");
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("[authenticate] Unexpected error:", error);
        return errorResponse(res, 500, "Authentication failed due to a server error.");
    }
};

/**
 * authorize — Role-Based Access Control (RBAC) guard
 * Must be used AFTER authenticate middleware.
 *
 * @param {...string} roles - Allowed roles (e.g. "admin", "doctor")
 *
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, 401, "Authentication required.");
    }

    if (!roles.includes(req.user.role)) {
        return errorResponse(
            res,
            403,
            `Access denied. This route is restricted to: ${roles.join(", ")}.`
        );
    }

    next();
};

module.exports = { authenticate, authorize };
