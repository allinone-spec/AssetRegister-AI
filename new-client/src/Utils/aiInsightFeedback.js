/**
 * True when a "Not helpful" free-text comment clearly means the user wants the insight/panel gone,
 * not a revised version. Matches backend _comment_implies_hide_insight.
 */
export function commentImpliesHideInsight(comment) {
  const t = String(comment || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t) return false;
  const patterns = [
    /\b(don't|dont|do not)\s+need\b/,
    /\b(don't|dont|do not)\s+want\b/,
    /\bno\s+need\b/,
    /\bnot\s+needed\b/,
    /\b(remove|hide|skip|dismiss)\b/,
    /\bunnecessary\b/,
    /\buseless\b/,
    /\b(don't|dont|do not)\s+show\b/,
  ];
  return patterns.some((re) => re.test(t));
}
