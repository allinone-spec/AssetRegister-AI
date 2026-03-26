import React, { useEffect, useState, useCallback } from "react";
import { Button, Chip, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { useDispatch, useSelector } from "react-redux";
import { analyzeDataset, fetchAiModels, invalidateAnalysisCache } from "../Service/ai.service";
import AdminConsoleHomeInsights from "../Components/Common/AdminConsoleHomeInsights";
import PageLayout from "../Components/Common/PageLayout";
import { ChangeTrackingFilter } from "../Components/Common/ChangeTrackingFilter";
import { tableNameEnum } from "../Components/core/DataConsole/data";
import { buildAdminConsoleOverviewPayload } from "../Utility/aiConsolePayloads";

const ADMIN_HOME_IMPORT_TREND_KEY = "ar-admin-home-import-trend";

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
        if (list.length && !selectedModelId) setSelectedModelId(list[0].id);
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
    <PageLayout className="!bg-gradient-to-br from-violet-50/50 via-white to-white border border-violet-100/60 shadow-sm">
      <div className="min-h-[82vh] overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Admin Console</h1>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Hi {userName || "there"} — operational snapshot across Import Status, Saved Jobs, AR Mapping, and AR
                Rules. Uses the same <strong>object</strong> selector as the header. Optional: limit{" "}
                <strong>Import Status</strong> rows by date columns and last N days (same control as Import Status
                grid — <code className="text-xs bg-gray-100 px-1 rounded">ImportStatus</code> columns).
              </p>
              <p className="text-xs text-violet-800 font-medium mt-2">
                Current scope: <span className="text-gray-800">{objectScopeLabel}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {aiModels.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="admin-home-ai-model-label">Cloud AI</InputLabel>
                  <Select
                    labelId="admin-home-ai-model-label"
                    label="Cloud AI"
                    value={selectedModelId || aiModels[0]?.id || ""}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                  >
                    {aiModels.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.label || m.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => setChangeTrackingOpen(true)}
                disabled={aiLoading}
                sx={{ textTransform: "none" }}
              >
                Import days filter…
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => runAdminOverviewAnalysis(true)}
                disabled={aiLoading}
                sx={{
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  boxShadow: "none",
                  background: "linear-gradient(135deg, #6f2fe1 0%, #2563eb 100%)",
                  "&:hover": { boxShadow: "0 6px 16px rgba(111,47,225,0.25)" },
                }}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {xd ? (
              <>
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label={`Import Status: last ${xd.xDays} day(s)`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={String(xd.columnNames || "").split(",").filter(Boolean).slice(0, 4).join(", ")}
                  title={String(xd.columnNames || "")}
                />
                <Button size="small" onClick={handleRemoveImportTrend} sx={{ textTransform: "none" }}>
                  Clear days filter
                </Button>
              </>
            ) : (
              <span className="text-xs text-gray-500">No import date window — all Import Status rows (API default).</span>
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
