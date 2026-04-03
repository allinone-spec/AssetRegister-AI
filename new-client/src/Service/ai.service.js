import axios from "axios";

// Base URL for the AI sidecar: single override, or local (dev) / server (prod) from .env
const AI_BASE_URL =
  import.meta.env.VITE_AI_BASE_URL ||
  (import.meta.env.DEV
    ? (import.meta.env.VITE_AI_BASE_URL_LOCAL || "http://localhost:9090/api/ai")
    : (import.meta.env.VITE_AI_BASE_URL_SERVER || "http://localhost:9090/api/ai"));

/** Ceiling for long-running AI routes so the UI does not spin forever if the sidecar hangs. */
const AI_ANALYZE_TIMEOUT_MS = 900000;

const aiApi = axios.create({
  baseURL: AI_BASE_URL,
});

// Forward the same Bearer token the app uses so the AI service can call backend APIs as the user
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Trigger AI analysis for a given page / dataset.
 * The backend AI service is responsible for calling existing Spring Boot APIs
 * (no direct DB access) and using full, non-paginated data for analysis.
 */
export const analyzeDataset = async (payload) => {
  const response = await aiApi.post("/analyze", payload, { timeout: AI_ANALYZE_TIMEOUT_MS });
  return response.data;
};

/**
 * Send a chat message for conversational analysis over the same data.
 */
export const chatWithData = async (payload) => {
  const response = await aiApi.post("/chat", payload);
  return response.data;
};

/**
 * Global conversational assistant (cross-console).
 */
export const globalChat = async (payload) => {
  const response = await aiApi.post("/global-chat", payload);
  return response.data;
};

export const clearGlobalChatSession = async (payload) => {
  const response = await aiApi.post("/global-chat/clear", payload);
  return response.data;
};

/** Admin: load configurable LLM system prompts (defaults + overrides). Pass { orgId, userId } for user-layer prompts. */
export const fetchPromptConfig = async (params = {}) => {
  const response = await aiApi.get("/prompt-config", { params });
  return response.data;
};

/** Admin: save or clear (null / blank removes override) prompt sections. */
export const savePromptConfig = async (payload) => {
  const response = await aiApi.put("/prompt-config", payload);
  return response.data;
};

export const saveUserPromptConfig = async (payload) => {
  const response = await aiApi.put("/prompt-config/user", payload);
  return response.data;
};

export const fetchUserApiKeys = async (orgId, userId) => {
  const response = await aiApi.get("/user/api-keys", { params: { orgId, userId } });
  return response.data;
};

export const saveUserApiKeys = async (payload) => {
  const response = await aiApi.put("/user/api-keys", payload);
  return response.data;
};

export const clearUserApiKeys = async (payload) => {
  const response = await aiApi.post("/user/api-keys/clear", payload);
  return response.data;
};

/** Admin: read AI model + key settings. */
export const fetchAiAdminSettings = async () => {
  const response = await aiApi.get("/admin/settings");
  return response.data;
};

/** Admin: save AI model + key settings. */
export const saveAiAdminSettings = async (payload) => {
  const response = await aiApi.put("/admin/settings", payload);
  return response.data;
};

/**
 * Full reset: chat, feedback, cached analysis, and dataset snapshot for this scope (e.g. model switch).
 */
export const clearChatSession = async (payload) => {
  const response = await aiApi.post("/chat/clear", payload);
  return response.data;
};

/**
 * Clear chat messages + insight feedback only; keeps cached analysis until Refresh insights.
 * Matches the Insight panel "Clear memory" button.
 */
export const clearAiMemory = async (payload) => {
  const response = await aiApi.post("/chat/clear-memory", payload);
  return response.data;
};

/**
 * Clear only the chat thread (messages) for this user/page/dataset.
 * Keeps insight feedback (helpful / not helpful / irrelevant) for the session.
 */
export const clearChatThread = async (payload) => {
  const response = await aiApi.post("/chat/clear-thread", payload);
  return response.data;
};

/**
 * Fetch list of available AI models (Ollama, OpenAI, Azure, etc.).
 */
export const fetchAiModels = async () => {
  const response = await aiApi.get("/models");
  return response.data;
};

/**
 * KPI discovery only (same payload as analyze).
 */
export const fetchKpis = async (payload) => {
  const response = await aiApi.post("/kpis", payload);
  return response.data;
};

/**
 * Trend and change detection (current vs previous snapshot).
 */
export const fetchTrends = async (payload) => {
  const response = await aiApi.post("/trends", payload);
  return response.data;
};

/**
 * Anomaly signals (high nulls, dominant values, etc.).
 */
export const fetchAnomalies = async (payload) => {
  const response = await aiApi.post("/anomalies", payload);
  return response.data;
};

/**
 * Recommendations only (same payload as analyze).
 */
export const fetchRecommendations = async (payload) => {
  const response = await aiApi.post("/recommendations", payload);
  return response.data;
};

/**
 * Submit feedback on a KPI (useful / not useful) for learning.
 */
export const submitFeedback = async (payload) => {
  const response = await aiApi.post("/feedback", payload);
  return response.data;
};

/**
 * Submit insight-level feedback (Helpful / Not Helpful / Irrelevant).
 * Payload: { orgId, userId, pageId, category, filters, kpiId, useful, comment?, insightType?, feedbackType? }
 */
export const submitInsightFeedback = async (payload) => {
  const response = await aiApi.post("/feedback", payload);
  return response.data;
};

/**
 * Invalidate cached analysis for this dataset so the next analyze re-runs with same data.
 * Use same payload as analyze (orgId, userId, pageId, category, filters).
 */
export const invalidateAnalysisCache = async (payload) => {
  const response = await aiApi.post("/analysis/invalidate", payload);
  return response.data;
};

export default aiApi;

