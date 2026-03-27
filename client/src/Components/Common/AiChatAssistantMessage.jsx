import React, { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@mui/material";
import { Sparkles } from "lucide-react";
import { AiChatContextStrip } from "./AiInsightContent";
import { extractKpiCandidatesFromAnswer, normalizeKpiTitle } from "../../Utils/aiChatKpiExtract";

/**
 * Single assistant bubble: conversational text + insight-style context strip + per-line KPI picks.
 */
export default function AiChatAssistantMessage({
  message,
  kpiTitleActions = {},
  onToggleKpiLine,
  kpiPanelHelpText,
  onMessageFeedback,
  onAddToInsight,
  showContextFromInsights = true,
  showAddToDashboardKpis = true,
}) {
  const charts = message?.charts;
  const kpisSnapshot = message?.kpisSnapshot;
  const showKpiPanel =
    showAddToDashboardKpis && message?.enableKpiPanel !== false && typeof onToggleKpiLine === "function";

  const kpiOptions = useMemo(() => {
    if (Array.isArray(kpisSnapshot) && kpisSnapshot.length > 0) {
      const out = [];
      const seen = new Set();
      for (const kpi of kpisSnapshot) {
        const title = String(kpi?.title || "").trim();
        if (!title) continue;
        const key = normalizeKpiTitle(title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const value = kpi?.value !== undefined && kpi?.value !== null ? String(kpi.value).trim() : "";
        const label = value ? `${title}: ${value}` : title;
        out.push({
          key,
          title,
          label,
          description: String(kpi?.description || "").trim(),
          value,
        });
      }
      if (out.length > 0) return out;
    }

    return extractKpiCandidatesFromAnswer(message?.content).map((line) => {
      const title = String(line || "").trim();
      return {
        key: normalizeKpiTitle(title),
        title,
        label: title,
        description: "",
        value: "",
      };
    });
  }, [kpisSnapshot, message?.content]);

  const [selectedFeedback, setSelectedFeedback] = useState(message?.feedbackType || "");
  const [addingInsight, setAddingInsight] = useState(false);

  useEffect(() => {
    setSelectedFeedback(message?.feedbackType || "");
  }, [message?.feedbackType]);

  const handleFeedback = (feedbackType) => {
    setSelectedFeedback(feedbackType);
    onMessageFeedback?.(message, feedbackType);
  };

  const handleAddToInsight = async () => {
    if (message?.addedToInsights || addingInsight || typeof onAddToInsight !== "function") return;
    try {
      setAddingInsight(true);
      await onAddToInsight(message);
    } finally {
      setAddingInsight(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 ring-1 ring-violet-200/80">
          <Sparkles size={14} strokeWidth={2} aria-hidden />
        </span>
        <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Assistant</span>
      </div>
      <div className="whitespace-pre-wrap break-words text-slate-800 leading-relaxed text-[13px]">{message?.content}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            selectedFeedback === "helpful"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => handleFeedback("helpful")}
        >
          Helpful
        </button>
        <button
          type="button"
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            selectedFeedback === "not_helpful"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => handleFeedback("not_helpful")}
        >
          Not helpful
        </button>
        <button
          type="button"
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            selectedFeedback === "irrelevant"
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => handleFeedback("irrelevant")}
        >
          Irrelevant
        </button>
        {typeof onAddToInsight === "function" && (
          <button
            type="button"
            className={`ml-auto rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              message?.addedToInsights
                ? "border-violet-200 bg-violet-50 text-violet-600 cursor-not-allowed"
                : "border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
            }`}
            onClick={handleAddToInsight}
            disabled={message?.addedToInsights || addingInsight}
          >
            {message?.addedToInsights ? "Added to insight" : addingInsight ? "Adding..." : "Add to insight"}
          </button>
        )}
      </div>

      {showContextFromInsights && (
        <AiChatContextStrip charts={charts} kpisSnapshot={kpisSnapshot} maxCharts={2} />
      )}

      {showKpiPanel && kpiOptions.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-indigo-50/30 p-3 shadow-sm ring-1 ring-violet-100/40">
          <div className="text-[11px] font-semibold text-violet-950 mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-violet-600 opacity-80" aria-hidden />
            Add to dashboard KPIs
          </div>
          <p className="text-[10px] text-violet-900/75 mb-2 leading-relaxed">
            {kpiPanelHelpText || (
              <>
                Tick lines to queue for the next run. Use <strong className="text-violet-950">Refresh insights</strong>{" "}
                to apply.
              </>
            )}
          </p>
          <ul className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {kpiOptions.map((item) => {
              const checked = kpiTitleActions[item.key]?.action === "add";
              return (
                <li
                  key={item.key}
                  className="flex items-start gap-2 rounded-lg bg-white border border-slate-200/80 px-2.5 py-1.5 shadow-sm"
                >
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(e) => onToggleKpiLine?.(item.title, e.target.checked)}
                    sx={{ p: 0.25, mt: -0.25 }}
                  />
                  <span className="text-xs text-gray-800 leading-snug flex-1 min-w-0 break-words">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
