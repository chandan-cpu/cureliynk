import api from "./api";

/**
 * Fetch location autocomplete suggestions as the user types.
 * Powered by OpenStreetMap Nominatim — free, no API key needed.
 *
 * @param {string} query  - partial address typed by the user
 * @param {number} limit  - max suggestions to return (default 7)
 * @returns {Array<{ placeId, label, shortLabel, lat, lng, type, address }>}
 */
export const searchLocationSuggestions = async (query, limit = 7) => {
  if (!query || query.trim().length < 2) return [];
  const response = await api.get("/api/v1/location/autocomplete", {
    params: { query, limit },
  });
  return response.data.suggestions || [];
};

/**
 * Convert a human-readable address / city name to lat/lng
 * using the server's existing geocode endpoint.
 *
 * @param {string} address - e.g. "Ranchi" or "MG Road, Bangalore"
 * @returns {{ lat: number, lng: number, address: string }}
 */
export const geocodeAddress = async (address) => {
  const response = await api.post("/api/v1/location/geocode", { address });
  const data = response.data;

  if (!data.success) {
    throw new Error(data.message || "Could not find that location.");
  }

  return {
    lat: data.location.lat,
    lng: data.location.lng,
    address: data.address,
  };
};

/**
 * Rough city-level location from the user's IP address.
 * Uses the free ipapi.co JSON endpoint (no API key required).
 *
 * @returns {{ lat: number, lng: number, city: string, region: string }}
 */
export const getLocationByIP = async () => {
  const response = await fetch("https://ipapi.co/json/", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("IP-based location detection failed.");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.reason || "IP geolocation unavailable.");
  }

  return {
    lat: data.latitude,
    lng: data.longitude,
    city: data.city || "Unknown",
    region: data.region || "",
  };
};
