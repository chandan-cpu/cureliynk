const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validateRequest");
const { chatSchema } = require("../validators/chat.validator");
const { doctorSchema } = require("../validators/doctor.validator");

/**
 * Both routes are private.
 *
 * Every call spends money with a third party — `/` reaches Gemini and
 * `/doctors` runs a Google Places text search — so leaving them open meant
 * anyone who found the URL could run up the bill, with no account to rate
 * limit or revoke. The screens that call them (Ask AI, doctor results) sit
 * behind the app's auth guard and always have a token, so requiring one costs
 * the shipping app nothing.
 */
router.use(authenticate);

router.post("/", validate(chatSchema), chatController.chat);
router.post("/doctors", validate(doctorSchema), chatController.doctors);

module.exports = router;
