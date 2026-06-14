import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";
import { sendChatMessage } from "../../services/chatbotService";
import { getNearbyDoctors } from "../../services/doctorService";
import {
  geocodeAddress as geocodeAddressService,
  getLocationByIP,
} from "../../services/locationService";

const initialState = {
  messages: [
    {
      id: nanoid(),
      role: "bot",
      content:
        "Hello! I am your Curelink AI health assistant. I'm here to help you and your family stay healthy. How are you feeling today?",
      meta: "10:02 AM",
    },
  ],
  location: null,
  locationLabel: "Add location",
  locationError: "",
  locationSource: "", // "gps" | "manual" | "ip" | ""
  status: "idle",
  error: "",
  doctorSuggestions: [],
  doctorStatus: "idle",
  doctorError: "",
  doctorDepartment: "",
  geocodeStatus: "idle", // "idle" | "loading" | "succeeded" | "failed"
  geocodeError: "",
  ipLocationStatus: "idle", // "idle" | "loading" | "succeeded" | "failed"
};

export const submitChatMessage = createAsyncThunk(
  "chatbot/submitChatMessage",
  async (payload, { rejectWithValue }) => {
    try {
      return await sendChatMessage(payload);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Failed to send message.";
      return rejectWithValue(message);
    }
  }
);

export const fetchNearbyDoctors = createAsyncThunk(
  "chatbot/fetchNearbyDoctors",
  async (payload, { rejectWithValue }) => {
    try {
      return await getNearbyDoctors(payload);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Failed to load doctors.";
      return rejectWithValue(message);
    }
  }
);

/**
 * Convert a typed address / city name to lat/lng via the server's geocode endpoint.
 */
export const geocodeAddress = createAsyncThunk(
  "chatbot/geocodeAddress",
  async (address, { rejectWithValue }) => {
    try {
      return await geocodeAddressService(address);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Could not find that location.";
      return rejectWithValue(message);
    }
  }
);

/**
 * Silently detect rough location from the user's IP address.
 * Used as an automatic fallback when GPS is unavailable.
 */
export const fetchIPLocation = createAsyncThunk(
  "chatbot/fetchIPLocation",
  async (_, { getState, rejectWithValue }) => {
    // Don't override a more accurate source
    const { location, locationSource } = getState().chatbot;
    if (location && (locationSource === "gps" || locationSource === "manual")) {
      return rejectWithValue("Better location already set.");
    }

    try {
      return await getLocationByIP();
    } catch (error) {
      return rejectWithValue(error.message || "IP location detection failed.");
    }
  }
);

const chatbotSlice = createSlice({
  name: "chatbot",
  initialState,
  reducers: {
    setLocation(state, action) {
      state.location = action.payload.location;
      state.locationLabel = action.payload.label;
      state.locationSource = action.payload.source || "gps";
      state.locationError = "";
    },
    setLocationError(state, action) {
      state.locationError = action.payload;
    },
    clearLocationError(state) {
      state.locationError = "";
    },
    resetChatError(state) {
      state.error = "";
    },
    clearGeocodeError(state) {
      state.geocodeError = "";
      state.geocodeStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Chat message ──────────────────────────────────────
      .addCase(submitChatMessage.pending, (state, action) => {
        state.status = "loading";
        state.error = "";
        state.messages.push({
          id: nanoid(),
          role: "user",
          content: action.meta.arg.message,
          meta: action.meta.arg.meta,
        });
      })
      .addCase(submitChatMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages.push({
          id: nanoid(),
          role: "bot",
          content: action.payload?.message || "I have received your message.",
          meta: action.payload?.recommendedDepartment
            ? `${action.payload.recommendedDepartment}${action.payload.urgencyLevel ? ` · ${action.payload.urgencyLevel}` : ""}`
            : "AI response",
          extra: action.payload,
        });
      })
      .addCase(submitChatMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Something went wrong.";
      })

      // ── Doctor search ─────────────────────────────────────
      .addCase(fetchNearbyDoctors.pending, (state) => {
        state.doctorStatus = "loading";
        state.doctorError = "";
        state.doctorSuggestions = [];
      })
      .addCase(fetchNearbyDoctors.fulfilled, (state, action) => {
        state.doctorStatus = "succeeded";
        state.doctorDepartment = action.payload?.department || "";
        state.doctorSuggestions = action.payload?.doctors || [];
      })
      .addCase(fetchNearbyDoctors.rejected, (state, action) => {
        state.doctorStatus = "failed";
        state.doctorError = action.payload || "Something went wrong.";
      })

      // ── Geocode address ───────────────────────────────────
      .addCase(geocodeAddress.pending, (state) => {
        state.geocodeStatus = "loading";
        state.geocodeError = "";
      })
      .addCase(geocodeAddress.fulfilled, (state, action) => {
        state.geocodeStatus = "succeeded";
        state.geocodeError = "";
        state.location = {
          lat: action.payload.lat,
          lng: action.payload.lng,
        };
        state.locationLabel = action.payload.address || "Manual location";
        state.locationSource = "manual";
        state.locationError = "";
      })
      .addCase(geocodeAddress.rejected, (state, action) => {
        state.geocodeStatus = "failed";
        state.geocodeError = action.payload || "Could not find that location.";
      })

      // ── IP-based location ─────────────────────────────────
      .addCase(fetchIPLocation.pending, (state) => {
        state.ipLocationStatus = "loading";
      })
      .addCase(fetchIPLocation.fulfilled, (state, action) => {
        state.ipLocationStatus = "succeeded";
        state.location = {
          lat: action.payload.lat,
          lng: action.payload.lng,
        };
        const city = action.payload.city || "";
        const region = action.payload.region || "";
        state.locationLabel = [city, region].filter(Boolean).join(", ") || "Detected location";
        state.locationSource = "ip";
        state.locationError = "";
      })
      .addCase(fetchIPLocation.rejected, (state) => {
        state.ipLocationStatus = "failed";
        // Silent failure — don't show error for background IP detection
      });
  },
});

export const {
  setLocation,
  setLocationError,
  clearLocationError,
  resetChatError,
  clearGeocodeError,
} = chatbotSlice.actions;

export default chatbotSlice.reducer;