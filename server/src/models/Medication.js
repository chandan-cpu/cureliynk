const mongoose = require("mongoose");

/**
 * A drug the user is taking. Dose timing lives on the Schedule documents that
 * reference this one — a medication with no schedule is valid (it is simply
 * tracked for refills and never reminded about).
 */
const medicationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "Medication name is required"],
            trim: true,
            maxlength: [120, "Medication name cannot exceed 120 characters"],
        },
        dosage: {
            type: String,
            required: [true, "Dosage is required"],
            trim: true,
            maxlength: [60, "Dosage cannot exceed 60 characters"],
        },
        form: {
            type: String,
            enum: {
                values: ["tablet", "capsule", "syrup", "injection", "drops", "inhaler", "cream", "other"],
                message: "{VALUE} is not a supported medication form",
            },
            default: "tablet",
        },
        quantityRemaining: {
            type: Number,
            min: [0, "Quantity remaining cannot be negative"],
            default: 0,
        },
        lowStockThreshold: {
            type: Number,
            min: [0, "Low stock threshold cannot be negative"],
            default: 5,
        },
        /**
         * Set by the daily node-cron refill check, not by the client. Kept as a
         * stored flag rather than computed on read so the job has somewhere to
         * record that it has already noticed — see jobs/refill-check.job.js.
         */
        needsRefill: {
            type: Boolean,
            default: false,
        },
        refillFlaggedAt: {
            type: Date,
            default: null,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Every list query is "this user's active medications, newest first".
medicationSchema.index({ userId: 1, isArchived: 1, createdAt: -1 });

module.exports = mongoose.model("Medication", medicationSchema);
