// src/Components/Header/SettingsBar.jsx
import { useRef, useState } from "react";
import { ACCENT_PRESETS } from "../../context/utils";
import { useTheme } from "../../context/ThemeContext";
import { imageBaseUrl } from "../../Utility/baseUrl";
import toast from "react-hot-toast";

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
    logoPath,
  } = useTheme();

  const fileInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      await updateThemeAPI(file);
      toast.success("Logo updated successfully");
    } catch (error) {
      console.error("Failed to update logo:", error);
      toast.error("Failed to update logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleClearLogo = async () => {
    setLogoUploading(true);
    try {
      await updateThemeAPI(null, false, true);
      toast.success("Logo cleared successfully");
    } catch (error) {
      console.error("Failed to clear logo:", error);
      toast.error("Failed to clear logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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

      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-text-faint">
          Logo
        </span>
        <div className="flex items-center gap-2">
          {logoPath && (
            <img
              src={`${imageBaseUrl}${logoPath}`}
              alt="Current Logo"
              className="w-6 h-6 object-contain rounded border border-border-theme"
            />
          )}
          <button
            onClick={triggerFileInput}
            disabled={logoUploading}
            className="px-2 py-1 text-xs rounded border border-border-theme hover:bg-accent-dim transition-colors disabled:opacity-50"
          >
            {logoUploading ? "Uploading..." : logoPath ? "Change" : "Upload"}
          </button>
          {/* {logoPath && (
            <button
              onClick={handleClearLogo}
              disabled={logoUploading}
              className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )} */}
        </div>
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
