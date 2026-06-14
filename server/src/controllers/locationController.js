const { Client } = require("@googlemaps/google-maps-services-js");

const googleMapsClient = new Client({});

// Get address from coordinates (Reverse Geocoding)
const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const response = await googleMapsClient.reverseGeocode({
      params: {
        latlng: { lat, lng },
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const results = response.data.results;
    if (results.length > 0) {
      res.json({
        success: true,
        address: results[0].formatted_address,
        location: results[0].geometry.location,
        placeId: results[0].place_id,
      });
    } else {
      res.json({ success: false, message: "No address found" });
    }
  } catch (error) {
    console.error("Reverse geocode error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get coordinates from address (Geocoding)
const geocode = async (req, res) => {
  try {
    const { address } = req.body;

    const response = await googleMapsClient.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const results = response.data.results;
    if (results.length > 0) {
      res.json({
        success: true,
        location: results[0].geometry.location,
        address: results[0].formatted_address,
      });
    } else {
      res.json({ success: false, message: "Location not found" });
    }
  } catch (error) {
    console.error("Geocode error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  reverseGeocode,
  geocode,
};
