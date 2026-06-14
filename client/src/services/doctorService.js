import api from "./api";

export const getNearbyDoctors = async (payload) => {
  const response = await api.post("/api/v1/chat/doctors", payload);
  return response.data.data;
};