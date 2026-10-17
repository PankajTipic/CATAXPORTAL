import axios from "axios";
import { API_BASE_URL, buildApiUrl } from "../utils/config";

const api = axios.create({
  baseURL: buildApiUrl("/api"),
});

api.interceptors.request.use((config) => {
  // Normalize redundant /api if endpoint already starts with /api and baseURL ends with /api
  if (config.url && typeof config.url === "string") {
    if (config.url.startsWith("/api/") && config.baseURL?.endsWith("/api")) {
      config.url = config.url.replace(/^\/api/, "");
    }
  }

  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export { API_BASE_URL, buildApiUrl };
export default api;
