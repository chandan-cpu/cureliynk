const express = require("express");
const router = express.Router();
const { reverseGeocode, geocode, autocomplete } = require("../controllers/locationController");

router.get("/autocomplete", autocomplete);
router.post("/reverse-geocode", reverseGeocode);
router.post("/geocode", geocode);

module.exports = router;