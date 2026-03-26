import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  CircularProgress,
  FormControlLabel,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { getRequest } from "../../../../Service/Console.service";
import { patchRequest } from "../../../../Service/admin.save";
import {
  analyzeDataset,
  chatWithData,
  clearChatSession,
  submitInsightFeedback,
  invalidateAnalysisCache,
  fetchAiModels,
} from "../../../../Service/ai.service";
import PageLayout from "../../../Common/PageLayout";
import DataTable from "../../../Common/DataTable";
import AiInsightContent from "../../../Common/AiInsightContent";
import AiChatAssistantMessage from "../../../Common/AiChatAssistantMessage";
import { normalizeKpiTitle } from "../../../../Utils/aiChatKpiExtract";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import toast from "react-hot-toast";

const OrginalSource = ({ routeName }) => {
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const user = useSelector((state) => state.auth?.user);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [filteredTableData, setFilteredTableData] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiStage, setAiStage] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [aiRequestDebug, setAiRequestDebug] = useState(null);
  const [aiResponseDebug, setAiResponseDebug] = useState(null);
  const [hiddenInsightIds, setHiddenInsightIds] = useState([]);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [aiFocusColumns, setAiFocusColumns] = useState([]);
  const [queuedKpiRequests, setQueuedKpiRequests] = useState([]);
  const [kpiTitleActions, setKpiTitleActions] = useState({});
  const aiStageTimerRef = useRef(null);

  useEffect(() => {
    dispatch(setHeadingTitle("Original Source"));
  }, []);

  useEffect(() => {
    if (aiLoading) {
      setAiStage(1);
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
      }
      aiStageTimerRef.current = setInterval(() => {
        setAiStage((prev) => (prev >= 4 ? 4 : prev + 1));
      }, 2000);
    } else {
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
        aiStageTimerRef.current = null;
      }
      setAiStage(0);
    }

    return () => {
      if (aiStageTimerRef.current) {
        clearInterval(aiStageTimerRef.current);
        aiStageTimerRef.current = null;
      }
    };
  }, [aiLoading]);

  useEffect(() => {
    if (aiDialogOpen) {
      fetchAiModels()
        .then((res) => {
          const list = res?.models || [];
          setAiModels(list);
          if (list.length && !selectedModelId) setSelectedModelId(list[0].id);
        })
        .catch(() => setAiModels([]));
    }
  }, [aiDialogOpen]);

  const getAiErrorMessage = (error, fallbackMessage) => {
    const errBody = error?.response?.data;
    const rawMessage =
      errBody?.detail || errBody?.message || error?.message || fallbackMessage;

    if (
      error?.response?.status === 429 ||
      /RateLimitReached|rate[- ]limit|Too Many Requests/i.test(rawMessage)
    ) {
      return "AI is temporarily busy due to rate limits. Please wait about 1 minute and try again.";
    }

    return rawMessage;
  };

  const aiStageMessages = [
    "Reading data from backend APIs...",
    "Pre-processing and cleaning data...",
    "Analyzing data with AI model...",
    "Summarizing insights...",
  ];

  const currentAiStageMessage =
    aiStageMessages[
      Math.max(0, Math.min(aiStage - 1, aiStageMessages.length - 1))
    ] || "Analyzing data...";

  const setKpiAction = (title, action) => {
    const normalized = normalizeKpiTitle(title);
    if (!normalized) return;
    setKpiTitleActions((prev) => ({
      ...prev,
      [normalized]: {
        action,
        title: String(title || normalized),
        at: Date.now(),
      },
    }));
  };

  const applyKpiActionOverrides = (result) => {
    if (!result || !Array.isArray(result.kpis)) return result;
    const actionMap = kpiTitleActions || {};
    const nextKpis = (result.kpis || []).filter((kpi) => {
      const key = normalizeKpiTitle(kpi?.title);
      const action = actionMap[key]?.action;
      return action !== "remove";
    });
    Object.values(actionMap).forEach((meta) => {
      if (meta?.action !== "add") return;
      const title = String(meta?.title || "").trim();
      if (!title) return;
      const exists = nextKpis.some((k) => normalizeKpiTitle(k?.title) === normalizeKpiTitle(title));
      if (!exists) {
        nextKpis.push({
          title,
          value: "Requested",
          description: "Added from chat action. Refresh after new data updates for computed value.",
        });
      }
    });
    return { ...result, kpis: nextKpis };
  };

  const composeRefreshPrompt = (basePrompt) => {
    const base = (typeof basePrompt === "string" ? basePrompt : "").trim();
    if (!queuedKpiRequests.length) return base || undefined;
    const kpiBlock =
      "Add/keep these KPI requests in next insights:\n" +
      queuedKpiRequests.map((k, i) => `${i + 1}. ${k}`).join("\n");
    return [base, kpiBlock].filter(Boolean).join("\n\n");
  };

  const handleToggleKpiLine = (kpiTitle, checked) => {
    const title = String(kpiTitle || "").trim();
    if (!title) return;
    if (checked) {
      setQueuedKpiRequests((prev) => {
        if (prev.some((x) => normalizeKpiTitle(x) === normalizeKpiTitle(title))) return prev;
        return [...prev, title];
      });
      setKpiAction(title, "add");
      return;
    }
    setQueuedKpiRequests((prev) => prev.filter((x) => normalizeKpiTitle(x) !== normalizeKpiTitle(title)));
    setKpiAction(title, "remove");
  };

  const buildAiPayload = () => ({
    orgId: user?.orgId || "default-org",
    userId: user?.id || "anonymous",
    pageId: "data-console/reports/original-source",
    category: "jobs",
    filters: { selectedObject: selectedObject || null },
  });

  const handleInsightFeedback = async (insightId, insightType, feedbackType, comment) => {
    const basePayload = buildAiPayload();
    try {
      await submitInsightFeedback({
        ...basePayload,
        kpiId: insightId,
        insightType,
        feedbackType,
        useful: feedbackType === "helpful",
        comment: comment || undefined,
      });
      if (feedbackType === "irrelevant") {
        setHiddenInsightIds((prev) => (prev.includes(insightId) ? prev : [...prev, insightId]));
      }
      if (insightType === "kpi") {
        const match = /^kpi-(\d+)$/.exec(String(insightId || ""));
        const idx = match ? Number(match[1]) : -1;
        const kpiTitle = idx >= 0 ? aiResult?.kpis?.[idx]?.title : null;
        if (kpiTitle) {
          if (feedbackType === "irrelevant") {
            setKpiAction(kpiTitle, "remove");
          } else if (feedbackType === "helpful") {
            setKpiAction(kpiTitle, "add");
          }
        }
      }
    } catch (err) {
      console.error("Insight feedback error:", err);
    }
  };

  const fetchSoruceData = async (showLoading = true) => {
    showLoading && setLoading(true);
    try {
      const response = await getRequest("/table/get/jobNames");
      if (response?.status === 200) {
        setData(
          response.data
            .map((v) => ({
              jobName: v?.jobName,
              ...v,
            }))
            .sort((a, b) => a.priority - b.priority) || [],
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (optionalCustomPrompt) => {
    try {
      setAiLoading(true);
      setAiError("");

      const customPrompt = (typeof optionalCustomPrompt === "string" ? optionalCustomPrompt : null)?.trim() || undefined;
      const payload = {
        ...buildAiPayload(),
        modelId: selectedModelId || undefined,
        customPrompt,
        focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
      };
      setAiRequestDebug(payload);
      const result = await analyzeDataset(payload);
      setAiResult(applyKpiActionOverrides(result));
      setAiResponseDebug(result);
    } catch (error) {
      console.error("AI analysis error:", error);
      const errBody = error?.response?.data;
      const errorMessage = getAiErrorMessage(
        error,
        "Failed to analyze data with AI. Please try again.",
      );
      setAiResult(null);
      setAiResponseDebug(
        errBody || {
          message: errorMessage,
        },
      );
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const userWantsInsightsRefresh = (text) => {
    const t = (text || "").toLowerCase();
    return /\b(refresh|re-analyze|reanalyze|update (the )?dashboard|update (the )?insights|run analysis again|re-run analysis)\b/.test(t);
  };

  const handleRefreshInsights = async () => {
    const lastUserMessage = [...chatHistory].reverse().find((m) => m?.role === "user")?.content;
    const refreshPrompt = composeRefreshPrompt(lastUserMessage);
    await invalidateAnalysisCache({
      ...buildAiPayload(),
      customPrompt: refreshPrompt,
      focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
    });
    await handleRunAnalysis(refreshPrompt);
    setQueuedKpiRequests([]);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = { role: "user", content: chatInput };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setChatInput("");

    try {
      setChatLoading(true);
      const payload = {
        ...buildAiPayload(),
        messages: newHistory,
        modelId: selectedModelId || undefined,
      };

      const result = await chatWithData(payload);
      const assistantMessage = {
        role: "assistant",
        content: result?.answer || "No answer returned from AI.",
        charts: Array.isArray(result?.charts) ? result.charts : [],
        kpisSnapshot: Array.isArray(aiResult?.kpis) ? aiResult.kpis : [],
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
      if (userWantsInsightsRefresh(userMessage.content)) {
        const refreshPrompt = composeRefreshPrompt(userMessage.content);
        await invalidateAnalysisCache({
          ...buildAiPayload(),
          customPrompt: refreshPrompt,
          focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
        });
        await handleRunAnalysis(refreshPrompt);
        setQueuedKpiRequests([]);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        "Failed to chat with AI. Please try again.";
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearInsight = async () => {
    setChatLoading(true);
    setAiLoading(true);
    setChatHistory([]);
    setChatInput("");
    setAiResult(null);
    setAiRequestDebug(null);
    setAiResponseDebug(null);
    setAiError("");
    setHiddenInsightIds([]);
    setQueuedKpiRequests([]);
    setKpiTitleActions({});
    try {
      const payload = buildAiPayload();
      await clearChatSession(payload);
      await handleRunAnalysis();
      toast.success("Insight memory cleared for this dataset.");
    } catch (error) {
      console.error("AI chat clear error:", error);
      const errBody = error?.response?.data;
      setAiError(
        errBody?.detail ||
          errBody?.message ||
          error?.message ||
          "Failed to clear chat session. Please try again.",
      );
      setAiLoading(false);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetchSoruceData();
    return () => {
      dispatch(setFilters([]));
    };
  }, []);

  const navigateEditHandler = (row) => {
    navigate(`/data-console/reports/original-source/jobs/${row.jobName}`, {
      state: row,
    });
  };

  const handleUpdatePriority = (priority) => {
    patchRequest("/jobSchedule/updatePriority", priority).then(() => {
      // fetchSoruceData(false);
      // toast.success("Update Priority Successfully");
    });
  };

  const rows = useMemo(() => {
    return selectedObject
      ? data.filter((job) => job?.object == selectedObject)
      : data;
  }, [selectedObject, data]);

  const column = rows.length
    ? Object.keys(rows[0] || {}).map((key) => ({
        accessorKey: key,
        header: key,
        enableLinkHandler:
          key === "jobName" &&
          permissionList?.includes(routeName) &&
          // permissionDetails[routeName]?.hasWriteOnly &&
          navigateEditHandler,
        enableGrouping: true,
      }))
    : [];

  const aiColumnCandidates = useMemo(
    () =>
      (column || [])
        .map((c) => c.accessorKey ?? c.header)
        .filter(Boolean)
        .map(String),
    [column]
  );

  return (
    <PageLayout className={`${!showTable && "!bg-transparent"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 relative">
        <div className="flex justify-between items-center m-4 my-7">
          <FormControlLabel
            className="absolute"
            control={
              <Switch
                checked={showTable}
                onChange={() => setShowTable(!showTable)}
              />
            }
            label={showTable ? "Hide Table" : "Show Table"}
          />
        </div>
        {showTable && (
          <div className="flex gap-3 sm:gap-6 items-center absolute right-7 top-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Total:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {rows.length}
              </span>
            </div>
            {filteredTableData !== rows.length && rows.length ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Filtered:
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {filteredTableData}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {showTable ? (
        loading ? (
          <div className="flex justify-center items-center h-full">
            <CircularProgress />
          </div>
        ) : rows.length ? (
          <DataTable
            key={selectedObject || "all"}
            isSelectedObject
            data={rows}
            columns={column}
            enableRowOrdering={true}
            enableRowSelection={false}
            enableFiltering={false}
            enableEditing={true}
            enableAction={false}
            enableGrouping={true}
            enableCreateView={false}
            enableCreateDashboard={false}
            onDataChange={() => {}}
            routeName={routeName}
            dashboardData={{ tableType: "original-source" }}
            handleUpdatePriority={handleUpdatePriority}
            tableId={1}
            setFilteredData={setFilteredTableData}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            No Data Found
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {rows.length > 0 ? (
            rows.map((jobName, index) => (
              <Link
                key={index}
                to={`/data-console/reports/original-source/jobs/${jobName?.jobName}`}
                state={jobName}
              >
                <div className="flex w-[100%] rounded-[20px] justify-between p-4 items-center bg-[#ffffff] shadow-md">
                  <img
                    src="https://cdn.paperpile.com/guides/img/find-credible-illustr-400x400.png?v=351"
                    alt="job"
                    className="w-20 h-20 object-cover rounded-full"
                  />
                  <div className="w-[75%] ml-2">
                    <h1 className="font-semibold text-[0.96rem] leading-[25px]">
                      {jobName?.jobName}
                    </h1>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center text-gray-500 col-span-2">
              No data available.
            </div>
          )}
        </div>
      )}
      <Dialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle className="flex items-center justify-between gap-2 pr-1">
          <span>AI Insights – Original Source</span>
          <IconButton
            size="small"
            onClick={() => setAiDialogOpen(false)}
            aria-label="Close AI Insights"
            sx={{ ml: "auto" }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {aiModels.length > 0 && (
            <div className="mb-4">
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel id="ai-model-label">Cloud AI</InputLabel>
                <Select
                  labelId="ai-model-label"
                  value={selectedModelId || aiModels[0]?.id || ""}
                  label="Cloud AI"
                  onChange={(e) => setSelectedModelId(e.target.value)}
                >
                  {aiModels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label || m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          )}
          {aiError && (
            <div className="mb-4 text-red-600 text-sm">{aiError}</div>
          )}
          {!aiError && aiLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CircularProgress size={18} />
              <span>{currentAiStageMessage}</span>
            </div>
          )}
          {!aiLoading && aiResult && (
            <AiInsightContent
              aiResult={aiResult}
              onInsightFeedback={handleInsightFeedback}
              hiddenInsightIds={hiddenInsightIds}
            />
          )}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h3 className="font-semibold text-base text-gray-800">Chat with your Original Source data</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRefreshInsights}
                  disabled={aiLoading}
                  sx={{
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 600,
                    px: 1.8,
                    boxShadow: "none",
                    background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                    "&:hover": {
                      boxShadow: "0 6px 16px rgba(59,130,246,0.28)",
                    },
                  }}
                >
                  Refresh insights{queuedKpiRequests.length ? ` (${queuedKpiRequests.length})` : ""}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleClearInsight}
                  disabled={chatLoading && chatHistory.length === 0}
                  sx={{
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 600,
                    px: 1.8,
                    borderColor: "#fecaca",
                    color: "#b91c1c",
                    backgroundColor: "#fff1f2",
                    "&:hover": {
                      borderColor: "#fca5a5",
                      backgroundColor: "#ffe4e6",
                    },
                  }}
                >
                  Clear Memory
                </Button>
              </div>
            </div>
            <div className="min-h-[300px] max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 mb-3 shadow-inner text-sm">
              {chatHistory.length === 0 && (
                <div className="text-gray-500 text-sm py-8 text-center">
                  Ask questions like “Which jobs often fail?” or “What changed
                  since yesterday’s run?”.
                </div>
              )}
              {chatHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`mb-3 last:mb-0 p-2.5 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-50 border border-blue-100 text-blue-900 ml-4 shadow-sm"
                      : "bg-white border border-slate-200 text-gray-800 mr-4 shadow-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    <>
                      <span className="font-semibold text-xs uppercase tracking-wide opacity-80 block mb-1">
                        You
                      </span>
                      <span className="whitespace-pre-wrap break-words block">{m.content}</span>
                    </>
                  ) : (
                    <AiChatAssistantMessage
                      message={m}
                      kpiTitleActions={kpiTitleActions}
                      onToggleKpiLine={handleToggleKpiLine}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-white"
                placeholder="Ask anything about these jobs..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                disabled={chatLoading}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleChatSend}
                disabled={chatLoading}
                sx={{ minWidth: 88, height: "42px", minHeight: "42px" }}
              >
                {chatLoading ? "Sending..." : "Send"}
              </Button>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Focus columns (optional)
              </label>
              <Autocomplete
                multiple
                size="small"
                options={aiColumnCandidates}
                value={aiFocusColumns}
                onChange={(_, newValue) => setAiFocusColumns(newValue || [])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Type to search, select columns..."
                    variant="outlined"
                  />
                )}
                sx={{ "& .MuiOutlinedInput-root": { py: 0.5 } }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select columns to emphasize in preprocessing and insights.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
export default OrginalSource;
