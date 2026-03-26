import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
const MoreVertIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const toneStyles = {
  risk: { wrapper: "bg-red-50 border-red-200", text: "text-red-800" },
  positive: { wrapper: "bg-green-50 border-green-200", text: "text-green-800" },
  neutral: { wrapper: "bg-blue-50 border-blue-200", text: "text-blue-800" },
};

const FEEDBACK_TYPES = Object.freeze({
  helpful: "Helpful",
  not_helpful: "Not Helpful",
  irrelevant: "Irrelevant",
});

function InsightFeedbackMenu({ insightId, insightType, onInsightFeedback, anchorVertical = "top", anchorHorizontal = "right" }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notHelpfulOpen, setNotHelpfulOpen] = useState(false);
  const [comment, setComment] = useState("");

  const handleOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const handleFeedback = (feedbackType) => {
    handleClose();
    if (feedbackType === "not_helpful") {
      setNotHelpfulOpen(true);
      return;
    }
    if (feedbackType === "irrelevant") {
      toast.success("Hidden for this session.");
    }
    onInsightFeedback?.(insightId, insightType, feedbackType, undefined);
  };

  const handleNotHelpfulSubmit = () => {
    onInsightFeedback?.(insightId, insightType, "not_helpful", comment || undefined);
    setComment("");
    setNotHelpfulOpen(false);
  };

  if (!onInsightFeedback) return null;

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label="Insight feedback"
        className="!p-1"
        sx={{ color: "text.secondary" }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: anchorVertical, horizontal: anchorHorizontal }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => handleFeedback("helpful")}>{FEEDBACK_TYPES.helpful}</MenuItem>
        <MenuItem onClick={() => handleFeedback("not_helpful")}>{FEEDBACK_TYPES.not_helpful}</MenuItem>
        <MenuItem onClick={() => handleFeedback("irrelevant")}>{FEEDBACK_TYPES.irrelevant}</MenuItem>
      </Menu>
      <Dialog open={notHelpfulOpen} onClose={() => setNotHelpfulOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust this insight</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600 mb-2">
            You still want this kind of insight, but with changes. Describe what you want different—the AI remembers
            this for your session and will apply it when you <strong>Refresh insights</strong> (or run analysis again).
            This card stays visible until refresh.
          </p>
          <TextField
            autoFocus
            margin="dense"
            label="What changes do you want in this insight?"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. add numbers, focus on risks, shorter summary..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotHelpfulOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleNotHelpfulSubmit}>
            Save feedback
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const normalizeTextItems = (items = []) =>
  items
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.text || item?.description || "";
    })
    .filter(Boolean);

const formatAxisLabel = (value, maxLength = 18) => {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
};

const getChartSeries = (chart) => {
  const firstSeries = Array.isArray(chart?.series) ? chart.series[0] : null;
  const values = Array.isArray(firstSeries?.values) ? firstSeries.values : [];
  const labels = Array.isArray(chart?.xAxis) ? chart.xAxis : [];
  return {
    name: firstSeries?.name || "Series",
    labels,
    values,
  };
};

const buildChartRows = (chart) => {
  const { labels, values } = getChartSeries(chart);
  return labels.map((label, index) => ({
    label: String(label ?? `Item ${index + 1}`),
    value: Number(values[index] ?? 0),
  }));
};

const getEffectiveChartType = (chart) => {
  const explicitType = String(chart?.type || "").toLowerCase();
  const rows = buildChartRows(chart);
  const title = String(chart?.title || "").toLowerCase();
  if (["pie", "donut", "doughnut", "circle"].includes(explicitType)) {
    return "pie";
  }
  if (["line", "trend"].includes(explicitType)) {
    return "line";
  }
  if (["area"].includes(explicitType)) {
    return "area";
  }
  if (title.includes("distribution") && rows.length <= 6) {
    return "pie";
  }
  if (title.includes("trend") || title.includes("daily") || title.includes("history")) {
    return "line";
  }
  if (title.includes("rate") || title.includes("%")) {
    return "area";
  }
  return "bar";
};

const getChartHighlight = (chart) => {
  const { labels, values, name } = getChartSeries(chart);
  if (!values.length) return "";
  const maxValue = Math.max(...values);
  const maxIndex = values.indexOf(maxValue);
  const topLabel = labels[maxIndex] ?? `Item ${maxIndex + 1}`;
  return `${name}: highest value is ${topLabel} (${maxValue}).`;
};

const ChartRenderer = ({ chart, height: chartHeight = 260, compact = false }) => {
  const rows = buildChartRows(chart).slice(0, compact ? 6 : 8);
  const chartType = getEffectiveChartType(chart);
  const commonMargin = compact
    ? { top: 6, right: 8, left: 4, bottom: 4 }
    : { top: 16, right: 24, left: 12, bottom: 20 };
  const tickFont = compact ? 9 : 11;
  const renderXAxisTick = ({ x, y, payload }) => (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill="#6b7280"
        fontSize={tickFont}
      >
        {formatAxisLabel(payload.value, compact ? 12 : 18)}
      </text>
    </g>
  );

  if (!rows.length) return null;

  const pieInner =
    chart?.type === "donut" || chart?.type === "doughnut" ? (compact ? 22 : 52) : 0;
  const pieOuter = compact ? 44 : 88;

  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Tooltip />
          <Legend wrapperStyle={{ paddingTop: compact ? 4 : 12, fontSize: compact ? 10 : 12 }} />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            innerRadius={pieInner}
            outerRadius={pieOuter}
            paddingAngle={2}
          >
            {rows.map((entry, index) => (
              <Cell key={`${entry.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={rows} margin={commonMargin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" hide={rows.length > 6} tick={renderXAxisTick} interval={0} />
          <YAxis width={compact ? 32 : 44} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={compact ? 2 : 3}
            dot={{ r: compact ? 2 : 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={rows} margin={commonMargin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" hide={rows.length > 6} tick={renderXAxisTick} interval={0} />
          <YAxis width={compact ? 32 : 44} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#93c5fd" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={rows} margin={commonMargin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" hide={rows.length > 6} tick={renderXAxisTick} interval={0} />
        <YAxis width={compact ? 32 : 44} />
        <Tooltip />
        <Bar dataKey="value" radius={[compact ? 3 : 6, compact ? 3 : 6, 0, 0]}>
          {rows.map((entry, index) => (
            <Cell key={`${entry.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const ChartCard = ({ chart, chartIndex, onInsightFeedback }) => {
  const { values } = getChartSeries(chart);
  if (!values.length) return null;
  const chartType = getEffectiveChartType(chart);
  // Use stable chart.id when available so backend can apply feedback correctly.
  const insightId = String(chart?.id ?? `chart-${chartIndex ?? 0}`);

  return (
    <div className="border rounded-xl p-5 bg-white space-y-4 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-gray-900 break-words leading-5">
            {chart.title || chart.id || "Chart"}
          </div>
          <div className="text-xs text-gray-500 capitalize">{chartType} visualization</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-purple-50 text-purple-700">
            {chartType}
          </span>
          <InsightFeedbackMenu
            insightId={insightId}
            insightType="chart"
            onInsightFeedback={onInsightFeedback}
          />
        </div>
      </div>
      <div className="rounded-xl bg-gray-50 px-3 py-4">
        <ChartRenderer chart={chart} height={260} />
      </div>
      <div className="text-xs text-gray-600 break-words leading-5">{getChartHighlight(chart)}</div>
    </div>
  );
};

const sectionKeyByTone = { risk: "risk", positive: "positive", neutral: "recommendation" };

const NarrativeBlock = ({ title, items, tone = "neutral", onInsightFeedback, hiddenInsightIds }) => {
  const normalized = normalizeTextItems(items);
  if (!normalized.length) return null;
  const styles = toneStyles[tone] || toneStyles.neutral;
  const sectionKey = sectionKeyByTone[tone] || "narrative";
  const hidden = new Set(hiddenInsightIds || []);
  return (
    <div className={`border rounded-xl p-4 ${styles.wrapper} min-w-0`}>
      <h3 className={`font-semibold mb-2 text-sm ${styles.text}`}>{title}</h3>
      <ul className={`list-disc pl-5 text-sm space-y-1.5 leading-6 ${styles.text}`}>
        {normalized.map((item, index) => {
          const insightId = `${sectionKey}-${index}`;
          if (hidden.has(insightId)) return null;
          return (
            <li key={`${title}-${index}`} className="break-words flex items-start justify-between gap-2">
              <span>{item}</span>
              <InsightFeedbackMenu
                insightId={insightId}
                insightType={sectionKey}
                onInsightFeedback={onInsightFeedback}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const MaturityCard = ({ maturityScore, onInsightFeedback }) => {
  if (!maturityScore) return null;
  const score = Number(maturityScore.score ?? 0);
  return (
    <div className="border rounded-xl p-4 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold mb-3 text-gray-900">System Health</div>
        <InsightFeedbackMenu insightId="maturity" insightType="maturity" onInsightFeedback={onInsightFeedback} />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white border border-purple-100 flex items-center justify-center text-xl font-bold text-purple-700 shadow-sm">
          {score}
        </div>
        <div className="text-sm text-gray-700 leading-6 break-words min-w-0">
          {maturityScore.comment}
        </div>
      </div>
    </div>
  );
};

const AtAGlanceCard = ({ items, onInsightFeedback, hiddenInsightIds }) => {
  if (!items?.length) return null;
  const hidden = new Set(hiddenInsightIds || []);
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm min-w-0 overflow-hidden">
      <ul className="space-y-2">
        {items.map((item, index) => {
          const insightId = `atAGlance-${index}`;
          if (hidden.has(insightId)) return null;
          return (
            <li
              key={`overview-${index}`}
              className="text-sm text-gray-700 leading-6 border-l-4 border-purple-200 pl-3 break-words flex items-start justify-between gap-2"
            >
              <span>{item}</span>
              <InsightFeedbackMenu
                insightId={insightId}
                insightType="atAGlance"
                onInsightFeedback={onInsightFeedback}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="flex items-end justify-between gap-3">
    <div>
      <h3 className="font-semibold text-base text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const SeverityBadge = ({ severity }) => {
  const level = String(severity || "low").toLowerCase();
  const styles =
    level === "high"
      ? "bg-red-100 text-red-700"
      : level === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles}`}>
      {level}
    </span>
  );
};

const TotalInsightCards = ({ items, onInsightFeedback, hiddenInsightIds }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const hidden = new Set(hiddenInsightIds || []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((item, index) => {
        const insightId = `totalInsight-${index}`;
        if (hidden.has(insightId)) return null;
        return (
          <div
            key={`${item.title || "total"}-${index}`}
            className="border rounded-xl p-4 bg-white shadow-sm space-y-2 min-w-0 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-sm text-gray-900 break-words min-w-0">
                {item.title || `Insight ${index + 1}`}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <SeverityBadge severity={item.severity} />
                <InsightFeedbackMenu
                  insightId={insightId}
                  insightType="totalInsight"
                  onInsightFeedback={onInsightFeedback}
                />
              </div>
            </div>
            <div className="text-sm text-gray-700 leading-6 break-words">
              {item.text || item.insight}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const InsightList = ({ items, type = "column", onInsightFeedback, hiddenInsightIds }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const prefix = type === "column" ? "columnInsight" : "rowInsight";
  const hidden = new Set(hiddenInsightIds || []);
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="max-h-[560px] overflow-auto divide-y divide-gray-100">
        {items.map((item, index) => {
          const insightId = `${prefix}-${index}`;
          if (hidden.has(insightId)) return null;
          return (
            <div
              key={`${type}-${item.column || item.issue || "item"}-${index}`}
              className="p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 break-words">
                    {type === "column"
                      ? item.column || `Column ${index + 1}`
                      : item.issue || `Row insight ${index + 1}`}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {type === "column"
                      ? "Column-level quality and operational meaning"
                      : "Row-level issue pattern and operational effect"}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SeverityBadge severity={item.severity || (type === "row" ? "medium" : "low")} />
                  <InsightFeedbackMenu
                    insightId={insightId}
                    insightType={type === "column" ? "columnInsight" : "rowInsight"}
                    onInsightFeedback={onInsightFeedback}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 leading-6 break-words">
                {item.insight || item.text}
              </div>
              {type === "row" && item.operational_risk && (
                <div className="text-xs text-red-700 bg-red-50 rounded-md px-3 py-2 leading-5 break-words">
                  {item.operational_risk}
                </div>
              )}
              {item.recommendation && (
                <div className="text-xs text-blue-700 bg-blue-50 rounded-md px-3 py-2 leading-5 break-words">
                  {item.recommendation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const filterChartsByScope = (charts = [], scope) =>
  charts.filter((chart) => (chart?.scope || "overview") === scope);

const ChartGrid = ({ charts, onInsightFeedback }) => {
  if (!Array.isArray(charts) || charts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {charts.map((chart, idx) => (
        <ChartCard
          key={chart.id || idx}
          chart={chart}
          chartIndex={idx}
          onInsightFeedback={onInsightFeedback}
        />
      ))}
    </div>
  );
};

const formatTraceValue = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const IMPORT_TRACING_INSIGHT_RE =
  /\b(import\s*data\s*tracing|import\s*tracing|tracing\s*status|getimportdatatracing|partially\s*matched|fully\s*matched|matched\b|deleted\b|pending\b|null\s*status|acold|acnew|dcold|dcnew|actable|dctable|original\s*source|by\s*ar|numberid|serial\s*number|flexera)\b/i;

const insightBlob = (x) => {
  if (!x || typeof x !== "object") return "";
  return [
    x.text,
    x.insight,
    x.title,
    x.issue,
    x.column,
    x.recommendation,
    x.description,
  ]
    .filter(Boolean)
    .join(" ");
};

const pickImportTracingRelatedInsights = (aiResult) => {
  const pickObjs = (arr, limit) =>
    (Array.isArray(arr) ? arr : [])
      .filter((x) => IMPORT_TRACING_INSIGHT_RE.test(insightBlob(x)))
      .slice(0, limit);
  const pickStr = (arr, limit) =>
    (Array.isArray(arr) ? arr : [])
      .filter((t) => IMPORT_TRACING_INSIGHT_RE.test(String(t || "")))
      .slice(0, limit);
  return {
    totalInsights: pickObjs(aiResult?.totalInsights, 10),
    columnInsights: pickObjs(aiResult?.columnInsights, 10),
    rowInsights: pickObjs(aiResult?.rowInsights, 14),
    risks: pickStr(aiResult?.risks, 10),
    positives: pickStr(aiResult?.positives, 8),
    recommendations: pickStr(aiResult?.recommendations, 10),
  };
};

/** API summary rows: statuses, time range, sample keys (from AI service importTracing). */
const ImportTracingSummaryPanel = ({ tracing, onInsightFeedback, hiddenInsightIds }) => {
  if (!tracing || typeof tracing !== "object") return null;
  const hidden = new Set(hiddenInsightIds || []);
  const total = Number(tracing.totalRows) || 0;
  const counts = tracing.statusCounts || {};
  const range = tracing.updatedTimeRange || {};
  const filt = tracing.filter || {};
  const examples = Array.isArray(tracing.examples) ? tracing.examples : [];
  const hasCounts = Object.keys(counts).length > 0;
  const emptyReason = tracing.emptyReason;
  if (!total && !hasCounts && examples.length === 0 && !emptyReason) return null;

  const summaryInsightId = "importTracing-summary";
  if (hidden.has(summaryInsightId)) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">ImportDataTracing — overview</h4>
        <InsightFeedbackMenu
          insightId={summaryInsightId}
          insightType="importTracingSummary"
          onInsightFeedback={onInsightFeedback}
        />
      </div>
      {emptyReason && (
        <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {emptyReason}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
        {total > 0 && (
          <span>
            <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> traced rows
          </span>
        )}
        {tracing.dataSource && (
          <span>
            Data source: <span className="font-medium text-gray-900">{tracing.dataSource}</span>
          </span>
        )}
        {(filt.tableName || filt.jobName || filt.objectId != null) && (
          <span className="text-xs text-gray-600">
            Filter: objectId {filt.objectId ?? "—"} · table {filt.tableName || "—"} · job {filt.jobName || "—"}
          </span>
        )}
      </div>
      {(range.oldest || range.newest) && (
        <p className="text-xs text-gray-600">
          Updated window: {range.oldest || "—"} → {range.newest || "—"}
        </p>
      )}
      {hasCounts && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-800"
            >
              {k}: <span className="ml-1 font-bold text-purple-800">{v}</span>
            </span>
          ))}
        </div>
      )}
      {examples.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1.5">Recent sample rows</div>
          <ul className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto font-mono">
            {examples.slice(0, 6).map((ex, i) => {
              const exId = `importTracing-example-${i}`;
              if (hidden.has(exId)) return null;
              return (
                <li key={exId} className="border-l-2 border-purple-200 pl-2 break-all flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    #{ex.numberID ?? i} · {String(ex.TracingStatus ?? "null")} · AC {ex.ACtableName || "—"} / DC{" "}
                    {ex.DCtableName || "—"}
                  </span>
                  <InsightFeedbackMenu
                    insightId={exId}
                    insightType="importTracingExample"
                    onInsightFeedback={onInsightFeedback}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

/** AI analysis lines that reference import tracing (filtered from main insight JSON). */
const ImportTracingAiInsightsPanel = ({ related, onInsightFeedback, hiddenInsightIds }) => {
  const hidden = new Set(hiddenInsightIds || []);
  const hasAny =
    (related.totalInsights?.length || 0) +
      (related.columnInsights?.length || 0) +
      (related.rowInsights?.length || 0) +
      (related.risks?.length || 0) +
      (related.positives?.length || 0) +
      (related.recommendations?.length || 0) >
    0;
  if (!hasAny) {
    const emptyId = "importTraceAi-emptyHint";
    if (hidden.has(emptyId)) return null;
    return (
      <div className="flex items-start justify-between gap-2 rounded-xl border border-purple-100 bg-purple-50/20 px-3 py-2.5">
        <p className="text-sm text-gray-500 italic min-w-0">
          No dedicated import-tracing phrases detected in AI sections yet; use the overview and field analysis below, or
          refresh insights after analysis completes.
        </p>
        <InsightFeedbackMenu
          insightId={emptyId}
          insightType="importTracingAi"
          onInsightFeedback={onInsightFeedback}
        />
      </div>
    );
  }

  const line = (prefix, text, idx, insightType) => {
    const insightId = `importTraceAi-${prefix}-${idx}`;
    if (hidden.has(insightId)) return null;
    return (
      <li
        key={insightId}
        className="text-sm text-gray-800 border-l-4 border-purple-200 pl-3 py-1 flex items-start justify-between gap-2"
      >
        <span className="break-words">{text}</span>
        <InsightFeedbackMenu
          insightId={insightId}
          insightType={insightType}
          onInsightFeedback={onInsightFeedback}
        />
      </li>
    );
  };

  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-purple-950">AI analysis (import tracing–related)</h4>
        {!hidden.has("importTraceAi-panel") && (
          <InsightFeedbackMenu
            insightId="importTraceAi-panel"
            insightType="importTracingAi"
            onInsightFeedback={onInsightFeedback}
          />
        )}
      </div>
      {related.totalInsights?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Total insights</div>
          <ul className="space-y-1">
            {related.totalInsights.map((x, i) =>
              line("ti", x.text || x.insight || x.title, i, "totalInsight"),
            )}
          </ul>
        </div>
      )}
      {related.risks?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-red-800 mb-1">Risks</div>
          <ul className="space-y-1">
            {related.risks.map((t, i) => line("risk", String(t), i, "risk"))}
          </ul>
        </div>
      )}
      {related.rowInsights?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Row insights</div>
          <ul className="space-y-1">
            {related.rowInsights.map((x, i) =>
              line("row", x.insight || x.text || x.issue, i, "rowInsight"),
            )}
          </ul>
        </div>
      )}
      {related.columnInsights?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Column insights</div>
          <ul className="space-y-1">
            {related.columnInsights.map((x, i) =>
              line("col", `${x.column || ""}: ${x.insight || x.text || ""}`.trim(), i, "columnInsight"),
            )}
          </ul>
        </div>
      )}
      {related.positives?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-green-800 mb-1">Positives</div>
          <ul className="space-y-1">
            {related.positives.map((t, i) => line("pos", String(t), i, "positive"))}
          </ul>
        </div>
      )}
      {related.recommendations?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-blue-800 mb-1">Recommendations</div>
          <ul className="space-y-1">
            {related.recommendations.map((t, i) => line("rec", String(t), i, "recommendation"))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** ImportDataTracing deep analysis (report job pages): AC/DC old→new JSON + cross-side drift. */
const ImportTracingDeepPanel = ({ deep, onInsightFeedback, hiddenInsightIds }) => {
  if (!deep?.rowsAnalyzed) return null;

  const hidden = new Set(hiddenInsightIds || []);
  const deepRootId = "importTracingDeep-root";
  if (hidden.has(deepRootId)) return null;

  const acTop = Object.entries(deep.acFieldChangeFrequency || {}).slice(0, 10);
  const dcTop = Object.entries(deep.dcFieldChangeFrequency || {}).slice(0, 10);
  const mis = Object.entries(deep.acDcNewMisalignedFields || {}).slice(0, 10);
  const transitions = (deep.inventoryStatusTransitions || []).slice(0, 12);
  const bullets = deep.narrativeBullets || [];
  const examples = (deep.highImpactExamples || []).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
        <h4 className="text-sm font-semibold text-gray-900 min-w-0">
          Field-level analysis (AC/DC JSON old → new)
        </h4>
        <InsightFeedbackMenu
          insightId={deepRootId}
          insightType="importTracingDeep"
          onInsightFeedback={onInsightFeedback}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-violet-800 uppercase">Rows scanned</div>
          <div className="text-lg font-bold text-violet-950">{deep.rowsAnalyzed}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-amber-900 uppercase">AC json drift rows</div>
          <div className="text-lg font-bold text-amber-950">{deep.rowsWithAcJsonDrift ?? 0}</div>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-sky-900 uppercase">DC json drift rows</div>
          <div className="text-lg font-bold text-sky-950">{deep.rowsWithDcJsonDrift ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-600 uppercase">Focus</div>
          <div className="text-sm font-bold text-slate-900">{deep.dataSourceEmphasis || "—"}</div>
        </div>
      </div>

      {!!bullets.length && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <h4 className="text-sm font-semibold text-indigo-950 mb-2">Highlights (deterministic)</h4>
          <ul className="list-none text-sm text-indigo-950/90 space-y-1.5">
            {bullets.map((line, i) => {
              const bid = `importTracingDeep-bullet-${i}`;
              if (hidden.has(bid)) return null;
              return (
                <li key={bid} className="break-words flex items-start justify-between gap-2 border-l-4 border-indigo-200 pl-3 py-0.5">
                  <span className="min-w-0">{line}</span>
                  <InsightFeedbackMenu
                    insightId={bid}
                    insightType="importTracingDeep"
                    onInsightFeedback={onInsightFeedback}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">AC (Original Source) — top changed fields</h4>
          {acTop.length ? (
            <ul className="text-sm space-y-1">
              {acTop.map(([field, count], i) => {
                const fid = `importTracingDeep-ac-${i}`;
                if (hidden.has(fid)) return null;
                return (
                  <li key={field} className="flex items-start justify-between gap-2 border-b border-gray-50 py-1">
                    <span className="text-gray-800 break-all min-w-0">{field}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <span className="font-semibold text-violet-700">{count}</span>
                      <InsightFeedbackMenu
                        insightId={fid}
                        insightType="importTracingDeepField"
                        onInsightFeedback={onInsightFeedback}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No AC old→new field deltas in sample.</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">DC (By AR Resource) — top changed fields</h4>
          {dcTop.length ? (
            <ul className="text-sm space-y-1">
              {dcTop.map(([field, count], i) => {
                const fid = `importTracingDeep-dc-${i}`;
                if (hidden.has(fid)) return null;
                return (
                  <li key={field} className="flex items-start justify-between gap-2 border-b border-gray-50 py-1">
                    <span className="text-gray-800 break-all min-w-0">{field}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <span className="font-semibold text-sky-700">{count}</span>
                      <InsightFeedbackMenu
                        insightId={fid}
                        insightType="importTracingDeepField"
                        onInsightFeedback={onInsightFeedback}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No DC old→new field deltas in sample.</p>
          )}
        </div>
      </div>

      {mis.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <h4 className="text-sm font-semibold text-rose-900 mb-2">
            AC new vs DC new — same row, different values
          </h4>
          <ul className="text-sm space-y-1">
            {mis.map(([field, count], i) => {
              const mid = `importTracingDeep-mis-${i}`;
              if (hidden.has(mid)) return null;
              return (
                <li key={field} className="flex items-start justify-between gap-2">
                  <span className="break-all text-rose-950 min-w-0">{field}</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <span className="font-semibold text-rose-800">{count} rows</span>
                    <InsightFeedbackMenu
                      insightId={mid}
                      insightType="importTracingDeepField"
                      onInsightFeedback={onInsightFeedback}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {transitions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
          <h4 className="text-sm font-semibold text-amber-950 mb-2">Inventory / status transitions</h4>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t, i) => {
              const tid = `importTracingDeep-trans-${i}`;
              if (hidden.has(tid)) return null;
              return (
                <span
                  key={tid}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-amber-200 text-amber-950"
                >
                  {t.pattern} <span className="text-amber-700">({t.count})</span>
                  <InsightFeedbackMenu
                    insightId={tid}
                    insightType="importTracingDeep"
                    onInsightFeedback={onInsightFeedback}
                  />
                </span>
              );
            })}
          </div>
        </div>
      )}

      {examples.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Strongest per-row examples (old → new)</h4>
          <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1">
            {examples.map((ex, idx) => {
              const eid = `importTracingDeep-ex-${idx}`;
              if (hidden.has(eid)) return null;
              return (
              <div
                key={eid}
                className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap gap-2 min-w-0">
                  <span className="font-semibold text-gray-800">numberID {ex.numberID}</span>
                  {ex.TracingStatus != null && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                      {String(ex.TracingStatus)}
                    </span>
                  )}
                  <span className="text-gray-500">{ex.updatedTime || ""}</span>
                  </div>
                  <InsightFeedbackMenu
                    insightId={eid}
                    insightType="importTracingDeepExample"
                    onInsightFeedback={onInsightFeedback}
                  />
                </div>
                {(ex.acChanges || []).length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-violet-800 mb-1">AC changes</div>
                    <ul className="text-xs space-y-1">
                      {ex.acChanges.map((c, j) => (
                        <li key={j} className="break-words border-l-2 border-violet-300 pl-2">
                          <span className="font-semibold text-gray-800">{c.field}:</span>{" "}
                          <span className="text-rose-700">{formatTraceValue(c.old)}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-emerald-700">{formatTraceValue(c.new)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(ex.dcChanges || []).length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-sky-800 mb-1">DC changes</div>
                    <ul className="text-xs space-y-1">
                      {ex.dcChanges.map((c, j) => (
                        <li key={j} className="break-words border-l-2 border-sky-300 pl-2">
                          <span className="font-semibold text-gray-800">{c.field}:</span>{" "}
                          <span className="text-rose-700">{formatTraceValue(c.old)}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-emerald-700">{formatTraceValue(c.new)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/** Register /detailed: getTracingComapreTable — emphasize registerIds with >1 connected AR_* table (not ImportDataTracing). */
const RegisterCompareMultiTablePanel = ({ registerTracing, onInsightFeedback, hiddenInsightIds }) => {
  if (!registerTracing || typeof registerTracing !== "object") return null;
  const hidden = new Set(hiddenInsightIds || []);
  const multi = registerTracing.multiTableConnection || {};
  const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
  const total = toNum(multi.totalRegisterIds);
  const multiN = toNum(multi.multiTableRegisterIds);
  const singleN = toNum(multi.singleTableRegisterIds);
  const unconn = toNum(multi.unconnectedRegisterIds);
  const examples = Array.isArray(multi.multiTableExamples) ? multi.multiTableExamples : [];
  const bullets = Array.isArray(registerTracing.narrativeBullets) ? registerTracing.narrativeBullets : [];
  const pct = total > 0 ? Math.round((multiN / total) * 10000) / 100 : 0;
  const totalCompareRows = toNum(registerTracing.totalRows);
  const compareTableEmpty = totalCompareRows === 0 && total === 0 && multiN === 0;
  const emptyReason = registerTracing.emptyReason;

  const bannerId = "registerCompare-apiBanner";

  return (
    <div className="space-y-4">
      {(emptyReason || compareTableEmpty) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
          {emptyReason || (
            <>
              <span className="font-semibold">getTracingComapreTable: 0 rows</span>
              <span className="text-amber-900">
                {" "}
                — No compare rows for this objectId. The panel stays available; verify tracing table setup or refresh
                after data loads.
              </span>
            </>
          )}
        </div>
      )}
      {!hidden.has(bannerId) && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-sm text-teal-950 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-semibold">API: </span>
            {registerTracing.compareTableApi || "AssetRegister/getTracingComapreTable"}
            <span className="text-teal-800 ml-2">
              — Analysis focus:{" "}
              <strong>{registerTracing.analysisEmphasis || "multi_table_gt_1"}</strong> (not report ImportDataTracing).
            </span>
          </div>
          <InsightFeedbackMenu
            insightId={bannerId}
            insightType="registerCompare"
            onInsightFeedback={onInsightFeedback}
          />
        </div>
      )}
      {bullets.length > 0 && (
        <div className="rounded-xl border border-teal-100 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Deterministic summary</h4>
          <ul className="list-none text-sm text-gray-800 space-y-1.5">
            {bullets.map((line, i) => {
              const bid = `registerCompare-bullet-${i}`;
              if (hidden.has(bid)) return null;
              return (
                <li key={bid} className="break-words flex items-start justify-between gap-2 border-l-4 border-teal-100 pl-3">
                  <span className="min-w-0">{line}</span>
                  <InsightFeedbackMenu
                    insightId={bid}
                    insightType="registerCompare"
                    onInsightFeedback={onInsightFeedback}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-rose-900 uppercase">&gt;1 table (risk)</div>
          <div className="text-lg font-bold text-rose-950">{multiN}</div>
          <div className="text-[10px] text-rose-800">{pct}% of linked IDs</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-600 uppercase">Linked IDs</div>
          <div className="text-lg font-bold text-slate-900">{total}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-emerald-900 uppercase">Single table</div>
          <div className="text-lg font-bold text-emerald-950">{singleN}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-center">
          <div className="text-[10px] font-semibold text-amber-900 uppercase">Unconnected</div>
          <div className="text-lg font-bold text-amber-950">{unconn}</div>
        </div>
      </div>
      {examples.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-900">
            Multi-table examples (registerId → connected AR_* tables)
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 text-sm">
            {examples.map((ex, idx) => {
              const eid = `registerCompare-ex-${idx}`;
              if (hidden.has(eid)) return null;
              return (
              <div key={eid} className="px-4 py-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 items-center min-w-0">
                  <span className="font-mono font-semibold text-gray-900">registerId {ex.registerId}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-900">
                    {ex.connectedTableCount ?? (ex.connectedTables || []).length} tables
                  </span>
                  {ex.RegisterTracingStatus != null && (
                    <span className="text-xs text-gray-600">{String(ex.RegisterTracingStatus)}</span>
                  )}
                  </div>
                  <InsightFeedbackMenu
                    insightId={eid}
                    insightType="registerCompare"
                    onInsightFeedback={onInsightFeedback}
                  />
                </div>
                {ex.applicationHint && (
                  <div className="text-xs text-gray-600">Application: {ex.applicationHint}</div>
                )}
                <div className="text-xs text-gray-700 break-words">
                  <span className="font-medium text-teal-800">Tables: </span>
                  {(ex.connectedTables || []).join(", ") || "—"}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}
      {multiN === 0 &&
        examples.length === 0 &&
        !compareTableEmpty &&
        (() => {
        const eid = "registerCompare-emptyHint";
        if (hidden.has(eid)) return null;
        return (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-teal-100 bg-teal-50/30 px-3 py-2">
            <p className="text-sm text-gray-600 min-w-0">
              No registerIds with more than one connected report table in this snapshot. Quality signal is favorable for
              multi-table ambiguity.
            </p>
            <InsightFeedbackMenu
              insightId={eid}
              insightType="registerCompare"
              onInsightFeedback={onInsightFeedback}
            />
          </div>
        );
      })()}
    </div>
  );
};

const AiInsightContent = ({ aiResult, onInsightFeedback, hiddenInsightIds, pathname = "" }) => {
  if (!aiResult) return null;

  /** Empty = show all sections. Non-empty = show only listed sections (focus / isolate). */
  const [focusedSections, setFocusedSections] = useState([]);

  const showKpis = focusedSections.length === 0 || focusedSections.includes("kpis");
  const showTrends = focusedSections.length === 0 || focusedSections.includes("trends");
  const showMaturity = focusedSections.length === 0 || focusedSections.includes("maturity");
  const showRisks = focusedSections.length === 0 || focusedSections.includes("risks");
  const showPositives = focusedSections.length === 0 || focusedSections.includes("positives");
  const showRecommendations = focusedSections.length === 0 || focusedSections.includes("recommendations");
  const showColumnInsights = focusedSections.length === 0 || focusedSections.includes("columnInsights");
  const showRowInsights = focusedSections.length === 0 || focusedSections.includes("rowInsights");

  const isReportJobDetailRoute =
    typeof pathname === "string" &&
    (pathname.includes("/data-console/reports/original-source/jobs/") ||
      pathname.includes("/data-console/reports/by-ar-resource/jobs/"));

  /** Match Register detailed regardless of leading slash or rare basename differences. */
  const pathClean = typeof pathname === "string" ? pathname.split("?")[0].replace(/\/$/, "") : "";
  const isRegisterDetailedRoute =
    typeof pathname === "string" &&
    (pathClean === "/data-console/register/detailed" ||
      pathClean === "data-console/register/detailed" ||
      pathClean.endsWith("/data-console/register/detailed") ||
      /(^|\/)register\/detailed$/.test(pathClean));

  const registerTracing = aiResult.registerTracing;

  /** Register /detailed: same slot as “Import Data Tracing” on report jobs — getTracingComapreTable (not ImportDataTracing). */
  const hasRegisterTracingComparePanel = !!(
    isRegisterDetailedRoute ||
    (!isReportJobDetailRoute &&
      registerTracing &&
      typeof registerTracing === "object" &&
      Object.keys(registerTracing).length > 0 &&
      (registerTracing.compareTableApi === "AssetRegister/getTracingComapreTable" ||
        registerTracing.analysisEmphasis === "multi_table_gt_1" ||
        registerTracing.dataSource === "Register"))
  );

  const registerPanelData = useMemo(() => {
    const rt = aiResult?.registerTracing;
    if (rt && typeof rt === "object" && Object.keys(rt).length > 0) {
      return rt;
    }
    if (isRegisterDetailedRoute) {
      return {
        panelEligible: true,
        dataSource: "Register",
        compareTableApi: "AssetRegister/getTracingComapreTable",
        analysisEmphasis: "multi_table_gt_1",
        totalRows: 0,
        multiTableConnection: {
          totalRegisterIds: 0,
          multiTableRegisterIds: 0,
          singleTableRegisterIds: 0,
          unconnectedRegisterIds: 0,
          multiTableExamples: [],
        },
        emptyReason:
          "Register tracing (getTracingComapreTable) was not included in this analysis response. Click Refresh insights, ensure an object is selected in the header, and verify the AI service can reach AssetRegister/getTracingComapreTable/{objectId}.",
      };
    }
    return {};
  }, [aiResult?.registerTracing, isRegisterDetailedRoute]);

  const showRegisterTracingCompare =
    hasRegisterTracingComparePanel &&
    (focusedSections.length === 0 || focusedSections.includes("registerCompare"));

  const importTracing = aiResult.importTracing;
  const hasImportDataTracingPanel = !!(
    isReportJobDetailRoute ||
    (importTracing &&
      typeof importTracing === "object" &&
      (importTracing.panelEligible === true ||
        (Number(importTracing.totalRows) || 0) > 0 ||
        (importTracing.statusCounts && Object.keys(importTracing.statusCounts).length > 0) ||
        (Array.isArray(importTracing.examples) && importTracing.examples.length > 0) ||
        (importTracing.deepAnalysis && Number(importTracing.deepAnalysis.rowsAnalyzed) > 0)))
  );
  const tracingForPanel =
    importTracing && typeof importTracing === "object" && Object.keys(importTracing).length > 0
      ? importTracing
      : isReportJobDetailRoute
        ? {
            emptyReason:
              "Import Data Tracing was not included in this analysis response. Click Refresh insights, or upgrade/restart the AI service so report job pages return importTracing.",
          }
        : {};
  const showImportDataTracing =
    hasImportDataTracingPanel &&
    (focusedSections.length === 0 || focusedSections.includes("importDataTracing"));

  const importTracingRelatedInsights = useMemo(() => pickImportTracingRelatedInsights(aiResult), [aiResult]);

  const isFilterChipActive = (key) =>
    focusedSections.length === 0 || focusedSections.includes(key);

  const toggleSection = (key) => {
    setFocusedSections((prev) => {
      if (!prev.length) {
        return [key];
      }
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next;
      }
      return [...prev, key];
    });
  };

  const clearSectionFocus = () => setFocusedSections([]);

  const overviewCharts = filterChartsByScope(aiResult.charts, "overview");
  const columnCharts = filterChartsByScope(aiResult.charts, "column");
  const rowCharts = filterChartsByScope(aiResult.charts, "row");
  const atAGlanceItems = [
    ...(aiResult.totalInsights || []).map((item) => item.text || item.insight),
    ...(normalizeTextItems(aiResult.trends).slice(0, 2) || []),
    ...(aiResult.importTracing?.statusCounts
      ? (() => {
          const statusCounts = aiResult.importTracing.statusCounts || {};
          const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
          const totalRows = toNum(aiResult.importTracing.totalRows);

          const matched = toNum(
            statusCounts["Matched"] +
              statusCounts["matched"] +
              statusCounts["FULLY MATCHED"] +
              statusCounts["fully matched"]
          );
          const partiallyMatched = toNum(
            statusCounts["Partially Matched"] +
              statusCounts["partially matched"]
          );
          const deleted = toNum(
            statusCounts["Deleted"] +
              statusCounts["deleted"] +
              statusCounts["DELETED"]
          );
          const pending = toNum(
            statusCounts["null"] +
              statusCounts["Null"] +
              statusCounts[null] +
              statusCounts[""] +
              statusCounts["pending"] +
              statusCounts["Pending"]
          );

          const other = Math.max(0, totalRows - (matched + partiallyMatched + deleted + pending));

          const range = aiResult.importTracing?.updatedTimeRange
            ? `${aiResult.importTracing.updatedTimeRange.oldest || ""} → ${aiResult.importTracing.updatedTimeRange.newest || ""}`
            : "";

          const conclusion = (() => {
            const topCat = [
              { label: "Matched", v: matched },
              { label: "Partially Matched", v: partiallyMatched },
              { label: "Deleted", v: deleted },
              { label: "Pending / Untraced", v: pending },
              { label: "Other", v: other },
            ].sort((a, b) => b.v - a.v)[0];

            if (topCat?.v <= 0) return "Import update status: no tracing rows available for this selection.";
            if (topCat.label === "Matched") return "Conclusion: most traced records are fully matched; mapping appears stable for the selected job/table.";
            if (topCat.label === "Partially Matched") return "Conclusion: most traced records are partially matched; focus on field-level mapping discrepancies and missing keys.";
            if (topCat.label === "Deleted") return "Conclusion: a significant portion of traced records are marked deleted; verify deletion rules and filter logic.";
            if (topCat.label === "Pending / Untraced") return "Conclusion: many records are pending/untraced; import tracing may be incomplete—re-run or wait for updates.";
            return "Conclusion: tracing shows mixed statuses; review the top mismatch reasons and validate input key construction.";
          })();

          const lines = [
            `Import tracing — Updated rows: ${totalRows}${range ? ` | ${range}` : ""}`,
            `Matched: ${matched}`,
            `Partially matched: ${partiallyMatched}`,
            `Deleted: ${deleted}`,
            `Pending / untraced: ${pending}${other ? ` | Other: ${other}` : ""}`,
            conclusion,
          ];

          return lines.filter(Boolean);
        })()
      : []),
    ...(aiResult.registerTracing
      ? (() => {
          const toNum = (v) => (typeof v === "number" ? v : Number(v || 0));
          const multi = aiResult.registerTracing?.multiTableConnection || {};
          const multiCount = toNum(multi.multiTableRegisterIds);
          const totalCount = toNum(multi.totalRegisterIds);
          const singleCount = toNum(multi.singleTableRegisterIds);
          const unconnectedCount = toNum(multi.unconnectedRegisterIds);
          const multiRate = totalCount > 0 ? Math.round((multiCount / totalCount) * 10000) / 100 : 0;

          const conclusion = (() => {
            if (totalCount <= 0) {
              return "Conclusion: no register tracing rows available for this selection.";
            }
            if (multiCount <= 0) {
              return "Conclusion: no rows are connected to multiple tableNames; table-link quality looks stable.";
            }
            return "Conclusion: rows connected to >1 tableName are present and should be treated as not-good quality risk.";
          })();

          const exampleRows = Array.isArray(multi.multiTableExamples) ? multi.multiTableExamples : [];
          const exampleLine = exampleRows.length
            ? "Examples: " +
              exampleRows
                .slice(0, 3)
                .map((ex) => {
                  const rid = ex?.registerId ?? "-";
                  const tables = Array.isArray(ex?.connectedTables) ? ex.connectedTables.slice(0, 4).join(", ") : "";
                  return `${rid}${tables ? ` (${tables})` : ""}`;
                })
                .join("; ")
            : "";

          const lines = [
            `Register tracing quality — Multi-table connected rows: ${multiCount}/${totalCount} (${multiRate}%)`,
            `Single-table connected rows: ${singleCount}`,
            `Unconnected rows: ${unconnectedCount}`,
            ...(exampleLine ? [exampleLine] : []),
            conclusion,
          ];

          return lines.filter(Boolean);
        })()
      : []),
  ].filter(Boolean);
  const hidden = new Set(hiddenInsightIds || []);

  return (
    <div className="space-y-6 text-gray-900">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur p-3.5 shadow-sm min-w-0 overflow-hidden sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Insight filters</div>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
              By default everything is shown. Click sections to focus; click again to remove. Clear focus to show all
              again.
            </p>
          </div>
          {focusedSections.length > 0 && (
            <button
              type="button"
              onClick={clearSectionFocus}
              className="shrink-0 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 transition-colors"
            >
              Show all sections
            </button>
          )}
        </div>
        {/* Horizontal chip row (scroll on narrow viewports) — order matches vertical panels below */}
        <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => toggleSection("kpis")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("kpis")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            1. KPIs & Data
          </button>
          <button
            type="button"
            onClick={() => toggleSection("columnInsights")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("columnInsights")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            2. Column Insights
          </button>
          <button
            type="button"
            onClick={() => toggleSection("rowInsights")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("rowInsights")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            3. Row Insights
          </button>
          {hasImportDataTracingPanel && (
            <button
              type="button"
              onClick={() => toggleSection("importDataTracing")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isFilterChipActive("importDataTracing")
                  ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              4. Import Data Tracing
            </button>
          )}
          {hasRegisterTracingComparePanel && !isReportJobDetailRoute && (
            <button
              type="button"
              onClick={() => toggleSection("registerCompare")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isFilterChipActive("registerCompare")
                  ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              4. Register tracing (compare)
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleSection("trends")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("trends")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            5. Trends / Changes
          </button>
          <button
            type="button"
            onClick={() => toggleSection("maturity")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("maturity")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            6. Maturity
          </button>
          <button
            type="button"
            onClick={() => toggleSection("risks")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("risks")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            7. Risks / Alerts
          </button>
          <button
            type="button"
            onClick={() => toggleSection("positives")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("positives")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            8. Positives
          </button>
          <button
            type="button"
            onClick={() => toggleSection("recommendations")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isFilterChipActive("recommendations")
                ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            9. Recommendations
          </button>
        </div>
      </div>
      {showKpis && (
        <section className="rounded-2xl border border-gray-200/90 bg-gradient-to-br from-slate-50 via-white to-white p-5 shadow-sm">
          <div className="space-y-4">
            <SectionHeader
              title="KPIs & Data"
              subtitle="Total dataset insights with the most important metrics and visual summaries."
            />
            {aiResult.kpis && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {(aiResult.kpis || []).map((kpi, idx) => {
                  const insightId = `kpi-${idx}`;
                  if (hidden.has(insightId)) return null;
                  return (
                    <li
                      key={insightId}
                      className="border rounded-xl p-3 text-sm bg-white shadow-sm min-h-[110px] hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-gray-800">{kpi.title}</div>
                        <InsightFeedbackMenu
                          insightId={insightId}
                          insightType="kpi"
                          onInsightFeedback={onInsightFeedback}
                        />
                      </div>
                      {kpi.value !== undefined && (
                        <div className="text-xl font-semibold text-gray-900 mt-1 break-all">
                          {kpi.value}
                        </div>
                      )}
                      {kpi.description && (
                        <div className="text-xs text-gray-600 mt-1 leading-5 break-words">
                          {kpi.description}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {/* KPI/Data overview excludes System Health and At A Glance (moved to dedicated panels). */}
            <TotalInsightCards
              items={aiResult.totalInsights}
              onInsightFeedback={onInsightFeedback}
              hiddenInsightIds={hiddenInsightIds}
            />
            <ChartGrid
              charts={overviewCharts.length ? overviewCharts : aiResult.charts?.slice(0, 2)}
              onInsightFeedback={onInsightFeedback}
            />
          </div>
        </section>
      )}

      {showColumnInsights && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Column Insights"
            subtitle="Coverage for all provided columns, combining data quality observations and visual evidence."
          />
          <InsightList
            items={aiResult.columnInsights}
            type="column"
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
          <ChartGrid charts={columnCharts} onInsightFeedback={onInsightFeedback} />
        </section>
      )}

      {showRowInsights && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Row Insights"
            subtitle="Coverage for row-level patterns and issue groups across the dataset."
          />
          <InsightList
            items={aiResult.rowInsights}
            type="row"
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
          <ChartGrid charts={rowCharts} onInsightFeedback={onInsightFeedback} />
        </section>
      )}

      {showRegisterTracingCompare && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Register tracing (getTracingComapreTable)"
            subtitle={
              isRegisterDetailedRoute
                ? "Register / detailed — authoritative data from AssetRegister/getTracingComapreTable only (same role as Import Data Tracing on report jobs). Focus: registerIds linked to more than one report table (AR_*)."
                : "Uses AssetRegister/getTracingComapreTable only — not ImportDataTracing. Primary signal: registerIds linked to more than one report table (AR_*); those rows need review."
            }
          />
          <RegisterCompareMultiTablePanel
            registerTracing={registerPanelData}
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
        </section>
      )}

      {showImportDataTracing && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Import Data Tracing"
            subtitle="ImportDataTracing API overview, AI-generated findings that reference tracing, and detailed AC/DC old→new JSON field analysis when available."
          />
          <ImportTracingAiInsightsPanel
            related={importTracingRelatedInsights}
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
          <ImportTracingSummaryPanel
            tracing={tracingForPanel}
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
          <ImportTracingDeepPanel
            deep={tracingForPanel?.deepAnalysis}
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
        </section>
      )}

      {showTrends && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Trends / Changes"
            subtitle="Detailed count data plus what changed in subsequent imports."
          />
          <AtAGlanceCard
            items={atAGlanceItems}
            onInsightFeedback={onInsightFeedback}
            hiddenInsightIds={hiddenInsightIds}
          />
        </section>
      )}

      {showMaturity && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <SectionHeader
            title="Maturity"
            subtitle="System health, maturity score, and stability interpretation."
          />
          <MaturityCard
            maturityScore={aiResult.maturityScore}
            onInsightFeedback={onInsightFeedback}
          />
        </section>
      )}

      {showRisks && (
        <NarrativeBlock
          title="Risks / Alerts"
          items={aiResult.risks}
          tone="risk"
          onInsightFeedback={onInsightFeedback}
          hiddenInsightIds={hiddenInsightIds}
        />
      )}

      {showPositives && (
        <NarrativeBlock
          title="Positives / Consistencies"
          items={aiResult.positives}
          tone="positive"
          onInsightFeedback={onInsightFeedback}
          hiddenInsightIds={hiddenInsightIds}
        />
      )}

      {showRecommendations && (
        <NarrativeBlock
          title="Recommendations"
          items={aiResult.recommendations}
          tone="neutral"
          onInsightFeedback={onInsightFeedback}
          hiddenInsightIds={hiddenInsightIds}
        />
      )}
    </div>
  );
};

/**
 * Compact charts + KPI peek for the in-panel AI chat (same data as main insight run).
 */
export function AiChatContextStrip({ charts = [], kpisSnapshot = [], maxCharts = 2 }) {
  const chartSlice = Array.isArray(charts) ? charts.slice(0, maxCharts) : [];
  const kpiSlice = Array.isArray(kpisSnapshot) ? kpisSnapshot.slice(0, 6) : [];
  if (!chartSlice.length && !kpiSlice.length) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-2.5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-800 px-0.5">
        Context from insights
      </div>
      {!!kpiSlice.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {kpiSlice.map((kpi, i) => (
            <div
              key={`${kpi?.title || "kpi"}-${i}`}
              className="rounded-lg border border-slate-100 bg-white px-2 py-1.5 min-w-0"
            >
              <div className="text-[10px] font-semibold text-gray-500 truncate">{kpi?.title || "KPI"}</div>
              <div className="text-sm font-bold text-violet-900 truncate">{kpi?.value ?? "—"}</div>
              {kpi?.description && (
                <div className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{kpi.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {chartSlice.map((chart, idx) => {
        const { values } = getChartSeries(chart);
        if (!values?.length) return null;
        return (
          <div
            key={chart?.id ?? `chat-ctx-${idx}`}
            className="rounded-lg border border-slate-100 bg-white overflow-hidden"
          >
            <div className="text-xs font-medium text-gray-800 px-2 pt-2 truncate">
              {chart.title || chart.id || "Chart"}
            </div>
            <div className="h-[130px] w-full">
              <ChartRenderer chart={chart} height={130} compact />
            </div>
            <div className="text-[10px] text-gray-500 px-2 pb-1.5 line-clamp-2">{getChartHighlight(chart)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default AiInsightContent;
