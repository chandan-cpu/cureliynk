const mongoose = require("mongoose");

const availableSlotSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            required: true,
        },
        startTime: {
            type: String, // "09:00"
            required: true,
        },
        endTime: {
            type: String, // "17:00"
            required: true,
        },
    },
    { _id: false }
);

const doctorSchema = new mongoose.Schema(
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
            required: [true, "Phone number is required"],
            match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"],
        },
        profilePicture: {
            type: String,
            default: null,
        },
        // Medical-specific fields
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
            maxlength: [100, "Specialization cannot exceed 100 characters"],
        },
        licenseNumber: {
            type: String,
            trim: true,
        },
        experience: {
            type: Number,
            // min: [0, "Experience cannot be negative"],
            // max: [60, "Experience value seems incorrect"],
        },
        qualifications: {
            type: [String],
            required: [true, "At least one qualification is required"],
            validate: {
                validator: (arr) => arr.length > 0,
                message: "At least one qualification must be provided",
            },
        },
        clinicAddress: {
            type: String,
            trim: true,
            maxlength: [300, "Clinic address cannot exceed 300 characters"],
        },
        consultationFee: {
            type: Number,
            min: [0, "Consultation fee cannot be negative"],
            default: 0,
        },
        availableSlots: {
            type: [availableSlotSchema],
            default: [],
        },
        about: {
            type: String,
            maxlength: [1000, "About section cannot exceed 1000 characters"],
        },
        role: {
            type: String,
            default: "doctor",
            immutable: true,
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
        isApproved: {
            type: Boolean,
            default: false, // Admin must approve before doctor can login
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        rejectionReason: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
