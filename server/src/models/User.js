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
