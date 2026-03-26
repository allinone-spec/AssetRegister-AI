import React, { useMemo } from "react";
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
}) {
  const candidates = useMemo(
    () => extractKpiCandidatesFromAnswer(message?.content),
    [message?.content],
  );

  const charts = message?.charts;
  const kpisSnapshot = message?.kpisSnapshot;

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 ring-1 ring-violet-200/80">
          <Sparkles size={14} strokeWidth={2} aria-hidden />
        </span>
        <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Assistant</span>
      </div>
      <div className="whitespace-pre-wrap break-words text-slate-800 leading-relaxed text-[13px]">{message?.content}</div>

      <AiChatContextStrip charts={charts} kpisSnapshot={kpisSnapshot} maxCharts={2} />

      {candidates.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-indigo-50/30 p-3 shadow-sm ring-1 ring-violet-100/40">
          <div className="text-[11px] font-semibold text-violet-950 mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-violet-600 opacity-80" aria-hidden />
            Add to dashboard KPIs
          </div>
          <p className="text-[10px] text-violet-900/75 mb-2 leading-relaxed">
            Tick lines to queue for the next run. Use <strong className="text-violet-950">Refresh insights</strong> to
            apply.
          </p>
          <ul className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {candidates.map((line) => {
              const key = normalizeKpiTitle(line);
              const checked = kpiTitleActions[key]?.action === "add";
              return (
                <li
                  key={key}
                  className="flex items-start gap-2 rounded-lg bg-white border border-slate-200/80 px-2.5 py-1.5 shadow-sm"
                >
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(e) => onToggleKpiLine?.(line, e.target.checked)}
                    sx={{ p: 0.25, mt: -0.25 }}
                  />
                  <span className="text-xs text-gray-800 leading-snug flex-1 min-w-0 break-words">{line}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
