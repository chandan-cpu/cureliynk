const mongoose = require("mongoose");

/**
 * When a medication should be taken.
 *
 * The three frequencies use different subsets of the fields, enforced by the
 * pre-validate hook below rather than by `required` (which cannot express
 * "required only when frequency is weekly"):
 *
 *   daily          -> timeOfDay[]            e.g. ["08:00", "20:00"]
 *   every_n_hours  -> intervalHours + anchor e.g. every 6h from startDate
 *   weekly         -> timeOfDay[] + daysOfWeek
 *
 * The server never fires these — the device schedules its own local
 * notifications from this document. See lib/notification-scheduler.ts.
 */
const scheduleSchema = new mongoose.Schema(
    {
        // Denormalised from the medication so the common "all of this user's
        // schedules" sync query needs no join back through Medication.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        medicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Medication",
            required: true,
            index: true,
        },
        frequency: {
            type: String,
            enum: {
                values: ["daily", "every_n_hours", "weekly"],
                message: "{VALUE} is not a supported frequency",
            },
            required: [true, "Frequency is required"],
        },
        /** "HH:mm" in the user's local timezone, not UTC — see User.timezone. */
        timeOfDay: {
            type: [String],
            default: [],
            validate: {
                validator: (times) => times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)),
                message: "Each timeOfDay must be a 24-hour HH:mm string",
            },
        },
        intervalHours: {
            type: Number,
            min: [1, "Interval must be at least 1 hour"],
            max: [24, "Interval cannot exceed 24 hours"],
            default: null,
        },
        /** 0 = Sunday … 6 = Saturday, matching JS `Date.prototype.getDay()`. */
        daysOfWeek: {
            type: [Number],
            default: [],
            validate: {
                validator: (days) => days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
                message: "daysOfWeek entries must be integers from 0 (Sunday) to 6 (Saturday)",
            },
        },
        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },
        endDate: {
            type: Date,
            default: null,
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

// Mongoose 9 / Kareem 3 dropped the callback-style `next(err)` middleware
// signature — a pre hook now just throws to fail validation.
scheduleSchema.pre("validate", function () {
    if (this.frequency === "every_n_hours") {
        if (!this.intervalHours) {
            throw new Error("intervalHours is required when frequency is every_n_hours");
        }
    } else if (!this.timeOfDay || this.timeOfDay.length === 0) {
        throw new Error(`timeOfDay is required when frequency is ${this.frequency}`);
    }

    if (this.frequency === "weekly" && (!this.daysOfWeek || this.daysOfWeek.length === 0)) {
        throw new Error("daysOfWeek is required when frequency is weekly");
    }

    if (this.endDate && this.startDate && this.endDate < this.startDate) {
        throw new Error("endDate cannot be before startDate");
    }
});

// Drives the sync endpoint: "everything of mine touched since <timestamp>".
scheduleSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Schedule", scheduleSchema);
