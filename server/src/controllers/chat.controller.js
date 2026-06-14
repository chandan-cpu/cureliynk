const chatService = require("../services/chat.service");
const doctorService = require("../services/doctor.service");

exports.chat = async (req, res) => {
  try {

    const result = await chatService.chat(req.body);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.doctors = async (req, res) => {
  try {
    const result = await doctorService.findNearbyDoctors(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};