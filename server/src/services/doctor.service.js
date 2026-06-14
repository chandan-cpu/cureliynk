const axios = require("axios");

const DEPARTMENT_KEYWORDS = {
  Cardiology: "cardiologist",
  Dermatology: "dermatologist",
  Dentistry: "dentist",
  Ophthalmology: "eye doctor",
  ENT: "ent specialist",
  Orthopedics: "orthopedic doctor",
  Gynecology: "gynecologist",
  Pediatrics: "pediatrician",
  Psychiatry: "psychiatrist",
  "Emergency Medicine": "hospital emergency room",
  "General Medicine": "doctor",
};

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

exports.findNearbyDoctors = async ({ department, location, limit = 5 }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key is missing. Set GOOGLE_MAPS_API_KEY in server/.env.");
  }

  const departmentParts = String(department || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const preferredDepartment =
    departmentParts.find((part) => DEPARTMENT_KEYWORDS[part]) ||
    departmentParts[departmentParts.length - 1] ||
    department ||
    "General Medicine";

  const specialty =
    DEPARTMENT_KEYWORDS[preferredDepartment] ||
    DEPARTMENT_KEYWORDS[department] ||
    DEPARTMENT_KEYWORDS["General Medicine"];
  const query = `${specialty} near me`;

  const url = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const response = await axios.get(url, {
    params: {
      query,
      location: `${location.lat},${location.lng}`,
      radius: 10000,
      key: apiKey,
    },
  });

  const candidates = Array.isArray(response.data.results) ? response.data.results : [];

  const doctors = candidates.slice(0, limit).map((place) => {
    const placeLat = place.geometry?.location?.lat;
    const placeLng = place.geometry?.location?.lng;
    const distanceKm =
      typeof placeLat === "number" && typeof placeLng === "number"
        ? haversineDistanceKm(location.lat, location.lng, placeLat, placeLng)
        : null;

    return {
      name: place.name,
      address: place.formatted_address || place.vicinity || "Address not available",
      rating: place.rating || null,
      reviewsCount: place.user_ratings_total || 0,
      distanceKm: distanceKm ? Number(distanceKm.toFixed(1)) : null,
      placeId: place.place_id,
      mapsUrl: place.place_id
        ? `https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}&query=${encodeURIComponent(place.name)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`,
    };
  });

  return {
    department,
    specialty,
    location,
    doctors,
  };
};