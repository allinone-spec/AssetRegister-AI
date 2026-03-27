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
  arInputSurface,
} from "../Components/Common/consoleWelcomeTheme";

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

const DataConsoleWelcomePage = ({ userName = "" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
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
        setSelectedModelId((prev) => resolveAiModelSelection(prev, list));
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
    <PageLayout className="!min-h-full !rounded-none border-0 !bg-[#f7f5ff] shadow-none">
      <div className="min-h-[82vh] overflow-auto px-5 py-6 md:px-7 md:py-8" style={{ fontFamily: AR_FONT }}>
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
          {/* Hero — V2.1 page header + brand icon */}
          <div className={`p-5 md:p-6 ${arCard}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6f2fe1] to-[#5a26c7] text-white shadow-[0_3px_10px_rgba(111,47,225,0.35)] sm:flex">
                  <LayoutDashboard size={24} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={`${arEyebrow} mb-1.5`}>Data console</p>
                  <h1 className={`${arPageTitle} mb-1.5`}>
                    Welcome{userName ? <span className="text-[#6f2fe1]">, {userName}</span> : ""}
                  </h1>
                  <p className={`${arPageSub} max-w-2xl`}>
                    Job coverage, AC vs DC totals (sampled jobs), maturity, and register mix. Scope follows the header{" "}
                    <span className="font-semibold text-[#6b7280]">object</span> selector (all objects or one register
                    object).
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

          {/* Toolbar card — filters & actions (V2.1 filter row) */}
          <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${arCard}`}>
            <div className="flex flex-wrap items-center gap-2">
              {aiModels.length > 0 && (
                <FormControl size="small" sx={selectSx}>
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
                Refresh insights
              </Button>
            </div>
            {permissionList.includes("Dashboard") && permissionDetails?.Dashboard?.hasWriteOnly && (
              <Button
                variant="contained"
                size="medium"
                onClick={handlNavigate}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "11px",
                  fontFamily: AR_FONT,
                  gap: 0.75,
                  background: "linear-gradient(135deg, #6f2fe1, rgba(111,47,225,0.82))",
                  boxShadow: "0 4px 14px rgba(111,47,225,0.35)",
                  "&:hover": { boxShadow: "0 6px 18px rgba(111,47,225,0.4)" },
                }}
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
                className="relative overflow-hidden rounded-[14px] p-5 text-white shadow-[0_8px_24px_rgba(111,47,225,0.35)]"
                style={{
                  fontFamily: AR_FONT,
                  background: "linear-gradient(145deg, #6f2fe1, rgba(90, 38, 199, 0.92))",
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
