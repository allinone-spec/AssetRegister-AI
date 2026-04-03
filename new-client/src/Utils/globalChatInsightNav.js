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

/**
 * Single key for comparing saved "Go to insight" routes with DataTable `aiInsightPathname`
 * (virtual paths for shell UIs must match navigation from GlobalChatbot).
 */
export const normalizeInsightNavRoute = (route) => {
  let p = canonicalInsightTargetRoute(route);
  const q = p.indexOf("?");
  if (q >= 0) {
    p = p.slice(0, q);
  }
  if (!p) return "";

  if (p === "/data-console/reports/original-source" || p === "/data-console/reports/by-ar-resource") {
    return "/data-console/reports";
  }
  // Tabbed Register (/data-console/register?tab=detailed) ↔ AI virtual path …/register/detailed
  if (p === "/data-console/register") {
    return "/data-console/register/detailed";
  }
  if (p === "/data-console/Security") {
    return "/data-console/security";
  }
  return p;
};

export const saveGlobalChatInsightNav = (payload) => {
  const route = canonicalInsightTargetRoute(payload?.route);
  const base = {
    route,
    objectId: payload?.objectId ?? null,
    objectName: payload?.objectName ?? "",
    kpis: Array.isArray(payload?.kpis) ? payload.kpis : [],
    addedInsights: Array.isArray(payload?.addedInsights) ? payload.addedInsights : [],
    createdAt: Date.now(),
  };
  if (payload?.seedAnalysis != null && typeof payload.seedAnalysis === "object") {
    base.seedAnalysis = payload.seedAnalysis;
  }
  try {
    let toStore = base;
    let raw = JSON.stringify(toStore);
    if (raw.length > 4_500_000 && toStore.seedAnalysis) {
      const { seedAnalysis: _s, ...rest } = toStore;
      toStore = rest;
      raw = JSON.stringify(toStore);
    }
    sessionStorage.setItem(GLOBAL_CHAT_INSIGHT_NAV_KEY, raw);
  } catch {
    try {
      delete base.seedAnalysis;
      sessionStorage.setItem(GLOBAL_CHAT_INSIGHT_NAV_KEY, JSON.stringify(base));
    } catch {
      // ignore storage errors
    }
  }
};

/** Match saved nav to `route` without removing (use with `clearGlobalChatInsightNav` after UI applies). */
export const peekGlobalChatInsightNavForRoute = (route) => {
  try {
    const raw = sessionStorage.getItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const saved = normalizeInsightNavRoute(parsed?.route);
    const here = normalizeInsightNavRoute(route);
    if (saved !== here) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearGlobalChatInsightNav = () => {
  try {
    sessionStorage.removeItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
  } catch {
    // ignore
  }
};

export const consumeGlobalChatInsightNavForRoute = (route) => {
  const parsed = peekGlobalChatInsightNavForRoute(route);
  if (!parsed) return null;
  clearGlobalChatInsightNav();
  return parsed;
};

const REPORTS_VIRTUAL_JOB_ROUTE_RE =
  /^\/data-console\/reports\/(original-source|by-ar-resource)\/jobs\/(.+)$/;

/**
 * Read job name from saved "Go to insight" payload without consuming.
 * Used when the hub URL only has `?source=…` (no `job` param), e.g. after a full reload when router state is lost.
 */
export function peekReportJobFromSavedInsightNav(sourceSegment) {
  if (!sourceSegment) return null;
  try {
    const raw = sessionStorage.getItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const route = canonicalInsightTargetRoute(parsed?.route || "");
    const m = REPORTS_VIRTUAL_JOB_ROUTE_RE.exec(route);
    if (!m || m[1] !== sourceSegment) return null;
    const encoded = m[2];
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  } catch {
    return null;
  }
}

const SECURITY_VIRTUAL_SECTION_RE =
  /^\/data-console\/security\/(users|roles|groups|permission)$/;

/**
 * Sub id for `?section=` on `/data-console/security` (permissions → "permissions").
 */
export function peekSecuritySectionFromSavedInsightNav() {
  try {
    const raw = sessionStorage.getItem(GLOBAL_CHAT_INSIGHT_NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const route = canonicalInsightTargetRoute(parsed?.route || "");
    const m = SECURITY_VIRTUAL_SECTION_RE.exec(route);
    if (!m) return null;
    return m[1] === "permission" ? "permissions" : m[1];
  } catch {
    return null;
  }
}
