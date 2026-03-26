import React, { useMemo } from "react";
import { Checkbox } from "@mui/material";
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
      <span className="font-semibold text-xs uppercase tracking-wide opacity-80 block mb-1">AI</span>
      <div className="whitespace-pre-wrap break-words text-gray-800 leading-relaxed">{message?.content}</div>

      <AiChatContextStrip charts={charts} kpisSnapshot={kpisSnapshot} maxCharts={2} />

      {candidates.length > 0 && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5">
          <div className="text-[11px] font-semibold text-indigo-900 mb-1.5">
            Add to dashboard KPIs
          </div>
          <p className="text-[10px] text-indigo-800/80 mb-2">
            Choose individual lines below. Use <strong>Refresh insights</strong> to apply.
          </p>
          <ul className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
            {candidates.map((line) => {
              const key = normalizeKpiTitle(line);
              const checked = kpiTitleActions[key]?.action === "add";
              return (
                <li
                  key={key}
                  className="flex items-start gap-2 rounded-lg bg-white/90 border border-indigo-100/80 px-2 py-1.5"
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
