import React, { useEffect, useState, useCallback } from "react";
import { Button, Chip, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { useDispatch, useSelector } from "react-redux";
import { Settings2, Shield } from "lucide-react";
import { analyzeDataset, fetchAiModels, invalidateAnalysisCache } from "../Service/ai.service";
import AdminConsoleHomeInsights from "../Components/Common/AdminConsoleHomeInsights";
import PageLayout from "../Components/Common/PageLayout";
import { ChangeTrackingFilter } from "../Components/Common/ChangeTrackingFilter";
import { tableNameEnum } from "../Components/core/DataConsole/data";
import { buildAdminConsoleOverviewPayload } from "../Utility/aiConsolePayloads";
import { resolveAiModelSelection } from "../Utils/resolveAiModelSelection";
import {
  AR_FONT,
  arCard,
  arEyebrow,
  arPageSub,
  arPageTitle,
  arTypeBadge,
  arInputSurface,
} from "../Components/Common/consoleWelcomeTheme";

const ADMIN_HOME_IMPORT_TREND_KEY = "ar-admin-home-import-trend";

const selectSx = {
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    borderRadius: "11px",
    backgroundColor: arInputSurface,
    fontFamily: AR_FONT,
    "& fieldset": { borderColor: "rgba(111,47,225,0.12)" },
    "&:hover fieldset": { borderColor: "rgba(111,47,225,0.22)" },
    "&.Mui-focused fieldset": { borderColor: "#6f2fe1", borderWidth: "1.5px" },
  },
};

function readStoredImportTrendFilter() {
  try {
    const raw = localStorage.getItem(ADMIN_HOME_IMPORT_TREND_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const cols = o?.xDaysFilter?.columnNames;
    const days = Number(o?.xDaysFilter?.xDays);
    if (o?.xFilter && String(cols || "").trim() && Number.isFinite(days) && days >= 1) {
      return {
        xDaysFilter: {
          columnNames: String(cols).trim(),
          xDays: days,
        },
        xFilter: true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const AdminConsoleWelcomePage = ({ userName = "" }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const selectedObjectName = useSelector((state) => state.selectedObject.valueName);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [importTrendFilter, setImportTrendFilter] = useState(() => readStoredImportTrendFilter());
  const [changeTrackingOpen, setChangeTrackingOpen] = useState(false);

  const objectScopeLabel = selectedObject
    ? selectedObjectName || `Object ${selectedObject}`
    : "All objects";

  const persistImportTrend = useCallback((next) => {
    setImportTrendFilter(next);
    if (next?.xDaysFilter && next.xFilter) {
      localStorage.setItem(ADMIN_HOME_IMPORT_TREND_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(ADMIN_HOME_IMPORT_TREND_KEY);
    }
  }, []);

  const handleApplyImportTrend = useCallback(
    (filterConfig) => {
      persistImportTrend({
        xDaysFilter: {
          columnNames: filterConfig.selectedColumns.join(","),
          xDays: filterConfig.days,
        },
        xFilter: true,
      });
    },
    [persistImportTrend]
  );

  const handleRemoveImportTrend = useCallback(() => {
    persistImportTrend(null);
  }, [persistImportTrend]);

  const runAdminOverviewAnalysis = useCallback(
    async (invalidateFirst = false) => {
      try {
        setAiLoading(true);
        setAiError("");
        const payload = buildAdminConsoleOverviewPayload({
          user,
          selectedObject,
          selectedModelId,
          importTrendFilter,
        });
        if (invalidateFirst) {
          try {
            await invalidateAnalysisCache({
              orgId: payload.orgId,
              userId: payload.userId,
              pageId: payload.pageId,
              category: payload.category,
              filters: payload.filters,
              modelId: payload.modelId,
            });
          } catch (e) {
            console.warn("invalidateAnalysisCache (admin home):", e);
          }
        }
        const result = await analyzeDataset(payload);
        setAiResult(result);
      } catch (error) {
        const errBody = error?.response?.data;
        setAiError(
          errBody?.detail || errBody?.message || error?.message || "Failed to generate Admin Console summary."
        );
        setAiResult(null);
      } finally {
        setAiLoading(false);
      }
    },
    [user, selectedObject, selectedModelId, importTrendFilter]
  );

  useEffect(() => {
    dispatch(setHeadingTitle("Admin Console"));
  }, [dispatch]);

  useEffect(() => {
    fetchAiModels()
      .then((res) => {
        const list = res?.models || [];
        setAiModels(list);
        setSelectedModelId((prev) => resolveAiModelSelection(prev, list, res?.defaultAnalysisModelId || ""));
      })
      .catch(() => setAiModels([]));
  }, []);

  useEffect(() => {
    runAdminOverviewAnalysis();
  }, [selectedModelId, selectedObject, importTrendFilter, runAdminOverviewAnalysis]);

  const adminDash = aiResult?.adminDashboard || {};
  const metrics = adminDash.metrics || {};
  const highlights = adminDash.highlights || {};

  const xd = importTrendFilter?.xDaysFilter;

  return (
    <PageLayout className="!min-h-full !rounded-none border-0 !bg-[#f7f5ff] shadow-none">
      <div className="min-h-[82vh] overflow-auto px-5 py-6 md:px-7 md:py-8" style={{ fontFamily: AR_FONT }}>
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
          <div className={`p-5 md:p-6 ${arCard}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6f2fe1] to-[#5a26c7] text-white shadow-[0_3px_10px_rgba(111,47,225,0.35)] sm:flex">
                  <Shield size={24} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={`${arEyebrow} mb-1.5`}>Admin console</p>
                  <h1 className={`${arPageTitle} mb-1.5`}>Admin Console</h1>
                  <p className={`${arPageSub} max-w-2xl`}>
                    <span className="font-semibold text-[#6b7280]">Hi {userName || "there"}.</span> Snapshot across
                    Import Status, Saved Jobs, AR Mapping, and AR Rules. Optional: narrow Import Status by date columns
                    and last N days (same as the Import Status grid —{" "}
                    <code
                      className="rounded px-1 py-0.5 text-[11px] font-medium"
                      style={{ fontFamily: "DM Mono, monospace", background: "rgba(111,47,225,0.09)" }}
                    >
                      ImportStatus
                    </code>
                    ).
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={arTypeBadge}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6f2fe1]" aria-hidden />
                      Scope: <span className="text-[#1a1028]">{objectScopeLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${arCard}`}>
            <div className="flex flex-wrap items-center gap-2">
              {aiModels.length > 0 && (
                <FormControl size="small" sx={selectSx}>
                  <InputLabel id="admin-home-ai-model-label" sx={{ fontFamily: AR_FONT }}>
                    Model
                  </InputLabel>
                  <Select
                    labelId="admin-home-ai-model-label"
                    label="Model"
                    value={selectedModelId || aiModels[0]?.id || ""}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    sx={{ fontFamily: AR_FONT, fontSize: "13px" }}
                  >
                    {aiModels.map((m) => (
                      <MenuItem key={m.id} value={m.id} sx={{ fontFamily: AR_FONT }}>
                        {m.label || m.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                variant="outlined"
                size="medium"
                startIcon={<Settings2 size={16} />}
                onClick={() => setChangeTrackingOpen(true)}
                disabled={aiLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "11px",
                  fontFamily: AR_FONT,
                  borderColor: "rgba(111,47,225,0.22)",
                  color: "#5b21b6",
                  px: 2,
                  "&:hover": { borderColor: "#6f2fe1", bgcolor: "rgba(111,47,225,0.06)" },
                }}
              >
                Import days filter
              </Button>
              <Button
                variant="contained"
                size="medium"
                onClick={() => runAdminOverviewAnalysis(true)}
                disabled={aiLoading}
                sx={{
                  borderRadius: "11px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontFamily: AR_FONT,
                  px: 2.5,
                  boxShadow: "0 4px 14px rgba(111,47,225,0.35)",
                  background: "linear-gradient(135deg, #6f2fe1, rgba(111,47,225,0.82))",
                  "&:hover": { boxShadow: "0 6px 18px rgba(111,47,225,0.4)" },
                }}
              >
                Refresh insights
              </Button>
            </div>
          </div>

          <div className={`flex flex-wrap items-center gap-2 px-1 ${arCard} !p-3`}>
            {xd ? (
              <>
                <Chip
                  size="small"
                  label={`Import Status · last ${xd.xDays} day(s)`}
                  sx={{
                    fontFamily: AR_FONT,
                    fontWeight: 700,
                    fontSize: "11px",
                    borderRadius: "99px",
                    borderColor: "rgba(111,47,225,0.22)",
                    bgcolor: arInputSurface,
                    color: "#5b21b6",
                  }}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  variant="outlined"
                  title={String(xd.columnNames || "")}
                  label={String(xd.columnNames || "")
                    .split(",")
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ")}
                  sx={{
                    fontFamily: "DM Mono, ui-monospace, monospace",
                    fontSize: "10px",
                    borderRadius: "99px",
                    maxWidth: 280,
                  }}
                />
                <Button
                  size="small"
                  onClick={handleRemoveImportTrend}
                  sx={{ textTransform: "none", fontWeight: 700, fontFamily: AR_FONT, color: "#6b7280" }}
                >
                  Clear filter
                </Button>
              </>
            ) : (
              <span className="text-xs font-medium text-[#9ca3af]">
                No import date window — all Import Status rows (API default).
              </span>
            )}
          </div>

          {aiError ? (
            <AdminConsoleHomeInsights error={aiError} />
          ) : (
            <AdminConsoleHomeInsights
              metrics={metrics}
              highlights={highlights}
              loading={aiLoading}
              error=""
              importTrendFilter={importTrendFilter}
            />
          )}
        </div>
      </div>

      <ChangeTrackingFilter
        isOpen={changeTrackingOpen}
        onClose={() => setChangeTrackingOpen(false)}
        tableName={tableNameEnum.IMPORTSTATUS}
        onApplyFilter={handleApplyImportTrend}
        onRemoveFilter={handleRemoveImportTrend}
        currentFilter={{
          xDaysFilter: importTrendFilter?.xDaysFilter || null,
          xFilter: importTrendFilter?.xFilter || false,
        }}
      />
    </PageLayout>
  );
};

export default AdminConsoleWelcomePage;
