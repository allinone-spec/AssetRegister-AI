import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { exportToCSV } from "../../Utility/utilityFunction";
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
  CircularProgress,
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
        onMouseDown={(e) => e.stopPropagation()}
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
        disableScrollLock
        anchorOrigin={{ vertical: anchorVertical, horizontal: anchorHorizontal }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ zIndex: 1600 }}
        slotProps={{
          root: {
            onClick: (e) => e.stopPropagation(),
            sx: { zIndex: 1600 },
          },
          paper: {
            onClick: (e) => e.stopPropagation(),
            sx: { zIndex: 1600 },
          },
        }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleFeedback("helpful");
          }}
        >
          {FEEDBACK_TYPES.helpful}
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleFeedback("not_helpful");
          }}
        >
          {FEEDBACK_TYPES.not_helpful}
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleFeedback("irrelevant");
          }}
        >
          {FEEDBACK_TYPES.irrelevant}
        </MenuItem>
      </Menu>
      <Dialog
        open={notHelpfulOpen}
        onClose={() => setNotHelpfulOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        sx={{ zIndex: 1700 }}
      >
        <DialogTitle>Adjust this insight</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600 mb-2">
            For a <strong>revised</strong> version of this insight, describe what you want different. The AI remembers
            this for your session and applies it when you <strong>Refresh insights</strong>. To <strong>hide</strong> the
            card entirely, use <strong>Irrelevant</strong> in the menu—or write that you don&apos;t need it (e.g. &quot;I
            don&apos;t need this panel&quot;) and we&apos;ll treat it as hidden after refresh.
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

/**
 * xAxis labels may be objects or JSON strings (e.g. permission rows). Recharts legends
 * use these as slice names — raw JSON overlays the pie. Reduce to a short display string.
 */
const normalizeChartCategoryLabel = (raw, index = 0) => {
  if (raw == null || raw === "") return `Item ${index + 1}`;

  const fromObject = (o) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    const pick =
      o.permissionName ??
      o.name ??
      o.label ??
      o.title ??
      (o.permissionId != null && o.permissionId !== "" ? String(o.permissionId) : null) ??
      (o.id != null && o.id !== "" ? String(o.id) : null);
    if (pick != null && typeof pick !== "object") return String(pick);
    const keys = Object.keys(o);
    if (keys.length === 1) return String(o[keys[0]]);
    return null;
  };

  if (typeof raw === "object") {
    const s = fromObject(raw);
    if (s) return formatAxisLabel(s, 32);
    try {
      return formatAxisLabel(JSON.stringify(raw), 36);
    } catch {
      return `Item ${index + 1}`;
    }
  }

  let s = String(raw).trim();
  if (!s) return `Item ${index + 1}`;

  if (
    (s.startsWith("{") && s.endsWith("}")) ||
    (s.startsWith("[") && s.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const inner = fromObject(parsed);
        if (inner) return formatAxisLabel(inner, 32);
      }
      if (Array.isArray(parsed) && parsed.length) {
        return normalizeChartCategoryLabel(parsed[0], index);
      }
    } catch {
      /* use raw string below */
    }
  }

  return formatAxisLabel(s, 36);
};

const coerceChartNumericValue = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (v && typeof v === "object" && typeof v.value === "number") return v.value;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const DRILL_GRID_CAP = 50000;

/** Normalize cell values for table display and CSV (no React nodes). */
const sanitizeRowsForDrill = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((r) => {
    if (!r || typeof r !== "object") return { value: String(r) };
    const o = {};
    Object.keys(r).forEach((k) => {
      let v = r[k];
      if (v === null || v === undefined) {
        o[k] = "";
      } else if (typeof v === "object") {
        try {
          o[k] = JSON.stringify(v);
        } catch {
          o[k] = String(v);
        }
      } else {
        o[k] = v;
      }
    });
    return o;
  });
};

/** Integer parsing safe for API counts (never NaN). */
const safeInt = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const n = parseInt(String(v ?? "").replace(/,/g, "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Roll arbitrary ImportDataTracing statusCounts keys into stable buckets (API uses raw TracingStatus strings).
 */
const aggregateImportTracingStatusCounts = (statusCounts) => {
  const buckets = {
    matched: 0,
    partiallyMatched: 0,
    deleted: 0,
    pending: 0,
    other: 0,
  };
  if (!statusCounts || typeof statusCounts !== "object") {
    return { ...buckets, totalFromBuckets: 0 };
  }
  let totalFromBuckets = 0;
  for (const [rawKey, rawVal] of Object.entries(statusCounts)) {
    const v = safeInt(rawVal);
    totalFromBuckets += v;
    const k = String(rawKey == null ? "" : rawKey).trim().toLowerCase();
    if (
      k === "matched" ||
      k === "fully matched" ||
      k === "full matched" ||
      (k.includes("matched") && !k.includes("partial"))
    ) {
      buckets.matched += v;
    } else if (k.includes("partial")) {
      buckets.partiallyMatched += v;
    } else if (k.includes("delet")) {
      buckets.deleted += v;
    } else if (
      k === "null" ||
      k === "" ||
      k === "pending" ||
      k === "none" ||
      k.includes("pending") ||
      k.includes("untrace")
    ) {
      buckets.pending += v;
    } else {
      buckets.other += v;
    }
  }
  return { ...buckets, totalFromBuckets };
};

const TRACING_STATUS_KEYS = [
  "TracingStatus",
  "tracingStatus",
  "TRACING_STATUS",
  "ImportTracingStatus",
  /** Job report grid (JobData_Rules / getAC|getDC data) */
  "import_status_update",
  "Import_Status_Update",
  /** Register compare grid */
  "RegisterTracingStatus",
  "registerTracingStatus",
];

const findTracingStatusAccessor = (sampleRow) => {
  if (!sampleRow || typeof sampleRow !== "object") return null;
  for (const k of TRACING_STATUS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(sampleRow, k)) return k;
  }
  const keys = Object.keys(sampleRow);
  const compact = (s) => String(s || "").replace(/\s+/g, "");
  const fuzzy = keys.find((key) =>
    /importstatus|import_status|tracingstatus|registertracing|trace[_-]?status/i.test(compact(key)),
  );
  if (fuzzy) return fuzzy;
  return keys.find((key) => /tracing\s*status|import.*trace.*status|trace\s*status/i.test(key)) || null;
};

const normalizeTracingCell = (val) => {
  if (val === null || val === undefined || val === "") return "null";
  return String(val).trim();
};

const rowMatchesTracingCategory = (cellNorm, category) => {
  const k = cellNorm.toLowerCase();
  if (category === "matched") {
    return (
      k === "matched" ||
      k === "fully matched" ||
      k === "full matched" ||
      (k.includes("matched") && !k.includes("partial"))
    );
  }
  if (category === "partiallyMatched") {
    return k.includes("partial");
  }
  if (category === "deleted") {
    return k.includes("delet");
  }
  if (category === "pending") {
    return (
      k === "null" ||
      k === "" ||
      k === "pending" ||
      k === "none" ||
      k.includes("pending") ||
      k.includes("untrace")
    );
  }
  return true;
};

const filterRowsByTracingCategory = (rows, category) => {
  if (!category || !Array.isArray(rows) || rows.length === 0) return rows;
  const acc = findTracingStatusAccessor(rows[0]);
  if (!acc) return rows;
  return rows.filter((r) => rowMatchesTracingCategory(normalizeTracingCell(r[acc]), category));
};

const resolveColumnAccessor = (sampleRow, colName) => {
  if (!sampleRow || !colName) return null;
  const keys = Object.keys(sampleRow);
  const c = String(colName).trim();
  if (!c) return null;
  const exact = keys.find((k) => k === colName);
  if (exact) return exact;
  const tl = c.toLowerCase();
  return keys.find((k) => k.toLowerCase() === tl) || keys.find((k) => k.toLowerCase().includes(tl)) || null;
};

/** Prefer rows with empty values in the insight column — never return the whole grid as a “column drill”. */
const filterRowsForColumnInsight = (rows, colName) => {
  if (!Array.isArray(rows) || rows.length === 0) return { rows: [], mode: "none" };
  const acc = resolveColumnAccessor(rows[0], colName);
  if (!acc) return { rows: [], mode: "none" };
  const emptyish = rows.filter((r) => {
    const v = r[acc];
    return v === "" || v === null || v === undefined;
  });
  if (emptyish.length > 0) return { rows: emptyish, mode: "emptyInColumn" };
  return { rows: [], mode: "noEmpty" };
};

const DRILL_STOPWORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "were",
  "will",
  "your",
  "their",
  "data",
  "rows",
  "row",
  "table",
  "insight",
  "analysis",
  "should",
  "could",
  "would",
  "about",
  "which",
  "there",
  "these",
  "those",
  "other",
  "into",
  "than",
  "then",
  "such",
  "most",
  "more",
  "some",
  "many",
  "much",
  "very",
  "when",
  "where",
  "what",
  "make",
  "like",
  "also",
  "only",
  "just",
  "based",
  "using",
  "used",
  "across",
  "report",
  "register",
  "original",
  "source",
  "resource",
  "please",
  "note",
  "focus",
  "review",
  "check",
  "ensure",
  "summary",
  "total",
  "health",
  "system",
  "score",
  "kpi",
]);

const DRILL_IGNORE_HEADER_KEYS = new Set(["history", "id", "key", "actions", "action"]);

const tokenizeForDrillMatch = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9%._-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !DRILL_STOPWORDS.has(t));

const findReferencedColumnKeys = (text, headers) => {
  if (!text || !headers?.length) return [];
  const lower = text.toLowerCase();
  const sorted = [...new Set(headers)].sort((a, b) => String(b).length - String(a).length);
  const hits = [];
  for (const h of sorted) {
    const hn = String(h).toLowerCase();
    if (hn.length < 4 || DRILL_IGNORE_HEADER_KEYS.has(hn)) continue;
    if (lower.includes(hn) || lower.includes(hn.replace(/_/g, " "))) hits.push(h);
  }
  return hits;
};

const filterRowsByInsightTextOverlap = (rows, title, extraHint, extraTokens = []) => {
  const tokens = [
    ...new Set([
      ...tokenizeForDrillMatch(`${title || ""} ${extraHint || ""}`),
      ...(extraTokens || []).map((t) => String(t).toLowerCase()).filter((t) => t.length >= 2),
    ]),
  ];
  if (!tokens.length || !rows.length) return [];
  const minHits = tokens.length === 1 ? 1 : 2;
  const out = rows.filter((row) => {
    const blob = JSON.stringify(row).toLowerCase();
    let h = 0;
    for (const t of tokens) {
      if (blob.includes(t)) h++;
    }
    return h >= minHits;
  });
  if (!out.length || out.length > rows.length * 0.92) return [];
  return out;
};

const filterRowsContainingKpiValue = (rows, value) => {
  const s = String(value ?? "").trim();
  if (s.length < 2) return [];
  const sl = s.toLowerCase();
  const out = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(sl));
  if (!out.length || out.length > rows.length * 0.92) return [];
  return out;
};

/**
 * Infer import/tracing status drill — strict enough to avoid matching generic English ("matched the schema").
 */
const inferTracingDrillCategoryFromText = (text) => {
  const t = String(text || "").toLowerCase();
  const traceCtx =
    /\b(import|tracing|trace|traced|untraced|import_status|import status|tracingstatus|tracing status)\b/.test(t) ||
    /\b(import\s*data\s*tracing|data\s*tracing)\b/.test(t);
  if (/\bpartially\s*matched\b|\bpartial\s+match\b/.test(t)) return "partiallyMatched";
  if (/\bdeleted\b/.test(t) && !/\bpartial/.test(t) && traceCtx) return "deleted";
  if (
    (/\bpending\b|\buntraced\b|\bnull\s*status\b|\buntrace/.test(t) && traceCtx) ||
    /\bpending\s*\/\s*untraced\b/.test(t)
  ) {
    return "pending";
  }
  if (/\bmatched\b/.test(t) && !/\bpartial/.test(t)) {
    if (/\bmatched\s*:\s*\d/.test(t) || /\d+\s*matched\b/.test(t) || /\bfully\s+matched\b/.test(t) || traceCtx) {
      return "matched";
    }
  }
  return null;
};

/** Quoted / "top value is …" fragments often name the exact cell values an insight refers to. */
const extractLikelyValuesFromInsightText = (text) => {
  const s = String(text || "");
  const out = [];
  let m;
  const r1 = /'([^']{1,120})'/g;
  while ((m = r1.exec(s))) out.push(m[1].trim());
  const r2 = /"([^"]{1,120})"/g;
  while ((m = r2.exec(s))) out.push(m[1].trim());
  const top = /\btop value is\s+([^.,;\n]{1,80})/i.exec(s);
  if (top) out.push(top[1].trim());
  return [...new Set(out.filter((v) => v.length >= 2 && v.length < 200))];
};

const findGridColumnByPattern = (sampleRow, patternStr) => {
  if (!sampleRow || typeof sampleRow !== "object") return null;
  const re = new RegExp(patternStr, "i");
  for (const col of Object.keys(sampleRow)) {
    if (re.test(String(col))) return col;
  }
  return null;
};

const parseRowDateMs = (v) => {
  if (v == null || v === "") return NaN;
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v > 1e12 ? v : v * 1000);
    const t = d.getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  const p = Date.parse(String(v));
  return Number.isNaN(p) ? NaN : p;
};

const MS_30D = 30 * 24 * 60 * 60 * 1000;

const normalizeAnomalyIssueCode = (raw) => {
  if (raw == null || raw === "") return "";
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "sparse_rows") return "sparse_row";
  return s.replace(/[^a-z0-9_]/g, "");
};

/** Align row-insight issues with ai-service _detect_anomalies heuristics. */
const filterRowsForAnomalyIssue = (rows, issueCode) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const issue = normalizeAnomalyIssueCode(issueCode);
  if (!issue || issue === "healthy_rows" || issue === "multi_table_connection") return [];

  const cols = Object.keys(rows[0]);

  if (issue === "missing_purchase") {
    const col = findGridColumnByPattern(rows[0], "\\b(purchase|order|invoice|cost)\\b");
    if (!col) return [];
    return rows.filter((r) => r[col] === "" || r[col] == null);
  }

  if (issue === "missing_id") {
    let col = findGridColumnByPattern(rows[0], "\\b(id|device_id|asset_id|record_id|key)\\b");
    if (!col) col = cols[0];
    return rows.filter((r) => r[col] === "" || r[col] == null);
  }

  if (issue === "inactive_device") {
    const statusCol = findGridColumnByPattern(rows[0], "\\b(status|state|active)\\b");
    const seenCol = findGridColumnByPattern(
      rows[0],
      "last_seen|last activity|last_activity|updated|modified|last_used",
    );
    if (!statusCol || !seenCol) return [];
    const cutoff = Date.now() - MS_30D;
    const activeSet = new Set(["active", "true", "1", "yes"]);
    return rows.filter((r) => {
      const st = String(r[statusCol] ?? "").trim().toLowerCase();
      if (!activeSet.has(st)) return false;
      const ms = parseRowDateMs(r[seenCol]);
      return !Number.isNaN(ms) && ms < cutoff;
    });
  }

  if (issue === "sparse_row") {
    const threshold = Math.max(1, Math.floor(cols.length / 3));
    return rows.filter((r) => {
      let nn = 0;
      for (const k of cols) {
        const v = r[k];
        if (v !== "" && v != null) nn++;
      }
      return nn < threshold;
    });
  }

  return [];
};

/** KPI row-count tile: same meaning as Total Records — show full job/register rows, not value/text narrowing. */
const isTotalRecordsKpiTitle = (title) => {
  const t = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return t === "total records" || t === "total record";
};

const singularizeKpiToken = (w) => {
  const t = String(w).toLowerCase();
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 4 && t.endsWith("sses")) return t.slice(0, -2);
  if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
};

/** Map KPI title phrases (e.g. "application", "publishers") to a grid column. */
const resolveColumnFromKpiSubjectPhrase = (sampleRow, subjectPhrase) => {
  if (!sampleRow || !subjectPhrase) return null;
  const keys = Object.keys(sampleRow);
  const raw = String(subjectPhrase)
    .trim()
    .toLowerCase()
    .replace(/[\-_]+/g, " ");
  const tokens = [...new Set(raw.split(/\s+/).map(singularizeKpiToken).filter((x) => x.length >= 2))];
  if (!tokens.length) return null;

  const scoreKey = (key) => {
    const kl = String(key).toLowerCase();
    let s = 0;
    for (const tok of tokens) {
      if (tok.length < 3) continue;
      if (kl === tok) s += 12;
      else if (kl.includes(tok)) s += 6;
      else if (tok.includes(kl) && kl.length >= 4) s += 4;
    }
    return s;
  };

  let best = null;
  let bestScore = 0;
  for (const k of keys) {
    const sc = scoreKey(k);
    if (sc > bestScore) {
      bestScore = sc;
      best = k;
    }
  }
  if (bestScore >= 6) return best;

  const sig = tokens.find((t) => t.length >= 3) || tokens[0];
  if (sig) {
    const escaped = sig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const c = findGridColumnByPattern(sampleRow, `\\b${escaped}\\b`);
    if (c) return c;
  }
  return null;
};

/**
 * KPI cards from the LLM often use titles like "Distinct Application Count" or "Unique Publishers".
 * Only used when the user clicked a KPI tile (`isKpiDrill`).
 */
const inferKpiMetricDrill = (sampleRow, title) => {
  if (!sampleRow || !title) return { mode: "none" };
  const t = String(title)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  let subject = null;
  let mode = "none";

  const tryDistinctCount = () => {
    const patterns = [
      /^distinct\s+(.+?)\s+count$/,
      /^number\s+of\s+distinct\s+(.+)$/,
      /^count\s+of\s+distinct\s+(.+)$/,
      /^count\s+distinct\s+(.+)$/,
      /^#\s*of\s+distinct\s+(.+)$/,
      /^unique\s+(.+?)\s+count$/,
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (m) {
        subject = m[1].trim().replace(/\s+values\s*$/, "");
        mode = "contributing_rows";
        return true;
      }
    }
    return false;
  };

  if (!tryDistinctCount()) {
    const u = t.match(/^unique\s+(.+)$/);
    if (u && !t.includes("count")) {
      subject = u[1].trim().replace(/\s+values\s*$/, "");
      mode = "distinct_value_rows";
    }
  }

  if (mode === "none" || !subject) return { mode: "none" };

  subject = subject.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const col = resolveColumnFromKpiSubjectPhrase(sampleRow, subject);
  if (!col) return { mode: "none" };
  return { mode, column: col };
};

/** Match totalInsight card titles like "Total Records", "total_record" (dedupe vs KPI or duplicate LLM cards). */
const isTotalRecordsInsightCardTitle = (title) => {
  const t = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  return t === "total records" || t === "total record";
};

/** Keep a single Total Records narrative card when there is no KPI; remove all when Total Records KPI exists. */
const dedupeTotalRecordsInsights = (totalInsights, kpis) => {
  const raw = Array.isArray(totalInsights) ? totalInsights : [];
  const hasTotalRecordsKpi = (kpis || []).some((k) => isTotalRecordsKpiTitle(k?.title));
  if (hasTotalRecordsKpi) {
    return raw.filter((item) => !isTotalRecordsInsightCardTitle(item?.title));
  }
  let kept = false;
  return raw.filter((item) => {
    if (!isTotalRecordsInsightCardTitle(item?.title)) return true;
    if (!kept) {
      kept = true;
      return true;
    }
    return false;
  });
};

const atAGlanceItemText = (item) =>
  typeof item === "string" ? item : String(item?.text ?? "").trim();

const atAGlanceTracingCategory = (item) =>
  typeof item === "object" && item && item.tracingDrillCategory ? item.tracingDrillCategory : undefined;

const atAGlanceAllowFullGrid = (item) =>
  typeof item === "object" && item && item.allowFullGrid === true;

/** Stack above AI insights shell (z-index 1400) and feedback menus (1600). */
const INSIGHT_DRILL_MODAL_Z = 1800;

/**
 * Drill-down dialog: underlying rows (report grid and/or chart series) + CSV download.
 */
function InsightDrillDownModal({
  open,
  onClose,
  title,
  subtitle,
  views,
  truncatedNote,
  loading = false,
}) {
  const [active, setActive] = useState(0);
  React.useEffect(() => {
    if (open) setActive(0);
  }, [open, title, views]);

  if (!open) return null;
  if (loading) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        disableEnforceFocus
        maxWidth="sm"
        fullWidth
        scroll="paper"
        sx={{ zIndex: INSIGHT_DRILL_MODAL_Z }}
        slotProps={{
          paper: { className: "rounded-2xl overflow-hidden border border-violet-100 shadow-xl" },
        }}
      >
        <DialogTitle className="!text-base !font-semibold !pb-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          Loading data…
        </DialogTitle>
        <DialogContent className="flex flex-col items-center justify-center gap-4 py-12 bg-slate-50/50">
          <CircularProgress size={40} sx={{ color: "#7c3aed" }} />
          <div className="text-sm text-slate-600 text-center px-4 leading-relaxed max-w-xs">
            Fetching rows for this drill-down. Large jobs may take long time.
          </div>
        </DialogContent>
        <DialogActions className="px-4 py-3 bg-white border-t border-slate-100">
          <Button onClick={onClose} color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  if (!views?.length) return null;

  const current = views[Math.min(active, views.length - 1)];
  const rows = current?.rows || [];
  const cols = rows.length ? Object.keys(rows[0]) : [];

  const handleDownload = () => {
    if (!rows.length) {
      toast.error("Nothing to download.");
      return;
    }
    const safeName = String(current?.label || "data")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    exportToCSV(`/ai-insight-drilldown/${safeName}`, rows);
    toast.success("Download started.");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableEnforceFocus
      maxWidth="xl"
      fullWidth
      scroll="paper"
      sx={{ zIndex: INSIGHT_DRILL_MODAL_Z }}
      slotProps={{
        paper: { className: "rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xl" },
      }}
    >
      <DialogTitle className="flex flex-col gap-1 !pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/30">
        <span className="text-base font-semibold text-slate-900 tracking-tight">{title || "Underlying data"}</span>
        {subtitle && <span className="text-sm font-normal text-slate-600 leading-snug">{subtitle}</span>}
        {truncatedNote && (
          <span className="text-xs font-normal text-amber-900 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5 w-fit mt-1 shadow-sm">
            {truncatedNote}
          </span>
        )}
      </DialogTitle>
      <DialogContent dividers className="flex flex-col gap-3">
        {views.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {views.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  i === active
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        {!rows.length && (
          <p className="text-sm text-gray-500">No rows to display for this view.</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-auto max-h-[55vh] rounded-lg border border-gray-200">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="px-2 py-2 font-semibold text-gray-800 border-b border-gray-200 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                    {cols.map((c) => (
                      <td key={c} className="px-2 py-1.5 border-b border-gray-100 align-top max-w-[320px] break-words">
                        {row[c] === null || row[c] === undefined ? "" : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
      <DialogActions className="px-4 py-2 gap-2">
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button variant="contained" onClick={handleDownload} disabled={!rows.length}>
          Download CSV (this view)
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
    label: normalizeChartCategoryLabel(label, index),
    value: coerceChartNumericValue(values[index] ?? 0),
  }));
};

const chartSeriesToDrillRows = (chart) =>
  buildChartRows(chart).map((row) => ({
    Category: row.label,
    Value: row.value,
  }));

const extractChartLabelTokens = (chart) => {
  const out = [];
  if (Array.isArray(chart?.xAxis)) {
    chart.xAxis.forEach((x) => out.push(String(x).toLowerCase()));
  }
  const { labels } = getChartSeries(chart);
  if (Array.isArray(labels)) {
    labels.forEach((l) => out.push(String(l).toLowerCase()));
  }
  return [...new Set(out)].filter((s) => s.length >= 2);
};

const filterRowsMatchingChartTracing = (rows, chart) => {
  if (!chart || !Array.isArray(rows) || rows.length === 0) return [];
  const acc = findTracingStatusAccessor(rows[0]);
  if (!acc) return [];
  const labs = extractChartLabelTokens(chart);
  if (!labs.length) return [];
  const matched = rows.filter((r) => {
    const cell = normalizeTracingCell(r[acc]).toLowerCase();
    if (!cell || cell === "null") return false;
    return labs.some((lab) => cell.includes(lab) || (lab.length > 3 && lab.includes(cell)));
  });
  if (!matched.length || matched.length > rows.length * 0.95) return [];
  return matched;
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
  const nums = values.map((v) => coerceChartNumericValue(v));
  const maxValue = Math.max(...nums);
  const maxIndex = nums.indexOf(maxValue);
  const topLabel = normalizeChartCategoryLabel(labels[maxIndex], maxIndex);
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
    const legendStyle = {
      paddingTop: compact ? 4 : 12,
      fontSize: compact ? 10 : 12,
      maxWidth: "100%",
      maxHeight: compact ? 72 : 96,
      overflowY: "auto",
      lineHeight: 1.25,
    };
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Tooltip
            contentStyle={{ maxWidth: 280, wordBreak: "break-word" }}
            labelFormatter={(label) => formatAxisLabel(String(label ?? ""), 44)}
          />
          <Legend
            wrapperStyle={legendStyle}
            formatter={(value) => formatAxisLabel(String(value ?? ""), 34)}
          />
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

const ChartCard = ({ chart, chartIndex, onInsightFeedback, onDrillDown }) => {
  const { values } = getChartSeries(chart);
  if (!values.length) return null;
  const chartType = getEffectiveChartType(chart);
  // Use stable chart.id when available so backend can apply feedback correctly.
  const insightId = String(chart?.id ?? `chart-${chartIndex ?? 0}`);
  const drillable = typeof onDrillDown === "function";

  const drillPayload = () =>
    onDrillDown({
      title: chart.title || chart.id || "Chart",
      chart,
      tracingDrillCategory:
        inferTracingDrillCategoryFromText(`${chart.title || ""} ${chart.id || ""}`) || undefined,
    });

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
      <div
        role={drillable ? "button" : undefined}
        tabIndex={drillable ? 0 : undefined}
        onClick={drillable ? () => drillPayload() : undefined}
        onKeyDown={
          drillable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  drillPayload();
                }
              }
            : undefined
        }
        className={`space-y-3 rounded-xl outline-none ${
          drillable ? "cursor-pointer hover:ring-2 hover:ring-violet-300/70 transition-shadow focus-visible:ring-2 focus-visible:ring-violet-400" : ""
        }`}
      >
      <div className="rounded-xl bg-gray-50 px-3 py-4">
          <ChartRenderer chart={chart} height={260} />
      </div>
      <div className="text-xs text-gray-600 break-words leading-5">{getChartHighlight(chart)}</div>
        {drillable && (
          <div className="text-[11px] font-medium text-violet-700">Click to view chart values and report data</div>
        )}
      </div>
    </div>
  );
};

const sectionKeyByTone = { risk: "risk", positive: "positive", neutral: "recommendation" };

const NarrativeBlock = ({
  title,
  items,
  tone = "neutral",
  onInsightFeedback,
  hiddenInsightIds,
  onDrillDown,
  reportRowsAvailable,
}) => {
  const normalized = normalizeTextItems(items);
  if (!normalized.length) return null;
  const styles = toneStyles[tone] || toneStyles.neutral;
  const sectionKey = sectionKeyByTone[tone] || "narrative";
  const hidden = new Set(hiddenInsightIds || []);
  const drillable = typeof onDrillDown === "function" && reportRowsAvailable;
  return (
    <div className={`border rounded-xl p-4 ${styles.wrapper} min-w-0`}>
      <h3 className={`font-semibold mb-2 text-sm ${styles.text}`}>{title}</h3>
      <ul className={`list-disc pl-5 text-sm space-y-1.5 leading-6 ${styles.text}`}>
        {normalized.map((item, index) => {
          const insightId = `${sectionKey}-${index}`;
          if (hidden.has(insightId)) return null;
          return (
            <li
              key={`${title}-${index}`}
              className="break-words flex items-start justify-between gap-2 rounded-md -mx-1 px-1 py-0.5"
            >
              <span
                className={`min-w-0 flex-1 ${drillable ? "cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-black/5" : ""}`}
                role={drillable ? "button" : undefined}
                tabIndex={drillable ? 0 : undefined}
                onClick={
                  drillable
                    ? () =>
                        onDrillDown({
                          title: `${title} — item ${index + 1}`,
                          extraHint: item.slice(0, 500),
                          tracingDrillCategory: inferTracingDrillCategoryFromText(item),
                        })
                    : undefined
                }
                onKeyDown={
                  drillable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDrillDown({
                            title: `${title} — item ${index + 1}`,
                            extraHint: item.slice(0, 500),
                            tracingDrillCategory: inferTracingDrillCategoryFromText(item),
                          });
                        }
                      }
                    : undefined
                }
              >
            {item}
              </span>
              <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                <InsightFeedbackMenu
                  insightId={insightId}
                  insightType={sectionKey}
                  onInsightFeedback={onInsightFeedback}
                />
              </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
};

const MaturityCard = ({ maturityScore, onInsightFeedback, onDrillDown, reportRowsAvailable }) => {
  if (!maturityScore) return null;
  const score = Number(maturityScore.score ?? 0);
  const drillable = typeof onDrillDown === "function" && reportRowsAvailable;
  return (
    <div className="border rounded-xl p-4 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
      <div className="text-sm font-semibold mb-3 text-gray-900">System Health</div>
        <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <InsightFeedbackMenu insightId="maturity" insightType="maturity" onInsightFeedback={onInsightFeedback} />
        </div>
      </div>
      <div
        role={drillable ? "button" : undefined}
        tabIndex={drillable ? 0 : undefined}
        onClick={
          drillable ? () => onDrillDown({ title: "Maturity / system health", extraHint: maturityScore.comment }) : undefined
        }
        onKeyDown={
          drillable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDrillDown({ title: "Maturity / system health", extraHint: maturityScore.comment });
                }
              }
            : undefined
        }
        className={`flex items-center gap-3 rounded-lg outline-none ${
          drillable ? "cursor-pointer hover:ring-2 hover:ring-violet-300/60 focus-visible:ring-2 focus-visible:ring-violet-400" : ""
        }`}
      >
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

const AtAGlanceCard = ({ items, onInsightFeedback, hiddenInsightIds, onDrillDown, reportRowsAvailable }) => {
  if (!items?.length) return null;
  const hidden = new Set(hiddenInsightIds || []);
  const drillable = typeof onDrillDown === "function" && reportRowsAvailable;
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm min-w-0 overflow-hidden">
      <ul className="space-y-2">
        {items.map((item, index) => {
          const insightId = `atAGlance-${index}`;
          if (hidden.has(insightId)) return null;
          const lineText = atAGlanceItemText(item);
          const traceCat = atAGlanceTracingCategory(item);
          return (
          <li
            key={`overview-${index}`}
              className="text-sm text-gray-700 leading-6 border-l-4 border-purple-200 pl-3 break-words flex items-start justify-between gap-2 rounded-r-md"
            >
              <span
                className={`min-w-0 flex-1 ${drillable ? "cursor-pointer rounded-r hover:bg-purple-50/50" : ""}`}
                role={drillable ? "button" : undefined}
                tabIndex={drillable ? 0 : undefined}
                onClick={
                  drillable
                    ? () =>
                        onDrillDown({
                          title: `Trend / overview — ${index + 1}`,
                          extraHint: lineText.slice(0, 500),
                          tracingDrillCategory: traceCat,
                          allowFullGrid: atAGlanceAllowFullGrid(item),
                        })
                    : undefined
                }
                onKeyDown={
                  drillable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDrillDown({
                            title: `Trend / overview — ${index + 1}`,
                            extraHint: lineText.slice(0, 500),
                            tracingDrillCategory: traceCat,
                            allowFullGrid: atAGlanceAllowFullGrid(item),
                          });
                        }
                      }
                    : undefined
                }
              >
                {lineText}
              </span>
              <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                <InsightFeedbackMenu
                  insightId={insightId}
                  insightType="atAGlance"
                  onInsightFeedback={onInsightFeedback}
                />
              </div>
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

const TotalInsightCards = ({ items, onInsightFeedback, hiddenInsightIds, onDrillDown, reportRowsAvailable }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const hidden = new Set(hiddenInsightIds || []);
  const drillable = typeof onDrillDown === "function" && reportRowsAvailable;
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
              <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
            <SeverityBadge severity={item.severity} />
                <InsightFeedbackMenu
                  insightId={insightId}
                  insightType="totalInsight"
                  onInsightFeedback={onInsightFeedback}
                />
          </div>
            </div>
            <div
              role={drillable ? "button" : undefined}
              tabIndex={drillable ? 0 : undefined}
              onClick={
                drillable
                  ? () =>
                      onDrillDown({
                        title: item.title || `Insight ${index + 1}`,
                        extraHint: (item.text || item.insight || "").slice(0, 800),
                        fullDatasetDrill: true,
                      })
                  : undefined
              }
              onKeyDown={
                drillable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDrillDown({
                          title: item.title || `Insight ${index + 1}`,
                          extraHint: (item.text || item.insight || "").slice(0, 800),
                          fullDatasetDrill: true,
                        });
                      }
                    }
                  : undefined
              }
              className={`space-y-2 rounded-lg outline-none ${
                drillable
                  ? "cursor-pointer hover:ring-2 hover:ring-violet-300/60 transition-shadow focus-visible:ring-2 focus-visible:ring-violet-400"
                  : ""
              }`}
            >
          <div className="text-sm text-gray-700 leading-6 break-words">
            {item.text || item.insight}
          </div>
              {drillable && (
                <div className="text-[11px] font-medium text-violet-700 pt-1">Click for underlying data</div>
              )}
        </div>
          </div>
        );
      })}
    </div>
  );
};

const InsightList = ({
  items,
  type = "column",
  onInsightFeedback,
  hiddenInsightIds,
  onDrillDown,
  reportRowsAvailable,
}) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const prefix = type === "column" ? "columnInsight" : "rowInsight";
  const hidden = new Set(hiddenInsightIds || []);
  const drillable = typeof onDrillDown === "function" && reportRowsAvailable;
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="max-h-[560px] overflow-auto divide-y divide-gray-100">
        {items.map((item, index) => {
          const insightId = `${prefix}-${index}`;
          if (hidden.has(insightId)) return null;
          const head =
            type === "column"
              ? item.column || `Column ${index + 1}`
              : item.issue || `Row insight ${index + 1}`;
          return (
            <div key={`${type}-${item.column || item.issue || "item"}-${index}`} className="p-4 space-y-2">
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
                <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
            <SeverityBadge severity={item.severity || (type === "row" ? "medium" : "low")} />
                  <InsightFeedbackMenu
                    insightId={insightId}
                    insightType={type === "column" ? "columnInsight" : "rowInsight"}
                    onInsightFeedback={onInsightFeedback}
                  />
          </div>
              </div>
              <div
                role={drillable ? "button" : undefined}
                tabIndex={drillable ? 0 : undefined}
                onClick={
                  drillable
                    ? () =>
                        onDrillDown({
                          title: head,
                          extraHint: [item.insight || item.text, item.recommendation, item.operational_risk]
                            .filter(Boolean)
                            .join(" · ")
                            .slice(0, 800),
                          columnInsightKey: type === "column" ? item.column || null : null,
                          rowIssueCode: type === "row" ? item.issue || null : null,
                        })
                    : undefined
                }
                onKeyDown={
                  drillable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDrillDown({
                            title: head,
                            extraHint: [item.insight || item.text, item.recommendation, item.operational_risk]
                              .filter(Boolean)
                              .join(" · ")
                              .slice(0, 800),
                            columnInsightKey: type === "column" ? item.column || null : null,
                            rowIssueCode: type === "row" ? item.issue || null : null,
                          });
                        }
                      }
                    : undefined
                }
                className={`space-y-2 rounded-lg outline-none ${
                  drillable ? "cursor-pointer hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-violet-300/50" : ""
                }`}
              >
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
                {drillable && (
                  <div className="text-[11px] font-medium text-violet-700">
                    Click for report data behind this insight
        </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const filterChartsByScope = (charts = [], scope) =>
  charts.filter((chart) => (chart?.scope || "overview") === scope);

const ChartGrid = ({ charts, onInsightFeedback, onDrillDown }) => {
  if (!Array.isArray(charts) || charts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {charts.map((chart, idx) => (
        <ChartCard
          key={chart.id || idx}
          chart={chart}
          chartIndex={idx}
          onInsightFeedback={onInsightFeedback}
          onDrillDown={onDrillDown}
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
  const tiDeduped = dedupeTotalRecordsInsights(aiResult?.totalInsights, aiResult?.kpis);
  const pickObjs = (arr, limit) =>
    (Array.isArray(arr) ? arr : [])
      .filter((x) => IMPORT_TRACING_INSIGHT_RE.test(insightBlob(x)))
      .slice(0, limit);
  const pickStr = (arr, limit) =>
    (Array.isArray(arr) ? arr : [])
      .filter((t) => IMPORT_TRACING_INSIGHT_RE.test(String(t || "")))
      .slice(0, limit);
  return {
    totalInsights: pickObjs(tiDeduped, 10),
    columnInsights: pickObjs(aiResult?.columnInsights, 10),
    rowInsights: pickObjs(aiResult?.rowInsights, 14),
    risks: pickStr(aiResult?.risks, 10),
    positives: pickStr(aiResult?.positives, 8),
    recommendations: pickStr(aiResult?.recommendations, 10),
  };
};

/** API summary rows: statuses, time range, sample keys (from AI service importTracing). */
const ImportTracingSummaryPanel = ({ tracing, onInsightFeedback, hiddenInsightIds, onDrillDown }) => {
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
              const drillable = typeof onDrillDown === "function";
              return (
                <li
                  key={exId}
                  className="border-l-2 border-purple-200 pl-2 break-all flex items-start justify-between gap-2 rounded"
                >
                  <span
                    className={`min-w-0 flex-1 ${drillable ? "cursor-pointer rounded hover:bg-purple-50/60" : ""}`}
                    role={drillable ? "button" : undefined}
                    tabIndex={drillable ? 0 : undefined}
                    onClick={
                      drillable
                        ? () =>
                            onDrillDown({
                              title: `Import tracing sample #${ex.numberID ?? i}`,
                              exampleRow: ex,
                            })
                        : undefined
                    }
                    onKeyDown={
                      drillable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onDrillDown({
                                title: `Import tracing sample #${ex.numberID ?? i}`,
                                exampleRow: ex,
                              });
                            }
                          }
                        : undefined
                    }
                  >
                    #{ex.numberID ?? i} · {String(ex.TracingStatus ?? "null")} · AC {ex.ACtableName || "—"} / DC{" "}
                    {ex.DCtableName || "—"}
                  </span>
                  <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    <InsightFeedbackMenu
                      insightId={exId}
                      insightType="importTracingExample"
                      onInsightFeedback={onInsightFeedback}
                    />
                  </div>
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

const AiInsightContent = ({
  aiResult,
  onInsightFeedback,
  hiddenInsightIds,
  pathname = "",
  drillDown = null,
  /** When true, insight filter chips stay visible while scrolling the insights body (e.g. AI dialog). */
  stickyInsightFilters = true,
}) => {
  if (!aiResult) return null;

  /** Empty = show all sections. Non-empty = show only listed sections (focus / isolate). */
  const [focusedSections, setFocusedSections] = useState([]);
  const [drillModal, setDrillModal] = useState(null);
  /** Auto-dismissing modal when drill-down cannot map the card to report rows (replaces toast for this path). */
  const [drillMapNotice, setDrillMapNotice] = useState(null);
  useEffect(() => {
    if (!drillMapNotice) return undefined;
    const t = window.setTimeout(() => setDrillMapNotice(null), 6500);
    return () => window.clearTimeout(t);
  }, [drillMapNotice]);
  /** Avoid re-fetching `loadAllRows()` on every drill click until the page table reloads. */
  const fullDrillRowsCacheRef = useRef(null);
  useEffect(() => {
    fullDrillRowsCacheRef.current = null;
  }, [drillDown?.rows]);

  const gridRows = useMemo(
    () => sanitizeRowsForDrill((drillDown?.rows || []).slice(0, DRILL_GRID_CAP)),
    [drillDown?.rows]
  );
  const reportRowsAvailable = gridRows.length > 0 || Boolean(drillDown?.loadAllRows);

  const openInsightDrillDown = useCallback(
    async ({
      title,
      extraHint,
      chart,
      exampleRow,
      tracingDrillCategory,
      columnInsightKey,
      /** Backend anomaly `issue` (e.g. missing_purchase) — row insight cards. */
      rowIssueCode,
      allowFullGrid = false,
      kpiValue,
      /** True when drill was opened from a KPI tile — enables distinct/unique metric drill from title. */
      isKpiDrill = false,
      /** Total-record / overview cards: show all rows for this job or register, not a traced subset. */
      fullDatasetDrill = false,
    }) => {
      const subtitle = [drillDown?.caption, extraHint].filter(Boolean).join(" · ") || undefined;
      if (drillDown?.loadAllRows) {
        setDrillModal({
          open: true,
          loading: true,
          title: title || "Underlying data",
          subtitle,
          views: [],
          truncatedNote: undefined,
        });
      }

      let baseRows = gridRows;
      if (drillDown?.loadAllRows) {
        const cached = fullDrillRowsCacheRef.current;
        if (Array.isArray(cached) && cached.length) {
          baseRows = cached;
        } else {
          try {
            const full = await drillDown.loadAllRows();
            const sanitized = sanitizeRowsForDrill((full || []).slice(0, DRILL_GRID_CAP));
            if (sanitized.length) {
              baseRows = sanitized;
              fullDrillRowsCacheRef.current = sanitized;
            }
          } catch (e) {
            console.error(e);
            toast.error("Could not load the full dataset for drill-down. Try the main grid export.");
          }
        }
      }

      const views = [];
      if (chart) {
        const s = chartSeriesToDrillRows(chart);
        if (s.length) views.push({ id: "chart-series", label: "Chart values", rows: s });
      }
      if (exampleRow && typeof exampleRow === "object" && Object.keys(exampleRow).length) {
        views.push({
          id: "trace-sample",
          label: "Tracing sample row",
          rows: sanitizeRowsForDrill([exampleRow]),
        });
      }

      const insightBlob = `${title || ""} ${extraHint || ""}`;
      let reportSlice = [];
      let reportLabel = "";

      if (baseRows.length) {
        if (fullDatasetDrill) {
          reportSlice = baseRows;
          reportLabel = drillDown?.loadAllRows
            ? "All records (this job or register)"
            : "All records (current table load)";
        }
      }

      if (baseRows.length && !reportSlice.length) {
        if (isKpiDrill) {
          const metric = inferKpiMetricDrill(baseRows[0], title);
          if (metric.mode === "contributing_rows" && metric.column) {
            const acc = metric.column;
            reportSlice = baseRows.filter((r) => {
              const v = r[acc];
              return v !== null && v !== undefined && String(v).trim() !== "";
            });
            reportLabel = `Rows with a value in “${acc}” (${reportSlice.length.toLocaleString()}) — base for distinct count`;
          } else if (metric.mode === "distinct_value_rows" && metric.column) {
            const acc = metric.column;
            const seen = new Set();
            const rowsOut = [];
            for (const r of baseRows) {
              const v = r[acc];
              if (v === null || v === undefined || String(v).trim() === "") continue;
              const key = String(v).trim().toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              rowsOut.push({ [acc]: v });
            }
            rowsOut.sort((a, b) =>
              String(a[acc]).localeCompare(String(b[acc]), undefined, { sensitivity: "base" }),
            );
            reportSlice = rowsOut;
            reportLabel = `Distinct values — “${acc}” (${rowsOut.length.toLocaleString()})`;
          }
        }

        const normIssue = normalizeAnomalyIssueCode(rowIssueCode);
        if (normIssue) {
          const anomalyRows = filterRowsForAnomalyIssue(baseRows, normIssue);
          if (anomalyRows.length) {
            reportSlice = anomalyRows;
            reportLabel = `Rows — ${normIssue.replace(/_/g, " ")} (${anomalyRows.length.toLocaleString()})`;
          }
        }

        if (!reportSlice.length && chart) {
          const chartTraceRows = filterRowsMatchingChartTracing(baseRows, chart);
          if (chartTraceRows.length) {
            reportSlice = chartTraceRows;
            const acc = findTracingStatusAccessor(baseRows[0]);
            reportLabel = `${acc || "Status"} — rows matching chart (${chartTraceRows.length.toLocaleString()})`;
          }
        }

        if (!reportSlice.length) {
          let effColumn = columnInsightKey;
          if (!effColumn) {
            const colHits = findReferencedColumnKeys(insightBlob, Object.keys(baseRows[0]));
            if (colHits.length) effColumn = colHits[0];
          }
          if (effColumn) {
            const acc = resolveColumnAccessor(baseRows[0], effColumn);
            const { rows: colRows, mode } = filterRowsForColumnInsight(baseRows, effColumn);
            if (mode === "emptyInColumn" && colRows.length) {
              reportSlice = colRows;
              reportLabel = `Rows with empty “${effColumn}” (${colRows.length.toLocaleString()})`;
            } else if (acc) {
              const quoted = extractLikelyValuesFromInsightText(insightBlob);
              if (quoted.length) {
                const valueRows = baseRows.filter((r) => {
                  const cell = String(r[acc] ?? "").trim();
                  const cl = cell.toLowerCase();
                  return quoted.some((q) => {
                    const ql = String(q).toLowerCase();
                    return cl === ql || (ql.length >= 2 && cl.includes(ql));
                  });
                });
                if (valueRows.length && valueRows.length < baseRows.length * 0.92) {
                  reportSlice = valueRows;
                  reportLabel = `Rows with cited values in “${effColumn}” (${valueRows.length.toLocaleString()})`;
                }
              }
              if (!reportSlice.length) {
                const narrowed = filterRowsByInsightTextOverlap(
                  baseRows,
                  title,
                  `${extraHint || ""} ${effColumn}`,
                  [],
                );
                if (narrowed.length) {
                  reportSlice = narrowed;
                  reportLabel = `Rows matching insight (column “${effColumn}”) (${narrowed.length.toLocaleString()})`;
                }
              }
              if (!reportSlice.length && mode === "noEmpty") {
                const populated = baseRows.filter((r) => {
                  const v = r[acc];
                  return v !== "" && v != null && v !== undefined;
                });
                if (populated.length) {
                  reportSlice = populated;
                  reportLabel = `Rows with a value in “${effColumn}” (${populated.length.toLocaleString()})`;
                }
              }
            }
          }
        }

        if (!reportSlice.length) {
          const effTracing = tracingDrillCategory || inferTracingDrillCategoryFromText(insightBlob);
          if (effTracing) {
            const statusAcc = findTracingStatusAccessor(baseRows[0]);
            if (!statusAcc) {
              toast.error(
                "No import/tracing status column found in the dataset (expected e.g. import_status_update or TracingStatus). Check column names or refresh.",
              );
            } else {
              const traced = filterRowsByTracingCategory(baseRows, effTracing);
              if (traced.length > 0) {
                reportSlice = traced;
                const human =
                  effTracing === "partiallyMatched"
                    ? "Partially matched"
                    : effTracing === "pending"
                      ? "Pending / untraced"
                      : effTracing.charAt(0).toUpperCase() + effTracing.slice(1);
                reportLabel = `${statusAcc} — ${human} (${traced.length.toLocaleString()} rows)`;
              } else {
                toast.error("No rows match this status filter in the loaded dataset.");
              }
            }
          }
        }

        if (
          !reportSlice.length &&
          kpiValue !== undefined &&
          kpiValue !== null &&
          String(kpiValue).trim() !== ""
        ) {
          const byVal = filterRowsContainingKpiValue(baseRows, kpiValue);
          if (byVal.length) {
            reportSlice = byVal;
            reportLabel = `Rows containing KPI display value (${byVal.length.toLocaleString()})`;
          }
        }

        if (!reportSlice.length) {
          const chartTok = chart ? extractChartLabelTokens(chart) : [];
          const narrowed = filterRowsByInsightTextOverlap(baseRows, title, extraHint, chartTok);
          if (narrowed.length) {
            reportSlice = narrowed;
            reportLabel = `Rows matching insight text (${narrowed.length.toLocaleString()})`;
          }
        }

        if (!reportSlice.length && allowFullGrid) {
          reportSlice = baseRows;
          reportLabel = drillDown?.loadAllRows
            ? "Full dataset (overview line — not narrowed)"
            : "Report data (this page)";
        }
      }

      if (baseRows.length && reportSlice.length > 0) {
        views.push({ id: "report-grid", label: reportLabel, rows: reportSlice });
      }

      if (!views.length) {
        if (baseRows.length) {
          setDrillMapNotice(
            "Could not map this card to specific rows. Try an insight that names a column, import status, or metric; or use Export on the main grid.",
          );
        } else {
          toast.error(
            "No underlying table data is loaded for drill-down. Open AI insights from a report job or register page after the grid has loaded.",
          );
        }
        setDrillModal(null);
        return;
      }
      const truncatedNote =
        drillDown?.truncated || (drillDown?.totalRowCount && drillDown.totalRowCount > baseRows.length)
          ? `Showing up to ${baseRows.length.toLocaleString()} of ${Number(drillDown.totalRowCount).toLocaleString()} rows (${drillDown?.loadAllRows ? "full fetch capped for performance" : "current table load"}). Use the main grid export for the complete file if needed.`
          : undefined;
      setDrillModal({
        open: true,
        loading: false,
        title: title || "Underlying data",
        subtitle,
        views,
        truncatedNote,
      });
    },
    [drillDown?.caption, drillDown?.truncated, drillDown?.totalRowCount, drillDown?.loadAllRows, gridRows]
  );

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

  const dedupedTotalInsights = useMemo(
    () => dedupeTotalRecordsInsights(aiResult.totalInsights, aiResult.kpis),
    [aiResult.totalInsights, aiResult.kpis],
  );

  const atAGlanceItems = useMemo(() => {
    const out = [];

    dedupedTotalInsights.forEach((item) => {
      const t = item.text || item.insight || "";
      if (!String(t).trim()) return;
      out.push({
        text: t,
        tracingDrillCategory: inferTracingDrillCategoryFromText(`${item.title || ""} ${t}`),
      });
    });

    normalizeTextItems(aiResult.trends)
      .slice(0, 2)
      .forEach((t) => {
        if (!String(t).trim()) return;
        out.push({
          text: t,
          tracingDrillCategory: inferTracingDrillCategoryFromText(t),
        });
      });

    if (aiResult.importTracing?.statusCounts) {
      const statusCounts = aiResult.importTracing.statusCounts || {};
      const b = aggregateImportTracingStatusCounts(statusCounts);
      const matched = b.matched;
      const partiallyMatched = b.partiallyMatched;
      const deleted = b.deleted;
      const pending = b.pending;
      const totalRows = Math.max(safeInt(aiResult.importTracing.totalRows), b.totalFromBuckets);
      const sumFour = matched + partiallyMatched + deleted + pending;
      const other =
        b.other + Math.max(0, totalRows - sumFour - b.other);

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
        if (topCat.label === "Matched")
          return "Conclusion: most traced records are fully matched; mapping appears stable for the selected job/table.";
        if (topCat.label === "Partially Matched")
          return "Conclusion: most traced records are partially matched; focus on field-level mapping discrepancies and missing keys.";
        if (topCat.label === "Deleted")
          return "Conclusion: a significant portion of traced records are marked deleted; verify deletion rules and filter logic.";
        if (topCat.label === "Pending / Untraced")
          return "Conclusion: many records are pending/untraced; import tracing may be incomplete—re-run or wait for updates.";
        return "Conclusion: tracing shows mixed statuses; review the top mismatch reasons and validate input key construction.";
      })();

      out.push({
        text: `Import tracing — Updated rows: ${totalRows}${range ? ` | ${range}` : ""}`,
        tracingDrillCategory: undefined,
        allowFullGrid: true,
      });
      out.push({ text: `Matched: ${matched}`, tracingDrillCategory: "matched" });
      out.push({ text: `Partially matched: ${partiallyMatched}`, tracingDrillCategory: "partiallyMatched" });
      out.push({ text: `Deleted: ${deleted}`, tracingDrillCategory: "deleted" });
      out.push({
        text: `Pending / untraced: ${pending}${other ? ` | Other: ${other}` : ""}`,
        tracingDrillCategory: "pending",
      });
      out.push({ text: conclusion, tracingDrillCategory: undefined });
    }

    if (aiResult.registerTracing) {
      const multi = aiResult.registerTracing?.multiTableConnection || {};
      const multiCount = safeInt(multi.multiTableRegisterIds);
      const totalCount = safeInt(multi.totalRegisterIds);
      const singleCount = safeInt(multi.singleTableRegisterIds);
      const unconnectedCount = safeInt(multi.unconnectedRegisterIds);
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

      const registerLines = [
        {
          text: `Register tracing quality — Multi-table connected rows: ${multiCount}/${totalCount} (${multiRate}%)`,
          allowFullGrid: true,
        },
        `Single-table connected rows: ${singleCount}`,
        `Unconnected rows: ${unconnectedCount}`,
        ...(exampleLine ? [exampleLine] : []),
        conclusion,
      ];
      registerLines.forEach((line) => {
        if (typeof line === "object" && line?.text && String(line.text).trim()) {
          out.push(line);
        } else if (String(line).trim()) {
          out.push(line);
        }
      });
    }

    return out.filter((x) => Boolean(atAGlanceItemText(x)));
  }, [aiResult, dedupedTotalInsights]);
  const hidden = new Set(hiddenInsightIds || []);

  const filtersShellClass = stickyInsightFilters
    ? "sticky top-0 z-[6] rounded-xl border border-violet-200/40 bg-gradient-to-br from-white via-violet-50/95 to-slate-50/95 px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-sm shadow-violet-900/5 ring-1 ring-slate-200/50 min-w-0 w-full overflow-hidden backdrop-blur-sm"
    : "rounded-xl border border-violet-200/40 bg-gradient-to-br from-white via-violet-50/20 to-slate-50/40 px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-sm shadow-violet-900/5 ring-1 ring-slate-200/50 min-w-0 w-full overflow-hidden";

  return (
    <div className="space-y-6 text-gray-900">
      <div className={filtersShellClass}>
        <div className="mb-1.5 flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/20 sm:flex"
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                <path d="M5 19h14" opacity="0.5" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-slate-900 tracking-tight">Insight filters</span>
          </div>
          {focusedSections.length > 0 && (
            <button
              type="button"
              onClick={clearSectionFocus}
              className="shrink-0 rounded-full border border-violet-300/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-900 shadow-sm transition-colors hover:bg-violet-50 whitespace-nowrap"
            >
              Show all sections
            </button>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-row flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.35)_transparent]">
          <button
            type="button"
            onClick={() => toggleSection("kpis")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("kpis")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            1. KPIs & Data
          </button>
          <button
            type="button"
            onClick={() => toggleSection("columnInsights")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("columnInsights")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            2. Column Insights
          </button>
          <button
            type="button"
            onClick={() => toggleSection("rowInsights")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("rowInsights")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            3. Row Insights
          </button>
          {hasImportDataTracingPanel && (
            <button
              type="button"
              onClick={() => toggleSection("importDataTracing")}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                isFilterChipActive("importDataTracing")
                  ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                  : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
              }`}
            >
              4. Import Data Tracing
            </button>
          )}
          {hasRegisterTracingComparePanel && !isReportJobDetailRoute && (
            <button
              type="button"
              onClick={() => toggleSection("registerCompare")}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                isFilterChipActive("registerCompare")
                  ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                  : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
              }`}
            >
              4. Register tracing (compare)
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleSection("trends")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("trends")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            5. Trends / Changes
          </button>
          <button
            type="button"
            onClick={() => toggleSection("maturity")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("maturity")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            6. Maturity
          </button>
          <button
            type="button"
            onClick={() => toggleSection("risks")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("risks")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            7. Risks / Alerts
          </button>
          <button
            type="button"
            onClick={() => toggleSection("positives")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("positives")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
            }`}
          >
            8. Positives
          </button>
          <button
            type="button"
            onClick={() => toggleSection("recommendations")}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              isFilterChipActive("recommendations")
                ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/15"
                : "bg-white/90 text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50/50"
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
                  const kpiDrillable = reportRowsAvailable;
                  const runKpiDrill = () => {
                    if (!reportRowsAvailable) {
                      toast.error(
                        "Open AI insights from a report job or register table (with the grid loaded) to drill into KPI rows.",
                      );
                      return;
                    }
                    const kpiBlob = `${kpi.title || ""} ${kpi.description || ""} ${kpi.value ?? ""}`;
                    const totalRecordsKpi = isTotalRecordsKpiTitle(kpi.title);
                    void openInsightDrillDown({
                      title: kpi.title || `KPI ${idx + 1}`,
                      extraHint: [kpi.description, kpi.value !== undefined ? `Value: ${kpi.value}` : ""]
                        .filter(Boolean)
                        .join(" · "),
                      ...(totalRecordsKpi
                        ? { fullDatasetDrill: true }
                        : {
                            isKpiDrill: true,
                            tracingDrillCategory: inferTracingDrillCategoryFromText(kpiBlob) || undefined,
                            kpiValue: kpi.value,
                          }),
                    });
                  };
                  return (
                    <li
                      key={insightId}
                      className="border rounded-xl p-3 text-sm bg-white shadow-sm min-h-[110px] hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-gray-800">{kpi.title}</div>
                        <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                          <InsightFeedbackMenu
                            insightId={insightId}
                            insightType="kpi"
                            onInsightFeedback={onInsightFeedback}
                          />
                    </div>
                      </div>
                      <div
                        role={kpiDrillable ? "button" : undefined}
                        tabIndex={kpiDrillable ? 0 : undefined}
                        onClick={() => runKpiDrill()}
                        onKeyDown={
                          kpiDrillable
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  runKpiDrill();
                                }
                              }
                            : undefined
                        }
                        className={`mt-1 space-y-1 outline-none ${
                          kpiDrillable
                            ? "cursor-pointer rounded-lg hover:ring-2 hover:ring-violet-300/60 focus-visible:ring-2 focus-visible:ring-violet-400"
                            : ""
                        }`}
                      >
                        {kpi.value !== undefined && (
                          <div className="text-xl font-semibold text-gray-900 break-all">{kpi.value}</div>
                  )}
                  {kpi.description && (
                          <div className="text-xs text-gray-600 leading-5 break-words">{kpi.description}</div>
                        )}
                        {kpiDrillable && (
                          <div className="text-[11px] font-medium text-violet-700 pt-1">
                            Click for underlying report data
                    </div>
                  )}
                      </div>
                </li>
                  );
                })}
            </ul>
          )}
            {/* KPI/Data overview excludes System Health and At A Glance (moved to dedicated panels). */}
            <TotalInsightCards
              items={dedupedTotalInsights}
              onInsightFeedback={onInsightFeedback}
              hiddenInsightIds={hiddenInsightIds}
              onDrillDown={openInsightDrillDown}
              reportRowsAvailable={reportRowsAvailable}
            />
            <ChartGrid
              charts={overviewCharts.length ? overviewCharts : aiResult.charts?.slice(0, 2)}
              onInsightFeedback={onInsightFeedback}
              onDrillDown={openInsightDrillDown}
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
            onDrillDown={openInsightDrillDown}
            reportRowsAvailable={reportRowsAvailable}
          />
          <ChartGrid charts={columnCharts} onInsightFeedback={onInsightFeedback} onDrillDown={openInsightDrillDown} />
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
            onDrillDown={openInsightDrillDown}
            reportRowsAvailable={reportRowsAvailable}
          />
          <ChartGrid charts={rowCharts} onInsightFeedback={onInsightFeedback} onDrillDown={openInsightDrillDown} />
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
            onDrillDown={openInsightDrillDown}
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
            onDrillDown={openInsightDrillDown}
            reportRowsAvailable={reportRowsAvailable}
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
            onDrillDown={openInsightDrillDown}
            reportRowsAvailable={reportRowsAvailable}
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
          onDrillDown={openInsightDrillDown}
          reportRowsAvailable={reportRowsAvailable}
        />
      )}

      {showPositives && (
        <NarrativeBlock
          title="Positives / Consistencies"
          items={aiResult.positives}
          tone="positive"
          onInsightFeedback={onInsightFeedback}
          hiddenInsightIds={hiddenInsightIds}
          onDrillDown={openInsightDrillDown}
          reportRowsAvailable={reportRowsAvailable}
        />
      )}

      {showRecommendations && (
        <NarrativeBlock
          title="Recommendations"
          items={aiResult.recommendations}
          tone="neutral"
          onInsightFeedback={onInsightFeedback}
          hiddenInsightIds={hiddenInsightIds}
          onDrillDown={openInsightDrillDown}
          reportRowsAvailable={reportRowsAvailable}
        />
      )}

      <InsightDrillDownModal
        open={Boolean(drillModal?.open)}
        onClose={() => setDrillModal(null)}
        title={drillModal?.title}
        subtitle={drillModal?.subtitle}
        views={drillModal?.views || []}
        truncatedNote={drillModal?.truncatedNote}
        loading={Boolean(drillModal?.loading)}
      />

      <Dialog
        open={Boolean(drillMapNotice)}
        onClose={() => setDrillMapNotice(null)}
        disableEnforceFocus
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: INSIGHT_DRILL_MODAL_Z }}
        slotProps={{
          paper: {
            className: "rounded-xl shadow-lg border border-amber-100",
            sx: { bgcolor: "rgb(255 251 235)" },
          },
        }}
      >
        <DialogTitle className="text-base font-semibold text-amber-950 pb-0">
          Could not map to rows
        </DialogTitle>
        <DialogContent className="pt-2 pb-4">
          <p className="text-sm text-amber-950/90 leading-relaxed m-0">{drillMapNotice}</p>
        </DialogContent>
        <DialogActions className="px-3 pb-3 pt-0">
          <Button size="small" onClick={() => setDrillMapNotice(null)} color="inherit">
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
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
    <div className="mt-3 space-y-2.5 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/20 p-3 shadow-sm ring-1 ring-violet-100/50">
      <div className="text-[10px] font-bold uppercase tracking-wider text-violet-800 px-0.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-sm shadow-violet-400/80" aria-hidden />
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
