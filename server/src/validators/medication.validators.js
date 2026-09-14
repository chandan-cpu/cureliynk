const { z } = require("zod");

// ─────────────────────────────────────────────
// Reusable field schemas
// ─────────────────────────────────────────────

const objectIdField = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");

const timeOfDayField = z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times must be in 24-hour HH:mm format"))
    .max(12, "A schedule cannot have more than 12 times per day");

const isoDateField = z
    .string()
    .datetime({ offset: true, message: "Must be an ISO 8601 date-time string" });

const MEDICATION_FORMS = [
    "tablet",
    "capsule",
    "syrup",
    "injection",
    "drops",
    "inhaler",
    "cream",
    "other",
];

// ─────────────────────────────────────────────
// Medications
// ─────────────────────────────────────────────

const medicationFields = {
    name: z.string().min(1, "Medication name is required").max(120).trim(),
    dosage: z.string().min(1, "Dosage is required").max(60).trim(),
    form: z.enum(MEDICATION_FORMS).optional(),
    quantityRemaining: z.number().min(0, "Quantity cannot be negative").optional(),
    lowStockThreshold: z.number().min(0, "Threshold cannot be negative").optional(),
};

exports.createMedicationSchema = z.object(medicationFields);

// Every field optional on update, but at least one must be present — an empty
// PATCH body is a client bug, not a no-op worth a 200.
exports.updateMedicationSchema = z
    .object({
        ...medicationFields,
        name: medicationFields.name.optional(),
        dosage: medicationFields.dosage.optional(),
        isArchived: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: "Provide at least one field to update",
    });

// ─────────────────────────────────────────────
// Schedules
// ─────────────────────────────────────────────

/**
 * Mirrors the conditional requirements enforced by Schedule's pre-validate
 * hook, so a bad body is rejected as a 400 with a field name rather than
 * surfacing as a 500 from Mongoose.
 */
const scheduleShape = z.object({
    medicationId: objectIdField,
    frequency: z.enum(["daily", "every_n_hours", "weekly"]),
    timeOfDay: timeOfDayField.optional(),
    intervalHours: z.number().int().min(1).max(24).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    startDate: isoDateField,
    endDate: isoDateField.nullable().optional(),
    isActive: z.boolean().optional(),
});

const withFrequencyRules = (schema) =>
    schema
        .refine(
            (s) => s.frequency !== "every_n_hours" || typeof s.intervalHours === "number",
            { message: "intervalHours is required for an every_n_hours schedule", path: ["intervalHours"] }
        )
        .refine(
            (s) => s.frequency === "every_n_hours" || (s.timeOfDay?.length ?? 0) > 0,
            { message: "At least one time of day is required", path: ["timeOfDay"] }
        )
        .refine(
            (s) => s.frequency !== "weekly" || (s.daysOfWeek?.length ?? 0) > 0,
            { message: "Select at least one day of the week", path: ["daysOfWeek"] }
        )
        .refine(
            (s) => !s.endDate || !s.startDate || new Date(s.endDate) >= new Date(s.startDate),
            { message: "End date cannot be before the start date", path: ["endDate"] }
        );

exports.createScheduleSchema = withFrequencyRules(scheduleShape);

// An update carries the whole schedule: the frequency rules above only hold
// when every field is present together, so a partial PATCH could not be
// validated against them.
exports.updateScheduleSchema = withFrequencyRules(scheduleShape.omit({ medicationId: true }));

// ─────────────────────────────────────────────
// Dose logs
// ─────────────────────────────────────────────

exports.createDoseLogSchema = z.object({
    scheduleId: objectIdField,
    scheduledAt: isoDateField,
    status: z.enum(["pending", "taken", "missed", "snoozed"]),
    respondedAt: isoDateField.nullable().optional(),
    snoozedUntil: isoDateField.nullable().optional(),
    caregiverAlerted: z.boolean().optional(),
    /**
     * Decrement applied to the medication's stock when the dose is taken.
     * Sent by the client because only it knows the unit — one tablet vs 5ml.
     */
    quantityUsed: z.number().min(0).max(100).optional(),
});

// ─────────────────────────────────────────────
// Sync + profile
// ─────────────────────────────────────────────

exports.syncSchema = z.object({
    /** Anything changed server-side after this is returned. Omit for a full pull. */
    since: isoDateField.optional(),
    timezone: z.string().max(64).optional(),
});

exports.reminderProfileSchema = z
    .object({
        timezone: z.string().max(64).optional(),
        caregiverEmail: z.string().email("Please provide a valid caregiver email address").nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: "Provide at least one field to update",
    });

exports.idParamSchema = z.object({ id: objectIdField });
