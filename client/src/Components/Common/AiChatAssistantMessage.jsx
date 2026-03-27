import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { AiChatContextStrip } from "./AiInsightContent";

/**
 * Single assistant bubble: conversational text + insight-style context strip + per-line KPI picks.
 */
export default function AiChatAssistantMessage({
  message,
  onMessageFeedback,
  onAddToInsight,
  showContextFromInsights = true,
  showAnswerActions = true,
}) {
  const charts = message?.charts;
  const kpisSnapshot = message?.kpisSnapshot;

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
      {showAnswerActions && (
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
      )}

      {showContextFromInsights && (
        <AiChatContextStrip charts={charts} kpisSnapshot={kpisSnapshot} maxCharts={2} />
      )}
    </>
  );
}
