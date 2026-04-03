import React from "react";
import { CircularProgress } from "@mui/material";
import {
  AR_FONT,
  AR_MONO,
  ArContentCard,
  ArStatTile,
  arCard,
  arSectionTitle,
} from "./consoleWelcomeTheme";

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
      <div
        className={`flex gap-3 px-5 py-4 text-sm text-red-900 ${arCard}`}
        style={{ fontFamily: AR_FONT }}
        role="alert"
      >
        <span className="shrink-0 font-bold">Couldn’t load insights</span>
        <span className="leading-relaxed">{error}</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 px-6 py-14 text-sm text-text-sub ${arCard}`}
        style={{ fontFamily: AR_FONT }}
      >
        <CircularProgress size={36} sx={{ color: "var(--accent)" }} />
        <div className="text-center space-y-1">
          <span className="block text-[15px] font-bold text-text-primary">Building your snapshot</span>
          <span className="text-xs">Operational metrics and AI narrative</span>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: "Active jobs", value: m.activeJobsCount },
    { label: "Total jobs", value: m.totalJobs },
    { label: "No mapping", value: m.jobsWithoutMappingCount },
    { label: "No rules", value: m.jobsWithoutRulesCount },
    { label: "Failed (24h)", value: m.jobsFailedLast24HoursCount },
    {
      label: "Integration health",
      value: m.integrationHealthPercent != null ? `${m.integrationHealthPercent}%` : null,
    },
    { label: "PK conflicts (objects)", value: (m.objectsWithConflictingPrimaryKeyMappings || []).length },
    { label: "Matching-key conflicts", value: (m.objectsWithConflictingMatchingKeys || []).length },
  ];

  const moduleStories = Array.isArray(h.moduleStories) ? h.moduleStories : [];

  const xd = importTrendFilter?.xDaysFilter;

  return (
    <div className="space-y-[14px]" style={{ fontFamily: AR_FONT }}>
      {xd?.xDays != null && importTrendFilter?.xFilter && (
        <div
          className={`border border-accent-muted bg-accent-dim px-4 py-3 text-xs leading-relaxed text-text-primary ${arCard}`}
        >
          <span className="font-bold text-accent">Import Status window</span> — last{" "}
          <strong>{xd.xDays}</strong> day(s), columns{" "}
          <span className="font-medium" style={{ fontFamily: AR_MONO }}>
            {(xd.columnNames || "").replace(/,/g, ", ") || "—"}
          </span>
          . Counts below follow this filter.
        </div>
      )}

      {m.objectScope && (
        <p className={`${arSectionTitle} !mb-0`}>
          Object scope · <span className="font-extrabold text-text-primary">{m.objectScope}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
        {tiles.map((t) => (
          <ArStatTile key={t.label} label={t.label} value={t.value} />
        ))}
      </div>

      {h.executiveSummary && (
        <section
          className={`relative overflow-hidden p-5 md:p-6 ${arCard} border-border-theme`}
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface) 55%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-dim"
            aria-hidden
          />
          <h2 className={`${arSectionTitle} relative z-[1] mb-3`}>Executive summary</h2>
          <p className="relative z-[1] text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
            {h.executiveSummary}
          </p>
        </section>
      )}

      {moduleStories.length > 0 && (
        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
          {moduleStories.map((story, idx) => (
            <ArContentCard key={`${story.module || idx}-${idx}`} className="p-4 md:p-5">
              <div className={arSectionTitle}>{story.module || "Module"}</div>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight text-text-primary">
                {story.title || "Highlights"}
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-sub">
                {(story.bullets || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </ArContentCard>
          ))}
        </div>
      )}

      {(h.watchlist || []).length > 0 && (
        <section
          className="rounded-[14px] border border-amber-200/90 bg-amber-50/90 p-4 shadow-[0_2px_12px_rgba(245,158,11,0.12)]"
        >
          <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber-800">Watchlist</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
            {h.watchlist.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(m.importActivityByJob || {}).length > 0 && (
        <ArContentCard className="overflow-hidden !p-0">
          <div className="border-b border-border-theme bg-input-bg px-4 py-2.5">
            <h3 className={arSectionTitle}>Import activity by job</h3>
            <p className="mt-0.5 text-[11px] text-text-faint">Recent rows (sample)</p>
          </div>
          <div className="max-h-52 overflow-y-auto text-sm [scrollbar-width:thin]">
            {Object.entries(m.importActivityByJob)
              .slice(0, 20)
              .map(([job, count]) => (
                <div
                  key={job}
                  className="flex justify-between gap-2 border-b border-border-theme px-4 py-2.5 transition-colors hover:bg-accent-dim"
                >
                  <span className="truncate font-semibold text-text-primary">{job}</span>
                  <span className="shrink-0 font-bold tabular-nums text-accent" style={{ fontFamily: AR_MONO }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </ArContentCard>
      )}
    </div>
  );
}
