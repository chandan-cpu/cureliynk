const DoseLog = require("../models/DoseLog");

/**
 * Caregiver escalation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERY IS NOT WIRED UP.
 *
 * This project has no mail transport and no push infrastructure: there is no
 * nodemailer dependency, no SMTP credentials, and no stored Expo push tokens.
 * Rather than pretend to send — which would leave callers believing a caregiver
 * had been contacted when nothing left the process — this records the
 * escalation on the dose log and returns `delivered: false`.
 *
 * The escalation is durable and readable through `GET /dose-logs`, so the
 * history screen can surface "caregiver alerted" today. To actually deliver,
 * add a transport and replace the marked block below.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const alertCaregiver = async ({ user, doseLog, medication }) => {
    if (!user.caregiverEmail) {
        return { delivered: false, reason: "no_caregiver_email" };
    }

    // Recorded first, so the escalation survives even if a future transport
    // throws — a caregiver alert that was attempted is worth more in the log
    // than one silently dropped.
    await DoseLog.updateOne(
        { _id: doseLog._id },
        { $set: { caregiverAlertedAt: doseLog.caregiverAlertedAt ?? new Date() } }
    );

    const message =
        `${user.name} may have missed a dose of ` +
        `${medication?.name ?? "their medication"}` +
        `${medication?.dosage ? ` (${medication.dosage})` : ""}` +
        ` scheduled for ${new Date(doseLog.scheduledAt).toISOString()}.`;

    // ── Replace this block with a real transport ──────────────────────────────
    // await transporter.sendMail({
    //     to: user.caregiverEmail,
    //     subject: `Missed dose alert for ${user.name}`,
    //     text: message,
    // });
    // ──────────────────────────────────────────────────────────────────────────

    console.log(`[caregiver] NOT SENT (no transport configured) -> ${user.caregiverEmail}: ${message}`);

    return { delivered: false, reason: "no_transport_configured", recipient: user.caregiverEmail };
};

module.exports = { alertCaregiver };
