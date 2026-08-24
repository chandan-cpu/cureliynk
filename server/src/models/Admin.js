const mongoose = require("mongoose");

const ADMIN_PERMISSIONS = [
    "manage_users",
    "manage_doctors",
    "manage_appointments",
    "manage_payments",
    "view_analytics",
    "manage_admins",
];

const adminSchema = new mongoose.Schema(
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
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        phone: {
            type: String,
            match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"],
        },
        role: {
            type: String,
            default: "admin",
            immutable: true,
        },
        permissions: {
            type: [String],
            enum: {
                values: ADMIN_PERMISSIONS,
                message: "{VALUE} is not a valid permission",
            },
            default: ["manage_users", "manage_doctors", "manage_appointments"],
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
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

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
