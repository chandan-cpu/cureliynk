const axios = require("axios");

// Nominatim base URL (OpenStreetMap - free, no API key needed)
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = {
  "User-Agent": "CureLiynk-App/1.0 (healthcare app)",
  "Accept-Language": "en",
};

// ─── Autocomplete / Search Suggestions ────────────────────────────────────────
const autocomplete = async (req, res) => {
  try {
    const { query, limit = 7 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const response = await axios.get(`${NOMINATIM_BASE}/search`, {
      headers: NOMINATIM_HEADERS,
      params: {
        q: query,
        format: "json",
        addressdetails: 1,
        limit,
        countrycodes: "in", // restrict to India; remove to make global
        dedupe: 1,
      },
    });

    const suggestions = response.data.map((place) => ({
      placeId: place.place_id,
      label: place.display_name,
      shortLabel: buildShortLabel(place),
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      type: place.type,
      address: place.address,
    }));

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Geocode (address → lat/lng) ──────────────────────────────────────────────
const geocode = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    const response = await axios.get(`${NOMINATIM_BASE}/search`, {
      headers: NOMINATIM_HEADERS,
      params: {
        q: address,
        format: "json",
        addressdetails: 1,
        limit: 1,
      },
    });

    if (!response.data.length) {
      return res.json({ success: false, message: "Location not found" });
    }

    const place = response.data[0];
    res.json({
      success: true,
      location: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
      },
      address: place.display_name,
      placeId: place.place_id,
    });
  } catch (error) {
    console.error("Geocode error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reverse Geocode (lat/lng → address) ──────────────────────────────────────
const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng are required" });
    }

    const response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      headers: NOMINATIM_HEADERS,
      params: {
        lat,
        lon: lng,
        format: "json",
        addressdetails: 1,
      },
    });

    if (response.data.error) {
      return res.json({ success: false, message: response.data.error });
    }

    const place = response.data;
    res.json({
      success: true,
      address: place.display_name,
      location: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
      },
      placeId: place.place_id,
    });
  } catch (error) {
    console.error("Reverse geocode error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildShortLabel(place) {
  const a = place.address || {};
  const parts = [
    a.road || a.suburb || a.neighbourhood,
    a.city || a.town || a.village || a.county,
    a.state,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : place.display_name.split(",").slice(0, 2).join(",");
}

module.exports = { autocomplete, geocode, reverseGeocode };
