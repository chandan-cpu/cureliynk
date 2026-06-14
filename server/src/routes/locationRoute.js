const express = require("express");
const router = express.Router();
const { reverseGeocode, geocode } = require("../controllers/locationController");

router.post("/reverse-geocode", reverseGeocode);
router.post("/geocode", geocode);

module.exports = router;