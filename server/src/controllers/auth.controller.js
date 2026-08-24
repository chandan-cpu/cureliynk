const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Admin = require("../models/Admin");
const { hashPassword, comparePassword } = require("../utils/password.utils");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt.utils");
const { successResponse, errorResponse } = require("../utils/response.utils");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MODEL_MAP = {
    user: User,
    doctor: Doctor,
    admin: Admin,
};

const sanitizeUser = (user) => {
    const obj = user.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/user
// ─────────────────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, dateOfBirth, gender } = req.validatedBody;

        // Check email uniqueness across all role models
        const [existingUser, existingDoctor, existingAdmin] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
            Admin.findOne({ email }),
        ]);

        if (existingUser || existingDoctor || existingAdmin) {
            return errorResponse(res, 409, "An account with this email already exists.");
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
        });

        return successResponse(res, 201, "User registered successfully.", sanitizeUser(user));
    } catch (error) {
        console.error("[registerUser]", error);
        if (error.code === 11000) {
            return errorResponse(res, 409, "An account with this email already exists.");
        }
        return errorResponse(res, 500, "Registration failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/doctor
// ─────────────────────────────────────────────────────────────────────────────
const registerDoctor = async (req, res) => {
    try {
        const {
            name, email, password, phone, specialization,
            licenseNumber, experience, qualifications,
            clinicAddress, consultationFee, about,
        } = req.validatedBody;

        // Check email & license uniqueness
        const [existingUser, existingDoctor, existingAdmin, existingLicense] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
            Admin.findOne({ email }),
            Doctor.findOne({ licenseNumber: licenseNumber.toUpperCase() }),
        ]);

        if (existingUser || existingDoctor || existingAdmin) {
            return errorResponse(res, 409, "An account with this email already exists.");
        }

        if (existingLicense) {
            return errorResponse(res, 409, "A doctor with this license number is already registered.");
        }

        const hashedPassword = await hashPassword(password);

        const doctor = await Doctor.create({
            name,
            email,
            password: hashedPassword,
            phone,
            specialization,
            licenseNumber,
            experience,
            qualifications,
            clinicAddress,
            consultationFee,
            about,
        });

        return successResponse(
            res,
            201,
            "Doctor registered successfully. Your account is pending admin approval. You will be notified once approved.",
            sanitizeUser(doctor)
        );
    } catch (error) {
        console.error("[registerDoctor]", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || "field";
            return errorResponse(res, 409, `A doctor with this ${field} already exists.`);
        }
        return errorResponse(res, 500, "Doctor registration failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/admin
// ─────────────────────────────────────────────────────────────────────────────
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, adminSecretKey, permissions } = req.validatedBody;

        // Validate the admin secret key
        if (adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
            return errorResponse(res, 403, "Invalid admin secret key.");
        }

        // Check email uniqueness
        const [existingUser, existingDoctor, existingAdmin] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
            Admin.findOne({ email }),
        ]);

        if (existingUser || existingDoctor || existingAdmin) {
            return errorResponse(res, 409, "An account with this email already exists.");
        }

        const hashedPassword = await hashPassword(password);

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            phone,
            permissions: permissions || ["manage_users", "manage_doctors", "manage_appointments"],
        });

        return successResponse(res, 201, "Admin registered successfully.", sanitizeUser(admin));
    } catch (error) {
        console.error("[registerAdmin]", error);
        if (error.code === 11000) {
            return errorResponse(res, 409, "An account with this email already exists.");
        }
        return errorResponse(res, 500, "Admin registration failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.validatedBody;

        // Auto-detect role: search all models in parallel
        const [userAccount, doctorAccount, adminAccount] = await Promise.all([
            User.findOne({ email }).select("+password +refreshToken"),
            Doctor.findOne({ email }).select("+password +refreshToken"),
            Admin.findOne({ email }).select("+password +refreshToken"),
        ]);

        const account = userAccount || doctorAccount || adminAccount;

        if (!account) {
            return errorResponse(res, 401, "Invalid email or password.");
        }

        // Check account active status
        if (!account.isActive) {
            return errorResponse(res, 403, "Your account has been deactivated. Please contact support.");
        }

        // Doctor must be approved before login
        if (account.role === "doctor" && !account.isApproved) {
            return errorResponse(res, 403, "Your account is pending admin approval. Please wait for approval before logging in.");
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, account.password);
        if (!isPasswordValid) {
            return errorResponse(res, 401, "Invalid email or password.");
        }

        // Generate tokens
        const tokenPayload = { id: account._id.toString(), role: account.role, email: account.email };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: account._id.toString(), role: account.role });

        // Persist refresh token
        account.refreshToken = refreshToken;
        await account.save();

        return successResponse(res, 200, "Login successful.", {
            accessToken,
            refreshToken,
            user: sanitizeUser(account),
        });
    } catch (error) {
        console.error("[login]", error);
        return errorResponse(res, 500, "Login failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/google
// Sign in (or silently register) a patient/user account from a Google ID token.
// ─────────────────────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.validatedBody;

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            return errorResponse(res, 401, "Invalid or expired Google token.");
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return errorResponse(res, 400, "Google account has no email associated with it.");
        }

        // Google sign-in only creates/authenticates patient (user) accounts.
        const [existingDoctor, existingAdmin] = await Promise.all([
            Doctor.findOne({ email }),
            Admin.findOne({ email }),
        ]);
        if (existingDoctor || existingAdmin) {
            return errorResponse(res, 409, "An account with this email already exists. Please sign in with your password instead.");
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] }).select("+refreshToken");

        if (!user) {
            user = await User.create({
                name: name || email.split("@")[0],
                email,
                googleId,
                profilePicture: picture || null,
                isVerified: true,
            });
        } else if (!user.googleId) {
            // Existing email/password account signing in with Google for the first time.
            user.googleId = googleId;
            if (!user.profilePicture && picture) user.profilePicture = picture;
        }

        if (!user.isActive) {
            return errorResponse(res, 403, "Your account has been deactivated. Please contact support.");
        }

        const tokenPayload = { id: user._id.toString(), role: user.role, email: user.email };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: user._id.toString(), role: user.role });

        user.refreshToken = refreshToken;
        await user.save();

        return successResponse(res, 200, "Google sign-in successful.", {
            accessToken,
            refreshToken,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("[googleAuth]", error);
        return errorResponse(res, 500, "Google sign-in failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
    try {
        // authenticate middleware attaches req.user
        const { _id, role } = req.user;
        const Model = MODEL_MAP[role];

        // Invalidate the refresh token in DB
        await Model.findByIdAndUpdate(_id, { refreshToken: null });

        return successResponse(res, 200, "Logged out successfully.");
    } catch (error) {
        console.error("[logout]", error);
        return errorResponse(res, 500, "Logout failed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.validatedBody;

        // Verify the refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return errorResponse(res, 401, "Refresh token has expired. Please login again.");
            }
            return errorResponse(res, 401, "Invalid refresh token.");
        }

        const { id, role } = decoded;
        const Model = MODEL_MAP[role];

        if (!Model) {
            return errorResponse(res, 401, "Invalid token payload.");
        }

        // Fetch account and verify stored token matches
        const account = await Model.findById(id).select("+refreshToken");

        if (!account || account.refreshToken !== token) {
            return errorResponse(res, 401, "Refresh token is invalid or has been revoked.");
        }

        if (!account.isActive) {
            return errorResponse(res, 403, "Account is deactivated.");
        }

        // Issue new access token
        const newAccessToken = generateAccessToken({
            id: account._id.toString(),
            role: account.role,
            email: account.email,
        });

        return successResponse(res, 200, "Token refreshed successfully.", {
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error("[refreshToken]", error);
        return errorResponse(res, 500, "Token refresh failed.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        // req.user is already populated by authenticate middleware
        return successResponse(res, 200, "Profile fetched successfully.", req.user);
    } catch (error) {
        console.error("[getMe]", error);
        return errorResponse(res, 500, "Failed to fetch profile.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.validatedBody;
        const { _id, role } = req.user;
        const Model = MODEL_MAP[role];

        // Fetch account with password
        const account = await Model.findById(_id).select("+password");

        if (!account) {
            return errorResponse(res, 404, "Account not found.");
        }

        // Verify current password
        const isCurrentPasswordValid = await comparePassword(currentPassword, account.password);
        if (!isCurrentPasswordValid) {
            return errorResponse(res, 401, "Current password is incorrect.");
        }

        // Hash and save new password; invalidate refresh token (force re-login)
        account.password = await hashPassword(newPassword);
        account.refreshToken = null;
        await account.save();

        return successResponse(res, 200, "Password changed successfully. Please login again.");
    } catch (error) {
        console.error("[changePassword]", error);
        return errorResponse(res, 500, "Failed to change password.");
    }
};

module.exports = {
    registerUser,
    registerDoctor,
    registerAdmin,
    login,
    googleAuth,
    logout,
    refreshToken,
    getMe,
    changePassword,
};
