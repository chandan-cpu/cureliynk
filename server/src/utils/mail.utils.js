const nodemailer = require("nodemailer");

let transporter = null;

const isMailConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
};

/**
 * A reset link is a single-use credential: whoever holds it can take the
 * account over. Escaped so a display name cannot inject markup into the mail,
 * and never written to the log outside development.
 */
const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

/**
 * In development SMTP is often not configured yet. Rather than blocking the
 * whole forgot-password flow on having a mail provider set up, fall back to
 * logging the link so the flow stays testable end-to-end locally.
 *
 * Never in production: there the same fallback would put a working account
 * takeover link into the log of a server whose logs a hosting dashboard shows
 * to everyone on the project, while telling the user their mail was sent.
 * Throwing instead lets the caller clear the token and report the failure —
 * see forgotPassword in controllers/auth.controller.js.
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
    if (!isMailConfigured()) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMTP is not configured; cannot send a password reset email.");
        }

        console.log(`[mail] SMTP not configured — password reset link for ${to}: ${resetUrl}`);
        return;
    }

    await getTransporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Reset your CureLiynk password",
        html: `
            <p>Hi ${escapeHtml(name)},</p>
            <p>We received a request to reset your CureLiynk password. This link expires in 15 minutes.</p>
            <p><a href="${resetUrl}">Reset your password</a></p>
            <p>If you did not request this, you can safely ignore this email — your password will not change.</p>
        `,
    });
};

module.exports = { sendPasswordResetEmail, isMailConfigured };
