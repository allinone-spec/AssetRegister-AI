import React from "react";
import { CircularProgress } from "@mui/material";

/**
 * Admin Console home: operational metrics + AI narrative (not Data Console KPI widgets).
 */
export default function AdminConsoleHomeInsights({
  metrics = {},
  highlights = {},
  loading,
  error,
  importTrendFilter = null,
}) {
  const m = metrics || {};
  const h = highlights || {};

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-violet-100 bg-white px-4 py-12 text-slate-500 text-sm gap-3">
        <CircularProgress size={28} sx={{ color: "#6f2fe1" }} />
        <span>Loading Admin Console snapshot…</span>
      </div>
    );
  }

  const tiles = [
    { label: "Active jobs", value: m.activeJobsCount ?? "—" },
    { label: "Total jobs", value: m.totalJobs ?? "—" },
    { label: "No mapping", value: m.jobsWithoutMappingCount ?? "—" },
    { label: "No rules", value: m.jobsWithoutRulesCount ?? "—" },
    { label: "Failed (24h)", value: m.jobsFailedLast24HoursCount ?? "—" },
    {
      label: "Integration health",
      value: m.integrationHealthPercent != null ? `${m.integrationHealthPercent}%` : "—",
    },
    { label: "PK conflicts (objects)", value: (m.objectsWithConflictingPrimaryKeyMappings || []).length },
    { label: "Matching-key conflicts", value: (m.objectsWithConflictingMatchingKeys || []).length },
  ];

  const moduleStories = Array.isArray(h.moduleStories) ? h.moduleStories : [];

  const xd = importTrendFilter?.xDaysFilter;

  return (
    <div className="space-y-6">
      {xd?.xDays != null && importTrendFilter?.xFilter && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2.5 text-xs text-violet-950">
          <span className="font-semibold">Import Status request</span> is limited to the last{" "}
          <strong>{xd.xDays}</strong> day(s) using column(s):{" "}
          <span className="font-mono text-[11px] break-all">
            {(xd.columnNames || "").replace(/,/g, ", ") || "—"}
          </span>
          . Import activity counts and health metrics below follow this window.
        </div>
      )}

      {m.objectScope && (
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Object scope: <span className="text-slate-800">{m.objectScope}</span>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
            style={{ boxShadow: "0 2px 14px rgba(111,47,225,0.06)" }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{t.value}</div>
          </div>
        ))}
      </div>

      {h.executiveSummary && (
        <section
          className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/90 to-white p-5 md:p-6"
          style={{ boxShadow: "0 4px 24px rgba(111,47,225,0.08)" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-violet-800 mb-2">Executive summary</h2>
          <p className="text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
            {h.executiveSummary}
          </p>
        </section>
      )}

      {moduleStories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleStories.map((story, idx) => (
            <section
              key={`${story.module || idx}-${idx}`}
              className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
            >
              <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                {story.module || "Module"}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{story.title || "Highlights"}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                {(story.bullets || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {(h.watchlist || []).length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <h3 className="text-sm font-bold text-amber-900 mb-2">Watchlist</h3>
          <ul className="text-sm text-amber-950 space-y-1 list-disc pl-5">
            {h.watchlist.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(m.importActivityByJob || {}).length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Import activity by job (recent rows)</h3>
          <div className="max-h-48 overflow-y-auto text-sm space-y-1">
            {Object.entries(m.importActivityByJob)
              .slice(0, 20)
              .map(([job, count]) => (
                <div key={job} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                  <span className="text-slate-700 truncate">{job}</span>
                  <span className="text-slate-900 font-medium tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
