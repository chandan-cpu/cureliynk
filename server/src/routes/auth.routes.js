const express = require("express");
const router = express.Router();

const {
    registerUser,
    registerDoctor,
    registerAdmin,
    login,
    googleAuth,
    logout,
    refreshToken,
    getMe,
    changePassword,
    forgotPassword,
    resetPassword,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { validate, validateParams } = require("../middleware/validateRequest");

const {
    registerUserSchema,
    registerDoctorSchema,
    registerAdminSchema,
    loginSchema,
    googleAuthSchema,
    changePasswordSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordParamsSchema,
    resetPasswordSchema,
} = require("../validators/auth.validators");

console.log("auth.routes.js loaded");

// ─────────────────────────────────────────────
// PUBLIC ROUTES (No authentication required)
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register/user
 * @desc    Register a new patient/user account
 * @access  Public
 */
router.post("/register/user", validate(registerUserSchema), registerUser);

/**
 * @route   POST /api/v1/auth/register/doctor
 * @desc    Register a new doctor account (pending admin approval)
 * @access  Public
 */
router.post("/register/doctor", validate(registerDoctorSchema), registerDoctor);

/**
 * @route   POST /api/v1/auth/register/admin
 * @desc    Register a new admin account (requires ADMIN_SECRET_KEY)
 * @access  Public (protected by secret key in body)
 */
router.post("/register/admin", validate(registerAdminSchema), registerAdmin);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login for all roles (user, doctor, admin)
 * @body    { email, password, role }
 * @access  Public
 */
router.post("/login", validate(loginSchema), login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Sign in (or silently register) a patient account from a Google ID token
 * @body    { idToken }
 * @access  Public
 */
router.post("/google", validate(googleAuthSchema), googleAuth);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Get a new access token using a valid refresh token
 * @body    { refreshToken }
 * @access  Public
 */
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request a password reset link for any role (user, doctor, admin)
 * @body    { email }
 * @access  Public
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password/:token
 * @desc    Reset the account password using the token emailed by forgot-password
 * @body    { newPassword }
 * @access  Public
 */
router.post(
    "/reset-password/:token",
    validateParams(resetPasswordParamsSchema),
    validate(resetPasswordSchema),
    resetPassword
);

// ─────────────────────────────────────────────
// PROTECTED ROUTES (Authentication required)
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get the authenticated user's profile
 * @access  Private (all roles)
 */
router.get("/me", authenticate, getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private (all roles)
 */
router.post("/logout", authenticate, logout);

/**
 * @route   PATCH /api/v1/auth/change-password
 * @desc    Change the authenticated user's password
 * @body    { currentPassword, newPassword, confirmNewPassword }
 * @access  Private (all roles)
 */
router.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
