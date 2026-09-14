const mongoose = require("mongoose");

/**
 * One scheduled dose and what the user did about it.
 *
 * Rows are created by the device, not the server: the app knows what it
 * scheduled locally and posts the outcome once the user responds (or once it
 * decides the dose was missed). The server is the durable history behind the
 * adherence calendar and the caregiver escalation — it does not generate
 * these rows on a timer.
 */
const doseLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        scheduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Schedule",
            required: true,
            index: true,
        },
        // Denormalised so the history screen can label a row with the drug name
        // after its schedule has been deleted.
        medicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Medication",
            required: true,
        },
        scheduledAt: {
            type: Date,
            required: [true, "scheduledAt is required"],
        },
        respondedAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: {
                values: ["pending", "taken", "missed", "snoozed"],
                message: "{VALUE} is not a valid dose status",
            },
            default: "pending",
        },
        /** Set when status is "snoozed" — when the follow-up notification fires. */
        snoozedUntil: {
            type: Date,
            default: null,
        },
        /**
         * Raised by the device when a dose stayed unanswered past its follow-up
         * window. Delivery is deliberately not wired up — see
         * services/caregiver.service.js for what happens next.
         */
        caregiverAlertedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/**
 * A dose is identified by its schedule plus its slot in time, which is what
 * makes the POST idempotent: a notification tapped twice, or the same response
 * replayed from two devices, upserts one row instead of inserting two.
 */
doseLogSchema.index({ scheduleId: 1, scheduledAt: 1 }, { unique: true });

// Drives the adherence history range query.
doseLogSchema.index({ userId: 1, scheduledAt: -1 });

module.exports = mongoose.model("DoseLog", doseLogSchema);
