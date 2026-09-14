const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },
        password: {
            type: String,
            // Not required for accounts created via Google Sign-In
            required: [function () { return !this.googleId; }, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false, // Never return password in queries
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // allows many docs with no googleId while still enforcing uniqueness when present
            select: false,
        },
        phone: {
            type: String,
            trim: true,
            match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"],
        },
        dateOfBirth: {
            type: Date,
        },
        gender: {
            type: String,
            enum: {
                values: ["male", "female", "other"],
                message: "Gender must be male, female, or other",
            },
        },
        profilePicture: {
            type: String,
            default: null,
        },
        /**
         * IANA zone name (e.g. "Asia/Kolkata") reported by the device.
         *
         * Schedules store wall-clock times like "08:00", which only identify a
         * moment once paired with a zone. The device is the source of truth and
         * refreshes this on launch; the server keeps it so that history and
         * caregiver alerts can be rendered in the user's own day boundaries.
         */
        timezone: {
            type: String,
            trim: true,
            default: "Asia/Kolkata",
        },
        /** Optional second contact notified when a dose goes unanswered. */
        caregiverEmail: {
            type: String,
            lowercase: true,
            trim: true,
            default: null,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid caregiver email address"],
        },
        role: {
            type: String,
            default: "user",
            immutable: true, // Role cannot be changed once set
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
