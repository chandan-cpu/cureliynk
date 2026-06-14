const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chat.controller");
const { validate } = require("../middleware/validateRequest");
const { chatSchema } = require("../validators/chat.validator");
const { doctorSchema } = require("../validators/doctor.validator");

router.post("/",validate(chatSchema), chatController.chat);
router.post("/doctors", validate(doctorSchema), chatController.doctors);

module.exports = router;