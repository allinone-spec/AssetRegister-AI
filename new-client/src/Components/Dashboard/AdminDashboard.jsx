import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Spark,
  STATUS_META,
  StatusPill,
  TYPE_ICONS,
  INTEGRATIONS,
  JOBS,
  Donut,
} from "../Common/sideDrawer/utils";

function SectionTitle({ label }) {
  return (
    <div className="text-[11px] font-bold text-accent uppercase tracking-[1.3px] mb-3.5">
      {label}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-[14px] border border-border-theme p-5 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-input-bg mb-3" />
      <div className="w-16 h-7 rounded bg-input-bg mb-2" />
      <div className="w-24 h-3 rounded bg-input-bg mb-2" />
      <div className="w-full h-3 rounded bg-input-bg" />
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────── */
const AdminDashboard = ({ userName = "" }) => {
  const navigate = useNavigate();

  const jobs = JOBS;
  const loading = false;

  const formatDate = () => {
    const d = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const integrations = INTEGRATIONS;

  const statCards = [
    {
      label: "Total Assets",
      value: "6,314",
      icon: "🖥️",
      desc: "Across all sources",
    },
    {
      label: "Active Jobs",
      value: "7",
      icon: "⚡",
      desc: "Running or scheduled",
    },
    {
      label: "Failed Jobs",
      value: "1",
      icon: "⚠️",
      desc: "Needs your attention",
    },
    {
      label: "Integrations",
      value: "13",
      icon: "🔗",
      desc: "Connected data sources",
    },
  ];

  const [activeTab, setActiveTab] = useState("insights");
  const [integrationSearch, setIntegrationSearch] = useState("");

  const insightsData = {
    summary:
      "Your import pipeline processed 6,314 assets across 7 jobs this week.",
    metrics: [
      {
        label: "Success Rate",
        value: "85.7%",
        trend: [60, 65, 70, 78, 82, 85, 86],
        color: "#059669",
      },
      {
        label: "Avg Duration",
        value: "2m 05s",
        trend: [180, 160, 150, 140, 130, 125, 125],
        color: "#6366f1",
      },
      {
        label: "Assets/Job",
        value: "902",
        trend: [600, 700, 750, 820, 880, 900, 902],
        color: "#f59e0b",
      },
    ],
    topSources: [
      { name: "Flat File Assets Q1", assets: 3400, pct: 54 },
      { name: "Azure AD Sync", assets: 1240, pct: 20 },
      { name: "AWS EC2 Import", assets: 856, pct: 14 },
      { name: "Intune Device Sync", assets: 620, pct: 10 },
    ],
  };

  const recommendationsData = [
    {
      severity: "high",
      title: "Fix ServiceNow CMDB Integration",
      desc: "This job has failed with 0 assets imported. Check API credentials and endpoint configuration.",
      action: "Review Job",
    },
    {
      severity: "medium",
      title: "Schedule MySQL Legacy DB",
      desc: "This integration is pending and has never run. Set up a schedule to start importing assets.",
      action: "Configure",
    },
    {
      severity: "low",
      title: "Optimize Azure AD Sync",
      desc: "Consider increasing sync frequency — asset count grew 15% since last month.",
      action: "Adjust",
    },
    {
      severity: "low",
      title: "Archive Completed Flat File Jobs",
      desc: "3 completed flat file imports can be archived to reduce dashboard clutter.",
      action: "Archive",
    },
  ];

  const severityColors = {
    high: { fg: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
    medium: { fg: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    low: { fg: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  };

  const filteredIntegrations = integrations.filter((g) =>
    g.name.toLowerCase().includes(integrationSearch.toLowerCase()),
  );

  const handleJobClick = (job) => {
    navigate("/admin-console/import-status");
  };

  return (
    <div className="p-6 pb-8 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[11px] font-bold text-accent uppercase tracking-[1.3px] mb-1.5">
          Overview
        </div>
        <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight leading-tight">
          Admin Dashboard
        </h1>
        <p className="text-[13px] text-text-faint mt-1">
          {formatDate()} ·{" "}
          {userName ? `Welcome, ${userName}` : "All systems nominal"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : statCards.map((s) => (
              <div
                key={s.label}
                className="bg-surface rounded-[14px] border border-border-theme p-5 relative overflow-hidden shadow-theme transition-colors duration-300"
              >
                <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent-dim pointer-events-none" />
                <div className="text-[22px] mb-3">{s.icon}</div>
                <div className="text-[30px] font-black text-text-primary tracking-tighter leading-none mb-1">
                  {s.value}
                </div>
                <div className="text-[11.5px] font-bold text-text-faint uppercase tracking-wider mb-1">
                  {s.label}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-text-faint">
                    {s.desc}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-4 mb-4">
        {/* Recent Jobs with Tabs */}
        <div className="bg-surface rounded-[14px] border border-border-theme overflow-hidden shadow-theme transition-colors duration-300">
          <div className="px-5 py-4 border-b border-border-theme">
            <div className="flex items-center justify-between mb-3">
              <div>
                <SectionTitle label="Recent Jobs" />
                <div className="text-lg font-extrabold text-text-primary tracking-tight mt-0.5">
                  Import Activity
                </div>
              </div>
              <span className="text-[11px] px-3 py-0.5 bg-accent-dim text-accent rounded-full font-bold border border-accent-muted">
                {jobs.length} total
              </span>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 bg-input-bg rounded-lg p-0.5">
              {[
                { key: "insights", label: "Insights" },
                { key: "recommendations", label: "Recommendations" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-surface text-accent shadow-sm border border-border-theme"
                      : "text-text-faint hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeTab === "insights" ? (
              <div className="space-y-5">
                {/* Summary */}
                <div className="bg-accent-dim rounded-xl p-4 border border-accent-muted">
                  <div className="text-[13px] text-text-primary font-medium leading-relaxed">
                    {insightsData.summary}
                  </div>
                </div>

                {/* Metric cards with sparklines */}
                <div className="grid grid-cols-3 gap-3">
                  {insightsData.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="bg-input-bg rounded-xl p-3 border border-border-theme"
                    >
                      <div className="text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1">
                        {m.label}
                      </div>
                      <div className="text-[20px] font-black text-text-primary tracking-tight leading-none mb-2">
                        {m.value}
                      </div>
                      <Spark data={m.trend} color={m.color} w={80} h={20} />
                    </div>
                  ))}
                </div>

                {/* Top sources bar chart */}
                <div>
                  <div className="text-[11px] font-bold text-text-faint uppercase tracking-wider mb-2.5">
                    Top Sources by Assets
                  </div>
                  <div className="space-y-2.5">
                    {insightsData.topSources.map((src) => (
                      <div key={src.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[12px] font-semibold text-text-primary">
                            {src.name}
                          </span>
                          <span className="text-[11px] font-bold text-text-faint font-mono">
                            {src.assets.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-[6px] bg-input-bg rounded-full overflow-hidden border border-border-theme">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out bg-accent"
                            style={{ width: `${src.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jobs mini table */}
                <div>
                  <div className="text-[11px] font-bold text-text-faint uppercase tracking-wider mb-2.5">
                    Job Status Overview
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border-theme">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-input-bg">
                          {["Job", "Status", "Assets", "Trend"].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2 text-[10px] font-bold text-text-faint uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j, i) => {
                          const meta =
                            STATUS_META[j.status] || STATUS_META.Pending;
                          return (
                            <tr
                              key={j.id}
                              onClick={() => handleJobClick(j)}
                              className="cursor-pointer transition-colors hover:bg-accent-dim"
                              style={{
                                borderBottom:
                                  i < jobs.length - 1
                                    ? "1px solid var(--border)"
                                    : "none",
                              }}
                            >
                              <td className="px-3 py-2">
                                <div className="font-bold text-[12px] text-text-primary truncate">
                                  {j.jobName}
                                </div>
                                <div className="text-[10px] text-text-faint font-mono">
                                  {j.id}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <StatusPill status={j.status} />
                              </td>
                              <td className="px-3 py-2 text-[12px] font-bold font-mono text-text-primary">
                                {j.assets > 0 ? j.assets.toLocaleString() : "—"}
                              </td>
                              <td className="px-3 py-2">
                                <Spark
                                  data={j.trend}
                                  color={meta.fg}
                                  w={50}
                                  h={18}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendationsData.map((rec, i) => {
                  const sev = severityColors[rec.severity];
                  return (
                    <div
                      key={i}
                      className="rounded-xl border p-4 transition-colors duration-100 hover:bg-accent-dim"
                      style={{ borderColor: sev.border, background: sev.bg }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{
                            background: sev.fg,
                            boxShadow: `0 0 6px ${sev.fg}66`,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[13px] font-bold text-text-primary">
                              {rec.title}
                            </span>
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                color: sev.fg,
                                border: `1px solid ${sev.border}`,
                              }}
                            >
                              {rec.severity}
                            </span>
                          </div>
                          <p className="text-[12px] text-text-faint leading-relaxed mb-2.5">
                            {rec.desc}
                          </p>
                          <button
                            onClick={() =>
                              navigate("/admin-console/import-status")
                            }
                            className="text-[11px] font-bold text-accent hover:underline cursor-pointer"
                          >
                            {rec.action} →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Integration Health — full column */}
        <div className="bg-surface rounded-[14px] border border-border-theme p-[18px] shadow-theme transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle label="Integration Health" />
          </div>
          {/* Search */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={integrationSearch}
              onChange={(e) => setIntegrationSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-input-bg border border-border-theme text-[12.5px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-input-bg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-24 h-3 rounded bg-input-bg" />
                    <div className="w-full h-1.5 rounded-full bg-input-bg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <div className="text-text-faint text-sm text-center py-4">
              {integrationSearch
                ? "No matching integrations"
                : "No integrations"}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredIntegrations.map((g) => {
                const col =
                  g.health > 80
                    ? g.color
                    : g.health > 40
                      ? "#d97706"
                      : "#ef4444";
                return (
                  <div key={g.name} className="flex items-center gap-2.5">
                    <Donut pct={g.health} color={col} size={40} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[12.5px] font-bold text-text-primary">
                          {g.name}
                        </span>
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: col }}
                        >
                          {g.health}%
                        </span>
                      </div>
                      <div className="h-[5px] bg-input-bg rounded-full overflow-hidden border border-border-theme">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${g.health}%`, background: col }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Source table */}
      <div className="bg-surface rounded-[14px] border border-border-theme overflow-hidden shadow-theme transition-colors duration-300">
        <div className="px-5 py-4 border-b border-border-theme flex items-center justify-between">
          <SectionTitle label="Top Asset Sources" />
          <button
            onClick={() => navigate("/admin-console/import-status")}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-input-bg">
                {["Source", "Assets", "Last Sync", "Status", "Trend"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-[10.5px] font-bold text-text-faint uppercase tracking-wider border-b border-border-theme"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3 border-b border-border-theme">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-input-bg" />
                          <div className="space-y-1">
                            <div className="w-24 h-3 rounded bg-input-bg" />
                            <div className="w-16 h-2.5 rounded bg-input-bg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-border-theme">
                        <div className="w-12 h-3 rounded bg-input-bg" />
                      </td>
                      <td className="px-4 py-3 border-b border-border-theme">
                        <div className="w-20 h-3 rounded bg-input-bg" />
                      </td>
                      <td className="px-4 py-3 border-b border-border-theme">
                        <div className="w-16 h-5 rounded-full bg-input-bg" />
                      </td>
                      <td className="px-4 py-3 border-b border-border-theme">
                        <div className="w-16 h-6 rounded bg-input-bg" />
                      </td>
                    </tr>
                  ))
                : [...jobs]
                    .filter((j) => j.assets > 0)
                    .sort((a, b) => b.assets - a.assets)
                    .map((j) => {
                      const m = STATUS_META[j.status] || STATUS_META.Pending;
                      return (
                        <tr
                          key={j.id}
                          className="transition-colors duration-100 hover:bg-accent-dim"
                        >
                          <td className="px-4 py-3 border-b border-border-theme">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center text-sm border border-accent-muted">
                                {TYPE_ICONS[j.type] || "📦"}
                              </div>
                              <div>
                                <div className="font-bold text-[13.5px] text-text-primary">
                                  {j.jobName}
                                </div>
                                <div className="text-[11px] text-text-faint font-mono">
                                  {j.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-border-theme font-bold font-mono text-text-primary text-[13px]">
                            {j.assets.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 border-b border-border-theme text-xs text-text-faint font-mono">
                            {j.lastRun}
                          </td>
                          <td className="px-4 py-3 border-b border-border-theme">
                            <StatusPill status={j.status} />
                          </td>
                          <td className="px-4 py-3 border-b border-border-theme">
                            <Spark data={j.trend} color={m.fg} />
                          </td>
                        </tr>
                      );
                    })}
              {!loading && jobs.filter((j) => j.assets > 0).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-text-faint text-sm"
                  >
                    No asset sources available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
