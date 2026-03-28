// src/Components/Header/SettingsBar.jsx
import { ACCENT_PRESETS } from "../../context/utils";
import { useTheme } from "../../context/ThemeContext";

export function SettingsBar() {
  const {
    isDark,
    setIsDark,
    accent,
    accentIdx,
    setAccentIdx,
    setCustomAccent,
    updateThemeAPI,
    closeSettings,
    loading,
  } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border-theme bg-surface animate-slideHeaderIn">
      {/* ── Accent colour ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-text-faint">
          Accent
        </span>
        <div className="flex items-center gap-2">
          {ACCENT_PRESETS.map((preset, idx) => {
            const isActive = accentIdx === idx;
            return (
              <button
                key={preset.hex}
                onClick={() => setAccentIdx(idx)}
                aria-label={preset.label}
                className={`w-5 h-5 rounded-full transition-transform focus:outline-none
                            ${isActive ? "scale-125" : "scale-100 hover:scale-110"}`}
                style={{
                  background: preset.hex,
                  boxShadow: isActive
                    ? `0 0 0 2px var(--surface), 0 0 0 4px ${preset.hex}`
                    : "none",
                }}
              />
            );
          })}

          {/* Custom colour picker */}
          <div className="border px-[3px] rounded-lg">
            <input
              type="color"
              value={accent.hex}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="w-5 h-5 mt-[3px] cursor-pointer border-0 bg-transparent p-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Dark / Light toggle ────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-text-faint">
          Mode
        </span>
        <button
          onClick={() => setIsDark((p) => !p)}
          aria-label="Toggle dark mode"
          className="w-11 h-6 rounded-full relative transition-colors focus:outline-none"
          style={{
            background: isDark ? accent.hex : `rgba(var(--accent-rgb), 0.15)`,
          }}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200
                        ${isDark ? "left-6" : "left-1"}`}
          />
        </button>
        <span className="text-sm text-text-sub">
          {isDark ? "Dark" : "Light"}
        </span>
      </div>

      {/* ── Save button ────────────────────────────────────────────── */}
      <div className="ml-auto">
        <button
          onClick={async () => {
            await updateThemeAPI();
            closeSettings({ reset: false });
          }}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: accent.hex }}
        >
          {loading ? "Saving…" : "Save Theme"}
        </button>
      </div>
    </div>
  );
}
