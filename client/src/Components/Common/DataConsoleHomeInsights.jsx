import React from "react";
import { CircularProgress, FormControl, InputLabel, MenuItem, Select } from "@mui/material";

/**
 * Data Console home: job / AC-DC / maturity / register snapshot + AI narrative.
 */
export default function DataConsoleHomeInsights({
  metrics = {},
  highlights = {},
  loading,
  error,
  jobNames = [],
  selectedJobName = "",
  onJobChange,
}) {
  const m = metrics || {};
  const h = highlights || {};
  const om = m.overallMaturity || {};
  const pm = m.perJobMaturity || null;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-white px-4 py-12 text-slate-500 text-sm gap-3">
        <CircularProgress size={28} />
        <span>Loading Data Console snapshot…</span>
      </div>
    );
  }

  const dim = (label, val) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">{val != null ? `${val}` : "—"}</div>
    </div>
  );

  const mat = selectedJobName && pm ? pm : om;

  return (
    <div className="space-y-6">
      {m.objectScope && (
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Object scope: <span className="text-slate-800">{m.objectScope}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Jobs</div>
          <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{m.totalJobs ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">AC records (sampled jobs)</div>
          <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{m.acRecordsTotal ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">DC / AR source records</div>
          <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{m.dcRecordsTotal ?? "—"}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="dc-home-job-label">Maturity scope (job)</InputLabel>
          <Select
            labelId="dc-home-job-label"
            label="Maturity scope (job)"
            value={selectedJobName || ""}
            onChange={(e) => onJobChange?.(e.target.value)}
          >
            <MenuItem value="">
              <em>All jobs (default sample)</em>
            </MenuItem>
            {jobNames.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <p className="text-xs text-slate-500 pb-1">
          Choosing a job refetches analysis for maturity based on that job&apos;s AC/DC tables (capped sample).
        </p>
      </div>

      <section className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50/90 to-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 mb-3">Maturity score</h2>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-extrabold text-slate-900 tabular-nums">{mat?.overall ?? "—"}</span>
          <span className="text-slate-500 text-sm">/ 100</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {dim("Data completeness", mat?.dataCompleteness)}
          {dim("Data consistency", mat?.dataConsistency)}
          {dim("Data changes", mat?.dataChanges)}
          {dim("Data timeliness", mat?.dataTimeliness)}
        </div>
      </section>

      {(m.registerSummary?.recordCount > 0 || Object.keys(m.registerSummary?.byDataSource || {}).length > 0) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Register (selected object)</h3>
          <p className="text-sm text-slate-600 mb-3">
            Records sampled: <strong>{m.registerSummary?.recordCount ?? 0}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(m.registerSummary?.byDataSource || {}).map(([src, cnt]) => (
              <span
                key={src}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
              >
                {src}: <span className="tabular-nums">{cnt}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {h.executiveSummary && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-2">AI summary</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{h.executiveSummary}</p>
        </section>
      )}

      {h.maturityNarrative && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Maturity narrative</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{h.maturityNarrative}</p>
        </section>
      )}

      {(h.jobHighlights || []).length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Job highlights</h3>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {h.jobHighlights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {h.registerNarrative && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Register narrative</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{h.registerNarrative}</p>
        </section>
      )}
    </div>
  );
}
