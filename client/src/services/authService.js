import api from "./api";

// Register a new patient/user
export const registerUser = async (userData) => {
  const response = await api.post("/api/v1/auth/register/user", userData);
  return response.data;
};

// Register a new doctor
export const registerDoctor = async (doctorData) => {
  const response = await api.post("/api/v1/auth/register/doctor", doctorData);
  return response.data;
};

// Login (all roles: user, doctor, admin)
export const loginUser = async (credentials) => {
  const response = await api.post("/api/v1/auth/login", credentials);
  return response.data;
};

// Logout
export const logoutUser = async () => {
  const response = await api.post("/api/v1/auth/logout");
  return response.data;
};

// Get current user profile
export const getMe = async () => {
  const response = await api.get("/api/v1/auth/me");
  return response.data;
};

// Refresh access token
export const refreshToken = async (token) => {
  const response = await api.post("/api/v1/auth/refresh-token", {
    refreshToken: token,
  });
  return response.data;
};
