export function Spark({ data, color, w = 64, h = 24 }) {
  const max = Math.max(...data, 1);
  const pts = data
    .map(
      (v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) + 2}`,
    )
    .join(" ");
  const area = [
    ...data.map(
      (v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) + 2}`,
    ),
    `${w},${h}`,
    `0,${h}`,
  ].join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient
          id={`sg${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg${color.replace("#", "")})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatusPill({ status }) {
  const m = STATUS_META[status || "Success"] || {
    fg: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: m.fg, background: m.bg, border: `1px solid ${m.border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: m.fg, boxShadow: `0 0 4px ${m.fg}88` }}
      />
      {status}
    </span>
  );
}

export const STATUS_META = {
  Success: { fg: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  success: { fg: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  Running: {
    fg: "var(--accent)",
    bg: "rgba(var(--accent-rgb),0.06)",
    border: "rgba(var(--accent-rgb),0.2)",
  },
  running: {
    fg: "var(--accent)",
    bg: "rgba(var(--accent-rgb),0.06)",
    border: "rgba(var(--accent-rgb),0.2)",
  },
  Failed: { fg: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
  failed: { fg: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
  Pending: { fg: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  pending: { fg: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  Cancelled: { fg: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  cancelled: { fg: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

export const TYPE_ICONS = {
  "Azure AD": "☁️",
  AWS: "⚡",
  ServiceNow: "🔧",
  "Flat File": "📄",
  Intune: "🛡️",
  MySQL: "🗄️",
  "MS Defender": "🔒",
  "Active Directory": "🏢",
  FlexeraOne: "📊",
  "Google Cloud": "🌐",
  SQL: "🗃️",
  "Custom API": "🔌",
};

/* ── Static data ────────────────────────────────────────────────────────── */
export const JOBS = [
  {
    id: "JOB-001",
    jobName: "Azure AD Sync",
    type: "Azure AD",
    status: "Success",
    lastRun: "2025-02-26 09:41",
    assets: 1240,
    duration: "2m 14s",
    trend: [60, 72, 68, 80, 75, 90, 88],
  },
  {
    id: "JOB-002",
    jobName: "AWS EC2 Import",
    type: "AWS",
    status: "Running",
    lastRun: "2025-02-27 08:00",
    assets: 856,
    duration: "In progress",
    trend: [40, 55, 50, 62, 58, 70, 65],
  },
  {
    id: "JOB-003",
    jobName: "ServiceNow CMDB",
    type: "ServiceNow",
    status: "Failed",
    lastRun: "2025-02-26 21:00",
    assets: 0,
    duration: "0m 43s",
    trend: [80, 70, 60, 40, 20, 10, 5],
  },
  {
    id: "JOB-004",
    jobName: "Flat File Assets Q1",
    type: "Flat File",
    status: "Success",
    lastRun: "2025-02-25 14:22",
    assets: 3400,
    duration: "5m 01s",
    trend: [30, 45, 55, 70, 75, 82, 90],
  },
  {
    id: "JOB-005",
    jobName: "Intune Device Sync",
    type: "Intune",
    status: "Success",
    lastRun: "2025-02-27 07:15",
    assets: 620,
    duration: "1m 30s",
    trend: [55, 60, 58, 65, 70, 68, 74],
  },
  {
    id: "JOB-006",
    jobName: "MySQL Legacy DB",
    type: "MySQL",
    status: "Pending",
    lastRun: "—",
    assets: 0,
    duration: "—",
    trend: [0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: "JOB-007",
    jobName: "MS Defender Alerts",
    type: "MS Defender",
    status: "Success",
    lastRun: "2025-02-27 06:00",
    assets: 198,
    duration: "0m 55s",
    trend: [45, 50, 60, 55, 65, 70, 72],
  },
];

export const INTEGRATIONS = [
  { name: "Azure AD", health: 98, color: "#7c3aed" },
  { name: "AWS", health: 95, color: "#f59e0b" },
  { name: "ServiceNow", health: 42, color: "#ef4444" },
  { name: "Intune", health: 100, color: "#10b981" },
  { name: "MS Defender", health: 87, color: "#6f2fe1" },
  { name: "MySQL", health: 0, color: "#94a3b8" },
  { name: "Azure AD", health: 98, color: "#7c3aed" },
  { name: "AWS", health: 95, color: "#f59e0b" },
  { name: "ServiceNow", health: 42, color: "#ef4444" },
  { name: "Intune", health: 100, color: "#10b981" },
  { name: "MS Defender", health: 87, color: "#6f2fe1" },
  { name: "MySQL", health: 0, color: "#94a3b8" },
];

export function Donut({ pct, color, size = 40 }) {
  const r = (size - 7) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={6}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-700 ease-out"
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}
