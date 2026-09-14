const express = require("express");
const router = express.Router();

const { reverseGeocode, geocode, autocomplete } = require("../controllers/locationController");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * Private. These forward to Nominatim, whose usage policy attributes traffic
 * to this server's IP — an open relay here gets *us* blocked, not the caller.
 * The mobile app resolves addresses with the device's own geocoder and never
 * calls these, so an account requirement affects only server-side callers.
 */
router.use(authenticate);

router.get("/autocomplete", autocomplete);
router.post("/reverse-geocode", reverseGeocode);
router.post("/geocode", geocode);

module.exports = router;
