const express = require("express");
const router = express.Router();

const controller = require("../controllers/medication.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate, validateParams } = require("../middleware/validateRequest");

const {
    createMedicationSchema,
    updateMedicationSchema,
    createScheduleSchema,
    updateScheduleSchema,
    createDoseLogSchema,
    syncSchema,
    reminderProfileSchema,
    idParamSchema,
} = require("../validators/medication.validators");

// Every route below is private and scoped to the authenticated user.
router.use(authenticate);

// ─────────────────────────────────────────────
// SYNC / PROFILE / REFILLS
//
// Declared before "/:id" so Express 5 does not match the literal segments
// "sync", "profile" and "refills" as a medication id.
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/medications/sync
 * @desc    Pull medications + schedules changed since the client's last sync
 * @body    { since?: ISO string, timezone?: string }
 * @access  Private
 */
router.post("/sync", validate(syncSchema), controller.sync);

/**
 * @route   PATCH /api/v1/medications/profile
 * @desc    Update the user's timezone and caregiver email
 * @access  Private
 */
router.patch("/profile", validate(reminderProfileSchema), controller.updateReminderProfile);

/**
 * @route   GET /api/v1/medications/refills
 * @desc    Medications the daily refill job has flagged as low
 * @access  Private
 */
router.get("/refills", controller.listRefills);

// ─────────────────────────────────────────────
// DOSE LOGS
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/medications/dose-logs
 * @desc    Record a dose response (taken / missed / snoozed). Idempotent.
 * @access  Private
 */
router.post("/dose-logs", validate(createDoseLogSchema), controller.recordDoseLog);

/**
 * @route   GET /api/v1/medications/dose-logs?from=&to=
 * @desc    Adherence history for the logged-in user (defaults to 30 days)
 * @access  Private
 */
router.get("/dose-logs", controller.listDoseLogs);

// ─────────────────────────────────────────────
// SCHEDULES
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/medications/schedules
 * @access  Private
 */
router.get("/schedules", controller.listSchedules);

/**
 * @route   POST /api/v1/medications/schedules
 * @access  Private
 */
router.post("/schedules", validate(createScheduleSchema), controller.createSchedule);

/**
 * @route   PATCH /api/v1/medications/schedules/:id
 * @access  Private
 */
router.patch(
    "/schedules/:id",
    validateParams(idParamSchema),
    validate(updateScheduleSchema),
    controller.updateSchedule
);

/**
 * @route   DELETE /api/v1/medications/schedules/:id
 * @access  Private
 */
router.delete("/schedules/:id", validateParams(idParamSchema), controller.deleteSchedule);

// ─────────────────────────────────────────────
// MEDICATIONS
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/medications?includeArchived=true
 * @access  Private
 */
router.get("/", controller.listMedications);

/**
 * @route   POST /api/v1/medications
 * @access  Private
 */
router.post("/", validate(createMedicationSchema), controller.createMedication);

/**
 * @route   PATCH /api/v1/medications/:id
 * @access  Private
 */
router.patch(
    "/:id",
    validateParams(idParamSchema),
    validate(updateMedicationSchema),
    controller.updateMedication
);

/**
 * @route   DELETE /api/v1/medications/:id
 * @desc    Deletes the medication and its schedules; dose history is kept
 * @access  Private
 */
router.delete("/:id", validateParams(idParamSchema), controller.deleteMedication);

module.exports = router;
