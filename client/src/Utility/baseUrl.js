import axios from "axios";

// Backend base URL (without trailing slash).
// - In dev, leave VITE_BACKEND_BASE_URL unset and Vite will proxy `/api/*` to the backend (see vite.config.js).
// - In production build, set VITE_BACKEND_BASE_URL to something like `https://your-backend.example.com`.
const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || (import.meta.env.DEV ? "" : "http://20.244.24.90:9088");

export const baseUrl = `${BACKEND_BASE_URL}/api/data`;
export const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL || "http://20.244.24.90:8082";

export const adminConsoleBaseUrl =
  `${BACKEND_BASE_URL}/api/admin`;
// 20.247.196.202:8086

export const adminSaveBaseUrl =
  `${BACKEND_BASE_URL}/api/admin`;

export const adminBaseUrl = `${BACKEND_BASE_URL || "http://20.244.24.90:9088"}`;

export const dataRegisterUrl =
  `${BACKEND_BASE_URL}/api/admin`;

// Configure axios to include cookies in all requests
axios.defaults.withCredentials = true;

export const axiosDefaultHeader = (token) => {
  axios.defaults.headers.Authorization = `Bearer ${token}`;
};
