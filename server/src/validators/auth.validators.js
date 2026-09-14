const { z } = require("zod");

// ─────────────────────────────────────────────
// Reusable field schemas
// ─────────────────────────────────────────────

const emailField = z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim();

const passwordField = z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password cannot exceed 64 characters")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^)"
    );

const phoneField = z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number")
    .optional();

const nameField = z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim();

// ─────────────────────────────────────────────
// User (Patient) Registration Schema
// ─────────────────────────────────────────────

const registerUserSchema = z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
    phone: phoneField,
    dateOfBirth: z
        .string()
        .optional()
        .refine(
            (val) => !val || !isNaN(Date.parse(val)),
            "Please provide a valid date of birth"
        )
        .refine(
            (val) => {
                if (!val) return true;
                const dob = new Date(val);
                const today = new Date();
                const age = today.getFullYear() - dob.getFullYear();
                return age >= 0 && age <= 120;
            },
            "Date of birth must be a valid date"
        ),
    gender: z
        .enum(["male", "female", "other"], {
            errorMap: () => ({
                message: "Gender must be male, female, or other",
            }),
        })
        .optional(),
});

// ─────────────────────────────────────────────
// Doctor Registration Schema
// ─────────────────────────────────────────────

const registerDoctorSchema = z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
    // confirmPassword: z.string({ required_error: "Please confirm your password" }),
    phone: z
        .string({ required_error: "Phone number is required" })
        .regex(/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"),
    specialization: z
        .string({ required_error: "Specialization is required" })
        .min(2, "Specialization must be at least 2 characters")
        .max(100, "Specialization cannot exceed 100 characters")
        .trim(),
    licenseNumber: z
        .string({ required_error: "Medical license number is required" })
        .min(3, "License number must be at least 3 characters")
        .max(50, "License number cannot exceed 50 characters")
        .trim()
        .toUpperCase(),
    experience: z
        .number({ required_error: "Years of experience is required", invalid_type_error: "Experience must be a number" })
        .int("Experience must be a whole number")
        .min(0, "Experience cannot be negative")
        .max(60, "Experience value seems too high"),
    qualifications: z
        .array(
            z.string().min(1, "Qualification cannot be empty").max(100, "Qualification too long")
        )
        .min(1, "At least one qualification is required")
        .max(10, "Cannot have more than 10 qualifications"),
    clinicAddress: z
        .string()
        .max(300, "Clinic address cannot exceed 300 characters")
        .trim()
        .optional(),
    consultationFee: z
        .number()
        .min(0, "Consultation fee cannot be negative")
        .optional()
        .default(0),
    about: z
        .string()
        .max(1000, "About section cannot exceed 1000 characters")
        .optional(),
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

// ─────────────────────────────────────────────
// Admin Registration Schema
// ─────────────────────────────────────────────

const registerAdminSchema = z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
    // confirmPassword: z.string({ required_error: "Please confirm your password" }),
    phone: phoneField,
    adminSecretKey: z
        .string({ required_error: "Admin secret key is required" })
        .min(1, "Admin secret key cannot be empty"),
    permissions: z
        .array(
            z.enum([
                "manage_users",
                "manage_doctors",
                "manage_appointments",
                "manage_payments",
                "view_analytics",
                "manage_admins",
            ])
        )
        .optional(),
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

// ─────────────────────────────────────────────
// Login Schema (Shared for all roles)
// ─────────────────────────────────────────────

const loginSchema = z.object({
    email: emailField,
    password: z
        .string({ required_error: "Password is required" })
        .min(1, "Password cannot be empty"),
});

// ─────────────────────────────────────────────
// Google Sign-In Schema
// ─────────────────────────────────────────────

const googleAuthSchema = z.object({
    idToken: z
        .string({ required_error: "Google idToken is required" })
        .min(1, "Google idToken cannot be empty"),
});

// ─────────────────────────────────────────────
// Change Password Schema
// ─────────────────────────────────────────────

const changePasswordSchema = z.object({
    currentPassword: z
        .string({ required_error: "Current password is required" })
        .min(1, "Current password cannot be empty"),
    newPassword: passwordField,
    // confirmNewPassword: z.string({ required_error: "Please confirm your new password" }),
}).refine(
    (data) => data.newPassword === data.confirmNewPassword,
    {
        message: "New passwords do not match",
        path: ["confirmNewPassword"],
    }
).refine(
    (data) => data.currentPassword !== data.newPassword,
    {
        message: "New password must be different from the current password",
        path: ["newPassword"],
    }
);

// ─────────────────────────────────────────────
// Refresh Token Schema
// ─────────────────────────────────────────────

const refreshTokenSchema = z.object({
    refreshToken: z
        .string({ required_error: "Refresh token is required" })
        .min(1, "Refresh token cannot be empty"),
});

// ─────────────────────────────────────────────
// Forgot Password Schema
// ─────────────────────────────────────────────

const forgotPasswordSchema = z.object({
    email: emailField,
});

// ─────────────────────────────────────────────
// Reset Password Schema
// ─────────────────────────────────────────────

const resetPasswordParamsSchema = z.object({
    token: z
        .string({ required_error: "Reset token is required" })
        .min(1, "Reset token cannot be empty"),
});

const resetPasswordSchema = z.object({
    newPassword: passwordField,
});

// ─────────────────────────────────────────────
// Admin — Approve Doctor Schema
// ─────────────────────────────────────────────

const approveDoctorSchema = z.object({
    isApproved: z.boolean({ required_error: "isApproved field is required (true or false)" }),
    rejectionReason: z
        .string()
        .max(500, "Rejection reason cannot exceed 500 characters")
        .optional(),
}).refine(
    (data) => data.isApproved === true || (data.isApproved === false && data.rejectionReason),
    {
        message: "Rejection reason is required when rejecting a doctor",
        path: ["rejectionReason"],
    }
);

// ─────────────────────────────────────────────
// Admin — Toggle User Status Schema
// ─────────────────────────────────────────────

const toggleUserStatusSchema = z.object({
    isActive: z.boolean({ required_error: "isActive field is required (true or false)" }),
});

module.exports = {
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
    approveDoctorSchema,
    toggleUserStatusSchema,
};
