import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  loginUser,
  registerUser,
  registerDoctor,
  logoutUser,
  getMe,
} from "../../services/authService";

// ─────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      // Only send email + password — backend auto-detects the role
      const { email, password } = credentials;
      const data = await loginUser({ email, password });
      // Persist tokens to localStorage
      if (data.data?.accessToken) {
        localStorage.setItem("accessToken", data.data.accessToken);
      }
      if (data.data?.refreshToken) {
        localStorage.setItem("refreshToken", data.data.refreshToken);
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (userData, { rejectWithValue }) => {
    try {
      const data = await registerUser(userData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed. Please try again."
      );
    }
  }
);

export const signupDoctor = createAsyncThunk(
  "auth/signupDoctor",
  async (doctorData, { rejectWithValue }) => {
    try {
      const data = await registerDoctor(doctorData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Doctor registration failed. Please try again."
      );
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logoutUser();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getMe();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user"
      );
    }
  }
);

// ─────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────

const hasToken = !!localStorage.getItem("accessToken");

const initialState = {
  user: null,
  role: null,
  accessToken: localStorage.getItem("accessToken") || null,
  isAuthenticated: hasToken,
  // True while the very first profile fetch runs on app boot (page refresh).
  // Route guards wait for this to become false before making decisions.
  initializing: hasToken, // if token exists we'll fetch profile on mount
  loading: false,
  error: null,
  successMessage: null,
};

// ─────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.successMessage = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.role = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.successMessage = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data?.user || null;
        state.role = action.payload.data?.user?.role || null;
        state.accessToken = action.payload.data?.accessToken || null;
        state.successMessage = "Login successful! Welcome back.";
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup User
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload.message || "Account created successfully! Please login.";
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup Doctor
    builder
      .addCase(signupDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload.message ||
          "Doctor registration submitted! Awaiting admin approval.";
      })
      .addCase(signupDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.role = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.successMessage = null;
        state.error = null;
      });

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initializing = false;
        state.user = action.payload.data?.user || null;
        state.role = action.payload.data?.user?.role || null;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.initializing = false;
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.accessToken = null;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  },
});

export const { clearError, clearSuccess, clearAuth } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthSuccess = (state) => state.auth.successMessage;
export const selectUserRole = (state) => state.auth.role;
export const selectInitializing = (state) => state.auth.initializing;

export default authSlice.reducer;
