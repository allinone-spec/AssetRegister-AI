import React from "react";

/** Visual tokens aligned with ThemeContext / index.css */
export const AR_FONT = "DM Sans, ui-sans-serif, system-ui, sans-serif";
export const AR_MONO = "DM Mono, ui-monospace, monospace";

export const arCard =
  "rounded-[14px] border border-border-theme bg-surface shadow-theme";

export const arEyebrow =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-accent";

export const arPageTitle =
  "text-[26px] md:text-[28px] font-extrabold tracking-[-0.04em] text-text-primary";

export const arPageSub = "text-[13px] leading-relaxed text-text-faint";

export const arTypeBadge =
  "inline-flex items-center gap-2 rounded-md border border-accent-muted bg-accent-dim px-2.5 py-1 text-xs font-bold text-accent";

export const arSectionTitle =
  "text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent";

/** MUI OutlinedInput — matches console selects */
export const arInputSurface = "var(--input-bg)";

export const arSelectSx = {
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    borderRadius: "11px",
    backgroundColor: "var(--input-bg)",
    fontFamily: AR_FONT,
    "& fieldset": { borderColor: "var(--border)" },
    "&:hover fieldset": { borderColor: "rgba(var(--accent-rgb), 0.22)" },
    "&.Mui-focused fieldset": { borderColor: "var(--accent)", borderWidth: "1.5px" },
  },
};

export const arPrimaryGradientSx = {
  textTransform: "none",
  fontWeight: 700,
  borderRadius: "11px",
  fontFamily: AR_FONT,
  background:
    "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 82%, #000))",
  boxShadow: "0 4px 14px rgba(var(--accent-rgb), 0.35)",
  "&:hover": { boxShadow: "0 6px 18px rgba(var(--accent-rgb), 0.4)" },
};

export const arOutlinedAccentSx = {
  textTransform: "none",
  fontWeight: 700,
  borderRadius: "11px",
  fontFamily: AR_FONT,
  borderColor: "rgba(var(--accent-rgb), 0.22)",
  color: "var(--accent)",
  px: 2,
  "&:hover": { borderColor: "var(--accent)", bgcolor: "rgba(var(--accent-rgb), 0.06)" },
};

/** Stat tile with decorative glow */
export function ArStatTile({ label, value }) {
  return (
    <div
      className={`relative overflow-hidden p-5 ${arCard}`}
      style={{ fontFamily: AR_FONT }}
    >
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-accent-dim"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-faint">{label}</div>
        <div className="text-[28px] font-extrabold leading-none tracking-[-0.04em] text-text-primary tabular-nums">
          {value != null ? value : "—"}
        </div>
      </div>
    </div>
  );
}

/** Content card */
export function ArContentCard({ children, className = "" }) {
  return (
    <div className={`${arCard} ${className}`.trim()} style={{ fontFamily: AR_FONT }}>
      {children}
    </div>
  );
}
