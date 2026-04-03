import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { FaSmileWink } from "react-icons/fa";
import { analyzeDataset, fetchAiModels, invalidateAnalysisCache } from "../Service/ai.service";
import DataConsoleHomeInsights from "../Components/Common/DataConsoleHomeInsights";
import PageLayout from "../Components/Common/PageLayout";
import { buildDataConsoleOverviewPayload } from "../Utility/aiConsolePayloads";
import { resolveAiModelSelection } from "../Utils/resolveAiModelSelection";
import {
  AR_FONT,
  arCard,
  arEyebrow,
  arPageSub,
  arPageTitle,
  arTypeBadge,
  arOutlinedAccentSx,
  arPrimaryGradientSx,
  arSelectSx,
} from "../Components/Common/consoleWelcomeTheme";

const DataConsoleWelcomePage = ({ userName = "" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.permission?.user);
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const selectedObjectName = useSelector((state) => state.selectedObject.valueName);
  const { permissionList, permissionDetails } = useSelector((state) => state.permission);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedJobName, setSelectedJobName] = useState("");

  const objectScopeLabel = selectedObject
    ? selectedObjectName || `Object ${selectedObject}`
    : "All objects";

  const runAnalysis = useCallback(async (invalidateFirst = false) => {
    try {
      setAiLoading(true);
      setAiError("");
      const payload = buildDataConsoleOverviewPayload({
        user,
        selectedObject,
        selectedJobName,
        selectedModelId,
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
          console.warn("invalidateAnalysisCache (data home):", e);
        }
      }
      const result = await analyzeDataset(payload);
      setAiResult(result);
    } catch (error) {
      const errBody = error?.response?.data;
      setAiError(
        errBody?.detail || errBody?.message || error?.message || "Failed to load Data Console home summary."
      );
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }, [user, selectedObject, selectedJobName, selectedModelId]);

  useEffect(() => {
    dispatch(setHeadingTitle("Data Console"));
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
    runAnalysis();
  }, [runAnalysis]);

  const home = aiResult?.dataConsoleHome || {};
  const metrics = home.metrics || {};
  const highlights = home.highlights || {};

  const jobNames = useMemo(() => {
    const rows = metrics.jobTableSummaries || [];
    const names = rows.map((r) => r.jobName).filter(Boolean);
    return [...new Set(names)].sort();
  }, [metrics.jobTableSummaries]);

  const handlNavigate = () => {
    navigate("/data-console/dashboard/new-create");
  };

  return (
    <PageLayout className="!min-h-full !rounded-none border-0 !bg-page-bg shadow-none">
      <div className="min-h-[82vh] overflow-auto px-5 py-6 md:px-7 md:py-8" style={{ fontFamily: AR_FONT }}>
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
          {/* Hero — V2.1 page header + brand icon */}
          <div className={`p-5 md:p-6 ${arCard}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-[color-mix(in_srgb,var(--accent)_78%,#000)] text-white shadow-accent sm:flex">
                  <LayoutDashboard size={24} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={`${arEyebrow} mb-1.5`}>Data console</p>
                  <h1 className={`${arPageTitle} mb-1.5`}>
                    Welcome{userName ? <span className="text-accent">, {userName}</span> : ""}
                  </h1>
                  <p className={`${arPageSub} max-w-2xl`}>
                    Job coverage, AC vs DC totals (sampled jobs), maturity, and register mix. Scope follows the header{" "}
                    <span className="font-semibold text-text-sub">object</span> selector (all objects or one register
                    object).
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={arTypeBadge}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      Scope: <span className="text-text-primary">{objectScopeLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar card — filters & actions (V2.1 filter row) */}
          <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${arCard}`}>
            <div className="flex flex-wrap items-center gap-2">
              {aiModels.length > 0 && (
                <FormControl size="small" sx={arSelectSx}>
                  <InputLabel id="data-home-ai-model-label" sx={{ fontFamily: AR_FONT }}>
                    Model
                  </InputLabel>
                  <Select
                    labelId="data-home-ai-model-label"
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
                onClick={() => runAnalysis(true)}
                disabled={aiLoading}
                sx={arOutlinedAccentSx}
              >
                Refresh insights
              </Button>
            </div>
            {permissionList.includes("Dashboard") && permissionDetails?.Dashboard?.hasWriteOnly && (
              <Button
                variant="contained"
                size="medium"
                onClick={handlNavigate}
                sx={{ ...arPrimaryGradientSx, gap: 0.75 }}
              >
                <FaSmileWink className="text-lg" />
                New dashboard
              </Button>
            )}
          </div>

          {/* Main + optional quick column (V2.1 dash-grid) */}
          <div className="grid gap-4 xl:grid-cols-[1fr_minmax(260px,300px)] xl:items-start">
            <div className="min-w-0">
              {aiError ? (
                <DataConsoleHomeInsights error={aiError} />
              ) : (
                <DataConsoleHomeInsights
                  metrics={metrics}
                  highlights={highlights}
                  loading={aiLoading}
                  error=""
                  jobNames={jobNames}
                  selectedJobName={selectedJobName}
                  onJobChange={(name) => setSelectedJobName(typeof name === "string" ? name : "")}
                />
              )}
            </div>

            <aside className="hidden xl:block">
              <div
                className="relative overflow-hidden rounded-[14px] p-5 text-white shadow-accent"
                style={{
                  fontFamily: AR_FONT,
                  background:
                    "linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #000))",
                }}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"
                  aria-hidden
                />
                <p className="relative z-[1] text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
                  Quick actions
                </p>
                <p className="relative z-[1] mt-2 text-sm font-semibold leading-snug text-white/95">
                  AI snapshot refreshes when you change object, job scope, or model.
                </p>
                <div className="relative z-[1] mt-4 flex items-start gap-2 rounded-[9px] border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/90">
                  <Sparkles className="mt-0.5 shrink-0 opacity-90" size={16} aria-hidden />
                  <span>Use Refresh insights after changing prompts in Admin → Settings → AI prompt templates.</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DataConsoleWelcomePage;
