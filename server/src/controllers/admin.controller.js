const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Admin = require("../models/Admin");
const { successResponse, errorResponse } = require("../utils/response.utils");

/**
 * Strip sensitive fields before returning to client
 */
const sanitize = (doc) => {
    const obj = doc.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/users
// Get all registered users (patients) — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, isActive, search } = req.query;

        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);

        return successResponse(res, 200, "Users fetched successfully.", {
            users: users.map(sanitize),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalUsers: total,
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error("[getAllUsers]", error);
        return errorResponse(res, 500, "Failed to fetch users.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/doctors
// Get all doctors (with approval status filter) — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const getAllDoctors = async (req, res) => {
    try {
        const { page = 1, limit = 20, isApproved, isActive, search, specialization } = req.query;

        const filter = {};
        if (isApproved !== undefined) filter.isApproved = isApproved === "true";
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (specialization) filter.specialization = { $regex: specialization, $options: "i" };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { licenseNumber: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [doctors, total] = await Promise.all([
            Doctor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Doctor.countDocuments(filter),
        ]);

        return successResponse(res, 200, "Doctors fetched successfully.", {
            doctors: doctors.map(sanitize),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalDoctors: total,
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error("[getAllDoctors]", error);
        return errorResponse(res, 500, "Failed to fetch doctors.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/admin/doctors/:id/approve
// Approve or reject a doctor — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const approveDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved, rejectionReason } = req.validatedBody;

        const doctor = await Doctor.findById(id);

        if (!doctor) {
            return errorResponse(res, 404, "Doctor not found.");
        }

        doctor.isApproved = isApproved;
        doctor.rejectionReason = isApproved ? null : rejectionReason;
        await doctor.save();

        const statusText = isApproved ? "approved" : "rejected";
        return successResponse(
            res,
            200,
            `Doctor has been ${statusText} successfully.`,
            sanitize(doctor)
        );
    } catch (error) {
        console.error("[approveDoctor]", error);
        if (error.name === "CastError") {
            return errorResponse(res, 400, "Invalid doctor ID format.");
        }
        return errorResponse(res, 500, "Failed to update doctor approval status.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/admin/users/:id/status
// Activate or deactivate a user — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.validatedBody;

        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 404, "User not found.");
        }

        user.isActive = isActive;
        await user.save();

        const statusText = isActive ? "activated" : "deactivated";
        return successResponse(
            res,
            200,
            `User account has been ${statusText} successfully.`,
            sanitize(user)
        );
    } catch (error) {
        console.error("[toggleUserStatus]", error);
        if (error.name === "CastError") {
            return errorResponse(res, 400, "Invalid user ID format.");
        }
        return errorResponse(res, 500, "Failed to update user status.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/admin/doctors/:id/status
// Activate or deactivate a doctor — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const toggleDoctorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.validatedBody;

        const doctor = await Doctor.findById(id);

        if (!doctor) {
            return errorResponse(res, 404, "Doctor not found.");
        }

        doctor.isActive = isActive;
        await doctor.save();

        const statusText = isActive ? "activated" : "deactivated";
        return successResponse(
            res,
            200,
            `Doctor account has been ${statusText} successfully.`,
            sanitize(doctor)
        );
    } catch (error) {
        console.error("[toggleDoctorStatus]", error);
        if (error.name === "CastError") {
            return errorResponse(res, 400, "Invalid doctor ID format.");
        }
        return errorResponse(res, 500, "Failed to update doctor status.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/stats
// Dashboard statistics — Admin only
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalDoctors,
            approvedDoctors,
            pendingDoctors,
            totalAdmins,
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ isActive: true }),
            Doctor.countDocuments({}),
            Doctor.countDocuments({ isApproved: true }),
            Doctor.countDocuments({ isApproved: false }),
            Admin.countDocuments({}),
        ]);

        return successResponse(res, 200, "Dashboard stats fetched.", {
            users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
            doctors: { total: totalDoctors, approved: approvedDoctors, pending: pendingDoctors },
            admins: { total: totalAdmins },
        });
    } catch (error) {
        console.error("[getDashboardStats]", error);
        return errorResponse(res, 500, "Failed to fetch dashboard stats.");
    }
};

module.exports = {
    getAllUsers,
    getAllDoctors,
    approveDoctor,
    toggleUserStatus,
    toggleDoctorStatus,
    getDashboardStats,
};
