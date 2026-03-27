/**
 * After GET /api/ai/models, choose the Select value. API uses unique ids like "azure1::gpt-4o-mini"
 * vs "openai1::gpt-4o-mini" so Azure and OpenAI are distinct when the technical name matches.
 * Migrates legacy stored ids that were only the bare name (e.g. "gpt-4o-mini").
 */
export function resolveAiModelSelection(previousId, models) {
  const list = Array.isArray(models) ? models : [];
  if (!list.length) return "";
  const prev = typeof previousId === "string" ? previousId.trim() : "";
  if (prev && list.some((m) => m && m.id === prev)) return prev;

  const sep = "::";
  if (prev && !prev.includes(sep)) {
    const matches = list.filter(
      (m) => typeof m?.id === "string" && (m.id === prev || m.id.endsWith(`${sep}${prev}`)),
    );
    if (matches.length === 1) return matches[0].id;
    if (matches.length > 1) return matches[0].id;
  }

  return list[0]?.id || "";
}
