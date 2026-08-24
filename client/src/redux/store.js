import { configureStore } from "@reduxjs/toolkit";
import chatbotReducer from "./chatbot/chatbotSlice";
import authReducer from "./auth/authSlice";

const store = configureStore({
	reducer: {
		chatbot: chatbotReducer,
		auth: authReducer,
	},
});

export default store;
