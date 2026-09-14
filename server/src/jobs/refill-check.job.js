const cron = require("node-cron");

const Medication = require("../models/Medication");

/**
 * Daily low-stock sweep.
 *
 * This is the one piece of medication logic that genuinely belongs on a server
 * timer: it is not time-critical (a refill reminder is just as useful an hour
 * late) and it must work whether or not any device has opened the app. Dose
 * reminders are the opposite on both counts, which is why they live on the
 * device instead — see mobile/lib/notification-scheduler.ts.
 *
 * The flag is raised and cleared rather than only raised, so restocking a
 * medication clears its alert on the next run without the client having to.
 */
const runRefillCheck = async () => {
    const startedAt = Date.now();

    try {
        // `$expr` compares two fields of the same document, which a plain
        // filter cannot express.
        const lowStockFilter = {
            isArchived: false,
            $expr: { $lte: ["$quantityRemaining", "$lowStockThreshold"] },
        };

        const [flagged, cleared] = await Promise.all([
            Medication.updateMany(
                { ...lowStockFilter, needsRefill: false },
                { $set: { needsRefill: true, refillFlaggedAt: new Date() } }
            ),
            Medication.updateMany(
                {
                    isArchived: false,
                    needsRefill: true,
                    $expr: { $gt: ["$quantityRemaining", "$lowStockThreshold"] },
                },
                { $set: { needsRefill: false, refillFlaggedAt: null } }
            ),
        ]);

        console.log(
            `[refill-check] ${flagged.modifiedCount} flagged, ${cleared.modifiedCount} cleared ` +
            `in ${Date.now() - startedAt}ms`
        );

        return { flagged: flagged.modifiedCount, cleared: cleared.modifiedCount };
    } catch (error) {
        // Swallowed deliberately: an unhandled rejection inside a cron tick
        // would take the whole API process down with it.
        console.error("[refill-check] failed:", error);
        return { flagged: 0, cleared: 0, error: error.message };
    }
};

/**
 * Schedules the sweep for 08:00 every day, in the server's configured zone.
 *
 * Per-user local time is deliberately not attempted here — users span
 * timezones and this job writes a flag the app reads whenever it next opens,
 * so the exact hour it runs is not something a user can perceive.
 */
const startRefillCheckJob = () => {
    const schedule = process.env.REFILL_CHECK_CRON || "0 8 * * *";
    const timezone = process.env.REFILL_CHECK_TZ || "Asia/Kolkata";

    if (!cron.validate(schedule)) {
        console.error(`[refill-check] invalid cron expression "${schedule}" — job not started`);
        return null;
    }

    const task = cron.schedule(schedule, runRefillCheck, { timezone });
    console.log(`[refill-check] scheduled "${schedule}" (${timezone})`);
    return task;
};

module.exports = { runRefillCheck, startRefillCheckJob };
