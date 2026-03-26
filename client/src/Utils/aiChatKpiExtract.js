/**
 * Shared helpers for "Add KPI" from AI chat answers.
 */

export const normalizeKpiTitle = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Extract many distinct KPI-ish lines from an assistant reply (not just top 3).
 * Each line can be toggled individually in the chat UI.
 */
export function extractKpiCandidatesFromAnswer(text) {
  const raw = String(text || "");
  const lines = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const scored = lines
    .map((line) => {
      const clean = line.replace(/^[-*•\d.)\s]+/, "").trim();
      if (clean.length < 12 || clean.length > 220) return null;
      const hasKpiWord = /\bkpi|metric|ratio|rate|score|coverage|count|trend|avg|average|total|median|p\d{1,2}\b|%\b/i.test(
        clean,
      );
      const hasNum = /\d/.test(clean);
      const score =
        (hasKpiWord ? 4 : 0) +
        (hasNum ? 2 : 0) +
        (clean.length >= 18 && clean.length <= 160 ? 1 : 0);
      if (score < 3 && !hasNum) return null;
      return { clean, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const byKey = new Map();
  for (const x of scored) {
    const k = normalizeKpiTitle(x.clean);
    if (!k || k.length < 6) continue;
    if (!byKey.has(k)) byKey.set(k, x.clean);
    if (byKey.size >= 24) break;
  }

  let picks = [...byKey.values()];
  if (!picks.length) {
    const sentences = raw
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 15 && s.length <= 140 && /\d/.test(s));
    picks = [...new Set(sentences)].slice(0, 5);
  }

  return picks.slice(0, 15);
}
