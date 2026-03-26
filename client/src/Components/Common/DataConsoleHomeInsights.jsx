import React from "react";
import { CircularProgress, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import {
  AR_FONT,
  ArContentCard,
  ArStatTile,
  arCard,
  arSectionTitle,
  arInputSurface,
} from "./consoleWelcomeTheme";

const selectSx = {
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    borderRadius: "11px",
    backgroundColor: arInputSurface,
    fontFamily: AR_FONT,
    "& fieldset": { borderColor: "rgba(111,47,225,0.12)" },
    "&:hover fieldset": { borderColor: "rgba(111,47,225,0.22)" },
    "&.Mui-focused fieldset": { borderColor: "#6f2fe1", borderWidth: "1.5px" },
  },
};

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
        className={`flex flex-col items-center justify-center gap-4 px-6 py-14 text-sm text-[#6b7280] ${arCard}`}
        style={{ fontFamily: AR_FONT }}
      >
        <CircularProgress size={36} sx={{ color: "#6f2fe1" }} />
        <div className="text-center space-y-1">
          <span className="block text-[15px] font-bold text-[#1a1028]">Building your snapshot</span>
          <span className="text-xs">Metrics and AI narrative load together</span>
        </div>
      </div>
    );
  }

  const dim = (label, val) => (
    <div
      className="rounded-[10px] border border-[rgba(111,47,225,0.1)] px-3 py-2.5"
      style={{ backgroundColor: arInputSurface, fontFamily: AR_FONT }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">{label}</div>
      <div className="text-lg font-extrabold tabular-nums text-[#1a1028]">{val != null ? `${val}` : "—"}</div>
    </div>
  );

  const mat = selectedJobName && pm ? pm : om;

  return (
    <div className="space-y-[14px]" style={{ fontFamily: AR_FONT }}>
      {m.objectScope && (
        <p className={`${arSectionTitle} !mb-0`}>
          Object scope · <span className="font-extrabold text-[#1a1028]">{m.objectScope}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
        <ArStatTile label="Jobs" value={m.totalJobs} />
        <ArStatTile label="AC records (sampled jobs)" value={m.acRecordsTotal} />
        <ArStatTile label="DC / AR source records" value={m.dcRecordsTotal} />
      </div>

      <ArContentCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormControl size="small" sx={selectSx}>
            <InputLabel id="dc-home-job-label" sx={{ fontFamily: AR_FONT }}>
              Maturity scope (job)
            </InputLabel>
            <Select
              labelId="dc-home-job-label"
              label="Maturity scope (job)"
              value={selectedJobName || ""}
              onChange={(e) => onJobChange?.(e.target.value)}
              sx={{ fontFamily: AR_FONT, fontSize: "13px" }}
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
          <p className="pb-1 text-xs leading-relaxed text-[#9ca3af]">
            Refetches maturity for that job&apos;s AC/DC tables (capped sample).
          </p>
        </div>
      </ArContentCard>

      <section
        className={`relative overflow-hidden p-5 md:p-6 ${arCard}`}
        style={{ background: `linear-gradient(135deg, ${arInputSurface} 0%, #fff 55%)` }}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[rgba(111,47,225,0.07)]"
          aria-hidden
        />
        <h2 className={`${arSectionTitle} relative z-[1] mb-4`}>Maturity score</h2>
        <div className="relative z-[1] mb-5 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tabular-nums tracking-tight text-[#1a1028]">
            {mat?.overall ?? "—"}
          </span>
          <span className="text-sm font-semibold text-[#9ca3af]">/ 100</span>
        </div>
        <div className="relative z-[1] grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {dim("Data completeness", mat?.dataCompleteness)}
          {dim("Data consistency", mat?.dataConsistency)}
          {dim("Data changes", mat?.dataChanges)}
          {dim("Data timeliness", mat?.dataTimeliness)}
        </div>
      </section>

      {(m.registerSummary?.recordCount > 0 || Object.keys(m.registerSummary?.byDataSource || {}).length > 0) && (
        <ArContentCard className="p-4 md:p-5">
          <h3 className={`${arSectionTitle} mb-2`}>Register (selected object)</h3>
          <p className="mb-3 text-sm text-[#6b7280]">
            Records sampled: <strong className="text-[#1a1028]">{m.registerSummary?.recordCount ?? 0}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(m.registerSummary?.byDataSource || {}).map(([src, cnt]) => (
              <span
                key={src}
                className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(111,47,225,0.18)] bg-[rgba(111,47,225,0.07)] px-2.5 py-1 text-xs font-bold text-[#5b21b6]"
              >
                {src}: <span className="tabular-nums text-[#1a1028]">{cnt}</span>
              </span>
            ))}
          </div>
        </ArContentCard>
      )}

      {h.executiveSummary && (
        <section
          className={`relative overflow-hidden p-5 md:p-6 ${arCard} border-[rgba(111,47,225,0.18)]`}
          style={{ background: "linear-gradient(145deg, rgba(111,47,225,0.06), #fff 50%)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#6f2fe1] shadow-[0_0_8px_rgba(111,47,225,0.5)]" aria-hidden />
            <h3 className={arSectionTitle}>AI executive summary</h3>
          </div>
          <p className="text-[15px] leading-relaxed text-[#1a1028] whitespace-pre-wrap">{h.executiveSummary}</p>
        </section>
      )}

      {h.maturityNarrative && (
        <ArContentCard className="p-5 md:p-6">
          <h3 className={`${arSectionTitle} mb-2`}>Maturity narrative</h3>
          <p className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">{h.maturityNarrative}</p>
        </ArContentCard>
      )}

      {(h.jobHighlights || []).length > 0 && (
        <ArContentCard className="p-4 md:p-5">
          <h3 className={`${arSectionTitle} mb-3`}>Job highlights</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#374151]">
            {h.jobHighlights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </ArContentCard>
      )}

      {h.registerNarrative && (
        <ArContentCard className="p-4 md:p-5">
          <h3 className={`${arSectionTitle} mb-2`}>Register narrative</h3>
          <p className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">{h.registerNarrative}</p>
        </ArContentCard>
      )}
    </div>
  );
}
