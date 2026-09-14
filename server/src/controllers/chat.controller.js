const chatService = require("../services/chat.service");
const doctorService = require("../services/doctor.service");
const { successResponse, errorResponse } = require("../utils/response.utils");

/**
 * Both handlers log the real error and return a fixed sentence.
 *
 * The thrown message here comes from an upstream SDK and routinely names the
 * provider, the model, a quota state or a URL with the API key still on it —
 * detail that belongs in the server log, not in a patient's app.
 */

exports.chat = async (req, res) => {
    try {
        const result = await chatService.chat(req.validatedBody);

        return successResponse(res, 200, "Answer generated", result);
    } catch (error) {
        console.error("[chat]", error);
        return errorResponse(res, 502, "The assistant is unavailable right now. Please try again shortly.");
    }
};

exports.doctors = async (req, res) => {
    try {
        const result = await doctorService.findNearbyDoctors(req.validatedBody);

        return successResponse(res, 200, "Doctors found", result);
    } catch (error) {
        console.error("[doctors]", error);
        return errorResponse(res, 502, "Couldn't search for doctors right now. Please try again shortly.");
    }
};
