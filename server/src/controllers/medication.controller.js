const mongoose = require("mongoose");

const Medication = require("../models/Medication");
const Schedule = require("../models/Schedule");
const DoseLog = require("../models/DoseLog");
const User = require("../models/User");
const { alertCaregiver } = require("../services/caregiver.service");
const { successResponse, errorResponse } = require("../utils/response.utils");

/**
 * Every handler in this file scopes its queries by `req.user._id`. A medication
 * id is guessable, so ownership is enforced in the filter itself rather than by
 * fetching first and comparing — a miss then returns 404 and leaks nothing
 * about whether the id exists under another account.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATIONS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/medications
const listMedications = async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === "true";
        const filter = { userId: req.user._id };
        if (!includeArchived) filter.isArchived = false;

        const medications = await Medication.find(filter).sort({ createdAt: -1 }).lean();
        return successResponse(res, 200, "Medications retrieved", medications);
    } catch (error) {
        console.error("[listMedications]", error);
        return errorResponse(res, 500, "Could not retrieve medications");
    }
};

// POST /api/v1/medications
const createMedication = async (req, res) => {
    try {
        const medication = await Medication.create({
            ...req.validatedBody,
            userId: req.user._id,
        });
        return successResponse(res, 201, "Medication created", medication);
    } catch (error) {
        console.error("[createMedication]", error);
        if (error.name === "ValidationError") {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, "Could not create medication");
    }
};

// PATCH /api/v1/medications/:id
const updateMedication = async (req, res) => {
    try {
        const medication = await Medication.findOneAndUpdate(
            { _id: req.validatedParams.id, userId: req.user._id },
            { $set: req.validatedBody },
            { new: true, runValidators: true }
        );

        if (!medication) return errorResponse(res, 404, "Medication not found");
        return successResponse(res, 200, "Medication updated", medication);
    } catch (error) {
        console.error("[updateMedication]", error);
        if (error.name === "ValidationError") {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, "Could not update medication");
    }
};

/**
 * DELETE /api/v1/medications/:id
 *
 * Deletes the medication and its schedules, but keeps the dose logs: adherence
 * history for a course the user has finished is the point of the history
 * screen, and DoseLog carries its own medicationId for exactly this case.
 */
const deleteMedication = async (req, res) => {
    try {
        const medication = await Medication.findOneAndDelete({
            _id: req.validatedParams.id,
            userId: req.user._id,
        });

        if (!medication) return errorResponse(res, 404, "Medication not found");

        await Schedule.deleteMany({ medicationId: medication._id, userId: req.user._id });

        return successResponse(res, 200, "Medication deleted", { _id: medication._id });
    } catch (error) {
        console.error("[deleteMedication]", error);
        return errorResponse(res, 500, "Could not delete medication");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/medications/schedules
const listSchedules = async (req, res) => {
    try {
        const schedules = await Schedule.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        return successResponse(res, 200, "Schedules retrieved", schedules);
    } catch (error) {
        console.error("[listSchedules]", error);
        return errorResponse(res, 500, "Could not retrieve schedules");
    }
};

// POST /api/v1/medications/schedules
const createSchedule = async (req, res) => {
    try {
        const { medicationId } = req.validatedBody;

        // Confirms the medication is this user's before the schedule can point
        // at it — otherwise a schedule could be hung off someone else's drug.
        const owns = await Medication.exists({ _id: medicationId, userId: req.user._id });
        if (!owns) return errorResponse(res, 404, "Medication not found");

        const schedule = await Schedule.create({
            ...req.validatedBody,
            userId: req.user._id,
        });

        return successResponse(res, 201, "Schedule created", schedule);
    } catch (error) {
        console.error("[createSchedule]", error);
        if (error.name === "ValidationError" || error instanceof mongoose.Error) {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, "Could not create schedule");
    }
};

// PATCH /api/v1/medications/schedules/:id
const updateSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findOne({
            _id: req.validatedParams.id,
            userId: req.user._id,
        });

        if (!schedule) return errorResponse(res, 404, "Schedule not found");

        // Assigned then saved (rather than findOneAndUpdate) so the pre-validate
        // hook enforcing the per-frequency field rules actually runs.
        Object.assign(schedule, req.validatedBody);
        await schedule.save();

        return successResponse(res, 200, "Schedule updated", schedule);
    } catch (error) {
        console.error("[updateSchedule]", error);
        if (error.name === "ValidationError" || error instanceof mongoose.Error) {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, "Could not update schedule");
    }
};

// DELETE /api/v1/medications/schedules/:id
const deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findOneAndDelete({
            _id: req.validatedParams.id,
            userId: req.user._id,
        });

        if (!schedule) return errorResponse(res, 404, "Schedule not found");
        return successResponse(res, 200, "Schedule deleted", { _id: schedule._id });
    } catch (error) {
        console.error("[deleteSchedule]", error);
        return errorResponse(res, 500, "Could not delete schedule");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOSE LOGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/medications/dose-logs
 *
 * Idempotent on (scheduleId, scheduledAt): the same dose response arriving
 * twice — a double tap, or a replay from a second device — updates one row.
 * That pairing is a unique index on DoseLog, so a race between two devices
 * ends in an upsert rather than a duplicate.
 */
const recordDoseLog = async (req, res) => {
    try {
        const {
            scheduleId,
            scheduledAt,
            status,
            respondedAt,
            snoozedUntil,
            caregiverAlerted,
            quantityUsed,
        } = req.validatedBody;

        const schedule = await Schedule.findOne({ _id: scheduleId, userId: req.user._id }).lean();
        if (!schedule) return errorResponse(res, 404, "Schedule not found");

        const update = {
            userId: req.user._id,
            scheduleId,
            medicationId: schedule.medicationId,
            scheduledAt: new Date(scheduledAt),
            status,
            respondedAt: respondedAt
                ? new Date(respondedAt)
                : status === "pending"
                    ? null
                    : new Date(),
            snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null,
        };

        // `userId` is redundant against the ownership check above — schedules
        // are per-user, so this schedule's logs cannot be anyone else's — but
        // it keeps the file's invariant true of every query on its own terms,
        // and holds if a log is ever reachable by another path.
        const doseLog = await DoseLog.findOneAndUpdate(
            { scheduleId, scheduledAt: new Date(scheduledAt), userId: req.user._id },
            { $set: update },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Taking a dose draws down stock. Guarded with $gte so concurrent
        // writes cannot push the count below zero.
        if (status === "taken" && quantityUsed) {
            await Medication.updateOne(
                {
                    _id: schedule.medicationId,
                    userId: req.user._id,
                    quantityRemaining: { $gte: quantityUsed },
                },
                { $inc: { quantityRemaining: -quantityUsed } }
            );
        }

        let caregiver = null;
        if (caregiverAlerted && status === "missed") {
            const medication = await Medication.findById(schedule.medicationId).lean();
            caregiver = await alertCaregiver({ user: req.user, doseLog, medication });
        }

        return successResponse(res, 200, "Dose recorded", { doseLog, caregiver });
    } catch (error) {
        console.error("[recordDoseLog]", error);
        return errorResponse(res, 500, "Could not record dose");
    }
};

/**
 * GET /api/v1/medications/dose-logs?from=&to=
 *
 * Adherence history for the calendar. Defaults to the last 30 days.
 */
const listDoseLogs = async (req, res) => {
    try {
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const from = req.query.from
            ? new Date(req.query.from)
            : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            return errorResponse(res, 400, "from and to must be valid dates");
        }

        const doseLogs = await DoseLog.find({
            userId: req.user._id,
            scheduledAt: { $gte: from, $lte: to },
        })
            .sort({ scheduledAt: -1 })
            .limit(1000)
            .lean();

        // Computed here rather than in the app so every client shows the same
        // number. Pending and snoozed doses are excluded — a dose whose moment
        // has not settled yet is not evidence either way.
        const answered = doseLogs.filter(
            (log) => log.status !== "pending" && log.status !== "snoozed"
        );
        const takenCount = answered.filter((log) => log.status === "taken").length;

        return successResponse(res, 200, "Dose history retrieved", {
            doseLogs,
            summary: {
                from: from.toISOString(),
                to: to.toISOString(),
                total: doseLogs.length,
                taken: takenCount,
                missed: answered.length - takenCount,
                adherenceRate: answered.length
                    ? Math.round((takenCount / answered.length) * 100)
                    : null,
            },
        });
    } catch (error) {
        console.error("[listDoseLogs]", error);
        return errorResponse(res, 500, "Could not retrieve dose history");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC + PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/medications/sync
 *
 * The lightweight multi-device pull. The client sends the timestamp of its last
 * successful sync and gets back everything of the user's touched since then,
 * plus a fresh `syncedAt` to send next time.
 *
 * Deliberately one-directional: writes still go through the normal REST routes,
 * so the client's only job here is to notice what another device changed and
 * reschedule its local notifications accordingly.
 */
const sync = async (req, res) => {
    try {
        const { since, timezone } = req.validatedBody;
        const sinceDate = since ? new Date(since) : null;
        const filter = { userId: req.user._id };
        if (sinceDate) filter.updatedAt = { $gt: sinceDate };

        // A device that has just crossed timezones reports it here, so the
        // server's view matches what the app is scheduling against.
        if (timezone && timezone !== req.user.timezone) {
            await User.updateOne({ _id: req.user._id }, { $set: { timezone } });
        }

        const [medications, schedules] = await Promise.all([
            Medication.find(filter).lean(),
            Schedule.find(filter).lean(),
        ]);

        return successResponse(res, 200, "Sync complete", {
            syncedAt: new Date().toISOString(),
            timezone: timezone ?? req.user.timezone,
            medications,
            schedules,
            // A full pull is authoritative; an incremental one is a delta the
            // client merges. Stated explicitly so the client need not infer it.
            isFullSync: !sinceDate,
        });
    } catch (error) {
        console.error("[sync]", error);
        return errorResponse(res, 500, "Could not sync");
    }
};

// GET /api/v1/medications/refills
const listRefills = async (req, res) => {
    try {
        const medications = await Medication.find({
            userId: req.user._id,
            isArchived: false,
            needsRefill: true,
        })
            .sort({ quantityRemaining: 1 })
            .lean();

        return successResponse(res, 200, "Refill alerts retrieved", medications);
    } catch (error) {
        console.error("[listRefills]", error);
        return errorResponse(res, 500, "Could not retrieve refill alerts");
    }
};

// PATCH /api/v1/medications/profile — timezone + caregiver email
const updateReminderProfile = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: req.validatedBody },
            { new: true, runValidators: true }
        ).select("timezone caregiverEmail");

        return successResponse(res, 200, "Reminder profile updated", user);
    } catch (error) {
        console.error("[updateReminderProfile]", error);
        if (error.name === "ValidationError") {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, "Could not update reminder profile");
    }
};

module.exports = {
    listMedications,
    createMedication,
    updateMedication,
    deleteMedication,
    listSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    recordDoseLog,
    listDoseLogs,
    sync,
    listRefills,
    updateReminderProfile,
};
