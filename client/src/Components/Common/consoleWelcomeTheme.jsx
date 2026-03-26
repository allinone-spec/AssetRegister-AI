import React from "react";

/** Visual tokens aligned with AssetRegisterV2.1.html */
export const AR_FONT = "DM Sans, ui-sans-serif, system-ui, sans-serif";
export const AR_MONO = "DM Mono, ui-monospace, monospace";

export const arCard =
  "rounded-[14px] border border-[rgba(111,47,225,0.12)] bg-white shadow-[0_2px_16px_rgba(111,47,225,0.07)]";

export const arEyebrow =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[#6f2fe1]";

export const arPageTitle =
  "text-[26px] md:text-[28px] font-extrabold tracking-[-0.04em] text-[#1a1028]";

export const arPageSub = "text-[13px] leading-relaxed text-[#9ca3af]";

export const arTypeBadge =
  "inline-flex items-center gap-2 rounded-md border border-[rgba(111,47,225,0.18)] bg-[rgba(111,47,225,0.09)] px-2.5 py-1 text-xs font-bold text-[#6f2fe1]";

export const arSectionTitle =
  "text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6f2fe1]";

export const arInputSurface = "#f8f6ff";

/** Stat tile with decorative glow (V2.1 `.stat-card` / `.stat-glow`) */
export function ArStatTile({ label, value }) {
  return (
    <div
      className={`relative overflow-hidden p-5 ${arCard}`}
      style={{ fontFamily: AR_FONT }}
    >
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-[rgba(111,47,225,0.09)]"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#9ca3af]">{label}</div>
        <div className="text-[28px] font-extrabold leading-none tracking-[-0.04em] text-[#1a1028] tabular-nums">
          {value != null ? value : "—"}
        </div>
      </div>
    </div>
  );
}

/** Content card with V2.1 shell styling */
export function ArContentCard({ children, className = "" }) {
  return (
    <div className={`${arCard} ${className}`.trim()} style={{ fontFamily: AR_FONT }}>
      {children}
    </div>
  );
}
