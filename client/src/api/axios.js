import axios from "axios";

const api = axios.create({
  baseURL: "http://10.48.179.91:5000/api/v1/auth",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;