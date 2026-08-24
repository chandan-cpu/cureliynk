const express = require("express");
const router = express.Router();

const {
    getAllUsers,
    getAllDoctors,
    approveDoctor,
    toggleUserStatus,
    toggleDoctorStatus,
    getDashboardStats,
} = require("../controllers/admin.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validateRequest");
const { approveDoctorSchema, toggleUserStatusSchema } = require("../validators/auth.validators");

// Apply authenticate + authorize('admin') to ALL routes in this router
router.use(authenticate, authorize("admin"));

// ─────────────────────────────────────────────
// ADMIN — Dashboard
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get platform dashboard statistics
 * @access  Admin only
 */
router.get("/stats", getDashboardStats);

// ─────────────────────────────────────────────
// ADMIN — User Management
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination & filters
 * @query   page, limit, isActive, search
 * @access  Admin only
 */
router.get("/users", getAllUsers);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Activate or deactivate a user account
 * @body    { isActive: boolean }
 * @access  Admin only
 */
router.patch("/users/:id/status", validate(toggleUserStatusSchema), toggleUserStatus);

// ─────────────────────────────────────────────
// ADMIN — Doctor Management
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/doctors
 * @desc    Get all doctors with pagination & filters
 * @query   page, limit, isApproved, isActive, search, specialization
 * @access  Admin only
 */
router.get("/doctors", getAllDoctors);

/**
 * @route   PATCH /api/v1/admin/doctors/:id/approve
 * @desc    Approve or reject a doctor application
 * @body    { isApproved: boolean, rejectionReason?: string }
 * @access  Admin only
 */
router.patch("/doctors/:id/approve", validate(approveDoctorSchema), approveDoctor);

/**
 * @route   PATCH /api/v1/admin/doctors/:id/status
 * @desc    Activate or deactivate a doctor account
 * @body    { isActive: boolean }
 * @access  Admin only
 */
router.patch("/doctors/:id/status", validate(toggleUserStatusSchema), toggleDoctorStatus);

module.exports = router;
