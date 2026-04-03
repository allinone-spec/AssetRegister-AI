export const ACCENT_PRESETS = [
  { label: "Violet", hex: "#6f2fe1", rgb: "111,47,225" },
  { label: "Indigo", hex: "#4f46e5", rgb: "79,70,229" },
  { label: "Sky", hex: "#0ea5e9", rgb: "14,165,233" },
  { label: "Emerald", hex: "#10b981", rgb: "16,185,129" },
  { label: "Rose", hex: "#f43f5e", rgb: "244,63,94" },
  { label: "Amber", hex: "#f59e0b", rgb: "245,158,11" },
];

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Find closest preset index from a hex string coming from API
export function hexToPresetIdx(hex) {
  if (!hex) return 0;
  const idx = ACCENT_PRESETS.findIndex(
    (p) => p.hex.toLowerCase() === hex.toLowerCase(),
  );
  return idx; // -1 means custom
}
