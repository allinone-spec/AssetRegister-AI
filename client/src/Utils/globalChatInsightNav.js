export const GLOBAL_CHAT_INSIGHT_NAV_KEY = "global-chat-insight-nav-v1";

const normalizeRoute = (route) => {
  const s = String(route || "").trim();
  if (!s) return "";
  return s.startsWith("/") ? s : `/${s}`;
};

export const saveGlobalChatInsightNav = (payload) => {
  try {
    sessionStorage.setItem(
      GLOBAL_CHAT_INSIGHT_NAV_KEY,
      JSON.stringify({
        route: normalizeRoute(payload?.route),
        objectId: payload?.objectId ?? null,
        objectName: payload?.objectName ?? "",
        kpis: Array.isArray(payload?.kpis) ? payload.kpis : [],
        createdAt: Date.now(),
      }),
    );
  } catch {
    // ignore storage errors
  }
};

export const consumeGlobalChatInsightNavForRoute = (route) => {
  try {
    const raw = sessionStorage.getItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (normalizeRoute(parsed?.route) !== normalizeRoute(route)) return null;
    sessionStorage.removeItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    return parsed;
  } catch {
    return null;
  }
};

