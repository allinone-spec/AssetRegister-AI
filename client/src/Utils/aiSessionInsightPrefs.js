const PREFIX = "ai-insight-hidden-ids";

export function hiddenInsightsSessionKey(userId, pageId, category) {
  const uid = userId || "anonymous";
  const pg = String(pageId || "").replace(/^\//, "");
  const cat = String(category || "generic");
  return `${PREFIX}:${uid}:${pg}:${cat}`;
}

export function loadHiddenInsightIds(userId, pageId, category) {
  try {
    const raw = sessionStorage.getItem(hiddenInsightsSessionKey(userId, pageId, category));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export function persistHiddenInsightIds(userId, pageId, category, ids) {
  try {
    const unique = [...new Set((ids || []).map(String))];
    sessionStorage.setItem(hiddenInsightsSessionKey(userId, pageId, category), JSON.stringify(unique));
  } catch {
    /* ignore quota */
  }
}

export function clearHiddenInsightIds(userId, pageId, category) {
  try {
    sessionStorage.removeItem(hiddenInsightsSessionKey(userId, pageId, category));
  } catch {
    /* ignore */
  }
}
