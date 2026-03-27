export const GLOBAL_CHAT_INSIGHT_NAV_KEY = "global-chat-insight-nav-v1";

const normalizeRoute = (route) => {
  const s = String(route || "").trim();
  if (!s) return "";
  const withSlash = s.startsWith("/") ? s : `/${s}`;
  return withSlash.replace(/\/+$/, "") || "/";
};

/**
 * Collapse legacy / wrong paths so "Go to insight" and consumption agree with real AppRoute paths.
 */
export const canonicalInsightTargetRoute = (route) => {
  let p = normalizeRoute(route);
  const adminMap = {
    "/admin-console/overview": "/admin-console",
    "/admin-console/overview/import-status": "/admin-console/import-status",
    "/admin-console/overview/saved-jobs": "/admin-console/saved-jobs",
    "/admin-console/overview/ar-mapping": "/admin-console/ar-mapping",
    "/admin-console/overview/ar-rules": "/admin-console/ar-rules",
  };
  if (adminMap[p]) return adminMap[p];
  if (p === "/data-console/overview") return "/data-console";
  if (p === "/data-console/security/permissions") return "/data-console/security/permission";
  return p;
};

export const saveGlobalChatInsightNav = (payload) => {
  try {
    const route = canonicalInsightTargetRoute(payload?.route);
    sessionStorage.setItem(
      GLOBAL_CHAT_INSIGHT_NAV_KEY,
      JSON.stringify({
        route,
        objectId: payload?.objectId ?? null,
        objectName: payload?.objectName ?? "",
        kpis: Array.isArray(payload?.kpis) ? payload.kpis : [],
        addedInsights: Array.isArray(payload?.addedInsights) ? payload.addedInsights : [],
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
    const saved = canonicalInsightTargetRoute(parsed?.route);
    const here = canonicalInsightTargetRoute(route);
    if (saved !== here) return null;
    sessionStorage.removeItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    return parsed;
  } catch {
    return null;
  }
};
