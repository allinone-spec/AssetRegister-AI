// src/context/ThemeContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  getReadAllTheme,
  patchMultipartFormRequest,
  createTheme,
} from "../Service/api.service"; // adjust path to your actual api helpers
import toast from "react-hot-toast";
import { ACCENT_PRESETS, hexToPresetIdx, hexToRgb } from "./utils";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accentIdx, setAccentIdx] = useState(0); // -1 = custom
  const [customHex, setCustomHex] = useState(null); // only set when custom
  const [themeId, setThemeId] = useState(null); // API theme id
  const [logoPath, setLogoPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const settingsSnapshotRef = useRef(null);

  // Resolved accent hex — custom takes priority over preset
  const accentHex = customHex ?? ACCENT_PRESETS[Math.max(accentIdx, 0)].hex;
  const accentRgb = hexToRgb(accentHex);
  const accent = {
    hex: accentHex,
    rgb: accentRgb,
    label:
      accentIdx === -1
        ? "Custom"
        : (ACCENT_PRESETS[accentIdx]?.label ?? "Custom"),
  };

  // ── Apply CSS variables to DOM ─────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.setProperty("--accent", accent.hex);
    root.style.setProperty("--accent-rgb", accent.rgb);
  }, [isDark, accent.hex]);

  // ── Fetch theme from API on mount ──────────────────────────────────────────
  const fetchThemeFromAPI = useCallback(
    async (id, callDarkMode) => {
      try {
        const url = id ? `/theme/${id}/read` : `/theme/readAll`;
        const response = await getReadAllTheme(url);
        const data = id ? response.data : response.data?.[0]; // readAll returns array
        if (!data) return;
        if (callDarkMode) setIsDark(data.bgColor.backgroundColor === "#13131a");
        applyThemeData(data);
      } catch (err) {
        console.error("Failed to fetch theme:", err);
      }
    },
    [isDark],
  );

  // Apply a single theme object from API response into state
  const applyThemeData = (data) => {
    const hex = data?.bgColor?.textColor;
    if (hex) {
      const idx = hexToPresetIdx(hex);
      if (idx === -1) {
        setCustomHex(hex);
        setAccentIdx(-1);
      } else {
        setAccentIdx(idx);
        setCustomHex(null);
      }
    }
    if (data?.id) setThemeId(data.id);
    if (data?.logoPath !== undefined) setLogoPath(data.logoPath);
    // isDark not in API response — preserved from local state
  };

  // Load theme on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem("isTheme");
    fetchThemeFromAPI(savedThemeId ? JSON.parse(savedThemeId) : null, true);
  }, []);

  // ── Preset setter — clears custom ─────────────────────────────────────────
  const handleSetAccentIdx = (idx) => {
    setAccentIdx(idx);
    setCustomHex(null);
  };

  // ── Custom colour setter ───────────────────────────────────────────────────
  const setCustomAccent = (hex) => {
    setCustomHex(hex);
    setAccentIdx(-1);
  };

  const openSettings = () => {
    settingsSnapshotRef.current = {
      isDark,
      accentIdx,
      customHex,
    };
    setSettingsOpen(true);
  };

  const closeSettings = ({ reset = true } = {}) => {
    if (reset && settingsSnapshotRef.current) {
      const snapshot = settingsSnapshotRef.current;
      setIsDark(snapshot.isDark);
      setAccentIdx(snapshot.accentIdx);
      setCustomHex(snapshot.customHex);
    }
    settingsSnapshotRef.current = null;
    setSettingsOpen(false);
  };

  // ── Save theme to API ──────────────────────────────────────────────────────
  const updateThemeAPI = useCallback(
    async (selectLogo = null, logoReset = false, currentConsole = "both") => {
      setLoading(true);
      let themeIdToUse;

      const themeData = {
        bgColor: {
          backgroundColor: isDark ? "#13131a" : "#FFFFFF",
          textColor: accent.hex,
          textWhite: "#FFFFFF",
          textBlack: "#000000",
          layoutTextColor: "#FFFFFF",
          theme: isDark,
        },
        selectedColor:
          accentIdx === -1
            ? "custom"
            : (ACCENT_PRESETS[accentIdx]?.label?.toLowerCase() ?? "custom"),
        selectedShade: "400",
        isCustom: accentIdx === -1 ? accent.hex : "",
        console: currentConsole,
      };

      try {
        const themesResponse = await getReadAllTheme(`/theme/readAll`);
        const themes = themesResponse.data;

        const filePayload =
          logoReset && (selectLogo === null || selectLogo === "")
            ? { file: null }
            : typeof selectLogo !== "string" && selectLogo
              ? { file: selectLogo }
              : {};

        const existingThemeForConsole = themes.filter(
          (theme) =>
            theme.console === currentConsole ||
            theme.console === "both" ||
            currentConsole === "both",
        );

        let response;

        if (existingThemeForConsole.length) {
          for (const existingTheme of existingThemeForConsole) {
            response = await patchMultipartFormRequest(
              `/theme/${existingTheme.id}/update`,
              { themeRequest: JSON.stringify(themeData), ...filePayload },
            );
            if (logoReset && selectLogo === null) {
              setLogoPath("");
            } else if (selectLogo) {
              const r = await getReadAllTheme(
                `/theme/${existingTheme.id}/read`,
              );
              setLogoPath(r.data?.logoPath);
            }
            themeIdToUse = existingTheme.id;
          }
        } else if (themes.length >= 2) {
          const themeToUpdate =
            themes.find((t) => t.console === currentConsole) || themes[0];
          response = await patchMultipartFormRequest(
            `/theme/${themeToUpdate.id}/update`,
            { themeRequest: JSON.stringify(themeData), ...filePayload },
          );
          if (selectLogo) {
            const r = await getReadAllTheme(`/theme/${themeToUpdate.id}/read`);
            setLogoPath(r.data?.logoPath);
          }
          themeIdToUse = themeToUpdate.id;
        } else {
          response = await createTheme("/theme/add", {
            themeRequest: JSON.stringify(themeData),
            ...filePayload,
          });
          if (selectLogo) setLogoPath(selectLogo);
          if (response?.data?.id) themeIdToUse = response.data.id;
        }

        if (themeIdToUse) {
          localStorage.setItem("isTheme", JSON.stringify(themeIdToUse));
          setThemeId(themeIdToUse);
          fetchThemeFromAPI(themeIdToUse);
        }

        toast.success(response?.data?.message || "Theme updated successfully");
        return response?.data;
      } catch (error) {
        console.error("Failed to update theme:", error);
        toast.error(error.response?.data?.message || "Failed to update theme");
        if (themeIdToUse) fetchThemeFromAPI(themeIdToUse);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [accent.hex, accentIdx, isDark],
  );

  return (
    <ThemeContext.Provider
      value={{
        // accent
        accent,
        accentIdx,
        setAccentIdx: handleSetAccentIdx,
        setCustomAccent,
        // dark mode
        isDark,
        setIsDark,
        // settings panel
        settingsOpen,
        setSettingsOpen,
        openSettings,
        closeSettings,
        // API
        themeId,
        logoPath,
        setLogoPath,
        loading,
        fetchThemeFromAPI,
        updateThemeAPI,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
