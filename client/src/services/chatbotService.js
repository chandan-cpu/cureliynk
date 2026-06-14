import api from "./api";

export const sendChatMessage = async (payload) => {
	const response = await api.post("/api/v1/chat", payload);
	return response.data.data;
};
