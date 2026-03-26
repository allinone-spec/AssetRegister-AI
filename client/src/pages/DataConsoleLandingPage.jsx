import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setHeadingTitle } from "../redux/Slices/HeadingTitle";
import { FaSmileWink } from "react-icons/fa";
import { analyzeDataset, fetchAiModels, invalidateAnalysisCache } from "../Service/ai.service";
import DataConsoleHomeInsights from "../Components/Common/DataConsoleHomeInsights";
import PageLayout from "../Components/Common/PageLayout";
import { buildDataConsoleOverviewPayload } from "../Utility/aiConsolePayloads";

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
        if (list.length && !selectedModelId) setSelectedModelId(list[0].id);
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
    <PageLayout className="!bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border border-slate-200/80 shadow-sm">
      <div className="min-h-[82vh] overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Welcome{userName ? `, ${userName}` : ""}
              </h1>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Job coverage, AC vs DC totals (sampled jobs), maturity, and register mix when an object is selected.
                Scope matches the header <strong>object</strong> dropdown (&quot;All Object&quot; or a specific
                register object).
              </p>
              <p className="text-xs text-blue-900 font-medium mt-2">
                Current scope: <span className="text-gray-800">{objectScopeLabel}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {aiModels.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="data-home-ai-model-label">Cloud AI</InputLabel>
                  <Select
                    labelId="data-home-ai-model-label"
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
                onClick={() => runAnalysis(true)}
                disabled={aiLoading}
                sx={{ textTransform: "none" }}
              >
                Refresh
              </Button>
              {permissionList.includes("Dashboard") && permissionDetails?.Dashboard?.hasWriteOnly && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handlNavigate}
                  sx={{ textTransform: "none", gap: 0.5 }}
                >
                  <FaSmileWink className="text-lg" />
                  New dashboard
                </Button>
              )}
            </div>
          </div>

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
      </div>
    </PageLayout>
  );
};

export default DataConsoleWelcomePage;
