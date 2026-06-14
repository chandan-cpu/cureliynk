import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";
import { sendChatMessage } from "../../services/chatbotService";
import { getNearbyDoctors } from "../../services/doctorService";

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
  status: "idle",
  error: "",
  doctorSuggestions: [],
  doctorStatus: "idle",
  doctorError: "",
  doctorDepartment: "",
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

const chatbotSlice = createSlice({
  name: "chatbot",
  initialState,
  reducers: {
    setLocation(state, action) {
      state.location = action.payload.location;
      state.locationLabel = action.payload.label;
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
  },
  extraReducers: (builder) => {
    builder
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
      });
  },
});

export const {
  setLocation,
  setLocationError,
  clearLocationError,
  resetChatError,
} = chatbotSlice.actions;

export default chatbotSlice.reducer;