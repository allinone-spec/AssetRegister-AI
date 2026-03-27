import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { MessageSquareText, Sparkles, X } from "lucide-react";
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
import {
  loadHiddenInsightIds,
  persistHiddenInsightIds,
  clearHiddenInsightIds,
} from "../../../../Utils/aiSessionInsightPrefs";
import { commentImpliesHideInsight } from "../../../../Utils/aiInsightFeedback";
import { resolveAiModelSelection } from "../../../../Utils/resolveAiModelSelection";
import { consumeGlobalChatInsightNavForRoute } from "../../../../Utils/globalChatInsightNav";
import { setFilters } from "../../../../redux/Slices/AdvancedFilterSlice";
import {
  setSelectedObject,
  setSelectedObjectName,
  clearSelectedObject,
} from "../../../../redux/Slices/ObjectSelection";
import toast from "react-hot-toast";

const ORIGINAL_SOURCE_AI_PAGE = "data-console/reports/original-source";
const ORIGINAL_SOURCE_AI_CATEGORY = "jobs";
const buildChatMessageId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const aiInsightChatStateKey = (userId, pageId, category) =>
  `ai-insight-chat-v1:${String(userId || "anonymous")}:${String(pageId || "")}:${String(category || "")}`;

const OrginalSource = ({ routeName }) => {
  const { permissionList, permissionDetails } = useSelector(
    (state) => state.permission,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
          setSelectedModelId((prev) => resolveAiModelSelection(prev, list, res?.defaultChatModelId || ""));
        })
        .catch(() => setAiModels([]));
    }
  }, [aiDialogOpen]);

  const getAiErrorMessage = (error, fallbackMessage) => {
    const errBody = error?.response?.data;
    const detail = errBody?.detail;
    const rawMessage =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((x) => (typeof x === "string" ? x : x?.msg || "")).filter(Boolean).join("; ") ||
            fallbackMessage
          : errBody?.message || error?.message || fallbackMessage;

    const status = error?.response?.status;
    const rateLike =
      status === 429 ||
      /\btoo many requests\b/i.test(rawMessage) ||
      /\brate[\s_-]?limit\b/i.test(rawMessage) ||
      /RateLimitReached/i.test(rawMessage);

    if (rateLike) {
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

  const buildKpiActionMap = (titles = []) => {
    const out = {};
    (titles || []).forEach((title) => {
      const normalized = normalizeKpiTitle(title);
      if (!normalized) return;
      out[normalized] = {
        action: "add",
        title: String(title || normalized),
        at: Date.now(),
      };
    });
    return out;
  };

  const applyKpiActionOverrides = (result, actionMapOverride = null) => {
    if (!result || !Array.isArray(result.kpis)) return result;
    const actionMap = actionMapOverride || kpiTitleActions || {};
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
    pageId: ORIGINAL_SOURCE_AI_PAGE,
    category: ORIGINAL_SOURCE_AI_CATEGORY,
    filters: { selectedObject: selectedObject || null },
    modelId: selectedModelId || undefined,
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
      const hideForSession =
        feedbackType === "irrelevant" ||
        (feedbackType === "not_helpful" && commentImpliesHideInsight(comment));
      if (hideForSession) {
        setHiddenInsightIds((prev) => {
          const next = prev.includes(insightId) ? prev : [...prev, insightId];
          persistHiddenInsightIds(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY, next);
          return next;
        });
        toast.success(
          feedbackType === "not_helpful"
            ? "Understood — hiding this for your session. It stays hidden after refresh until you clear insight memory."
            : "Hidden for this session. It will stay hidden until you clear insight memory.",
        );
      } else if (feedbackType === "not_helpful") {
        toast.success(
          "Saved for this session. Use Refresh insights to regenerate with your changes.",
        );
      } else if (feedbackType === "helpful") {
        toast.success("Thanks — we will emphasize deeper follow-ons in this area on the next refresh.");
      }
      if (insightType === "kpi") {
        const match = /^kpi-(\d+)$/.exec(String(insightId || ""));
        const idx = match ? Number(match[1]) : -1;
        const kpiTitle = idx >= 0 ? aiResult?.kpis?.[idx]?.title : null;
        if (kpiTitle) {
          if (feedbackType === "irrelevant" || (feedbackType === "not_helpful" && commentImpliesHideInsight(comment))) {
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

  const handleChatMessageFeedback = async (message, feedbackType) => {
    if (!message?.messageId || !feedbackType) return;
    const basePayload = buildAiPayload();
    try {
      await submitInsightFeedback({
        ...basePayload,
        kpiId: message.messageId,
        insightType: "chat_answer",
        feedbackType,
        useful: feedbackType === "helpful",
        comment: undefined,
      });
      setChatHistory((prev) =>
        prev.map((item) =>
          item?.messageId === message.messageId ? { ...item, feedbackType } : item
        )
      );
    } catch (err) {
      console.error("Chat answer feedback error:", err);
      toast.error("Could not save chat feedback. Please retry.");
    }
  };

  const handleAddChatAnswerToInsights = async (message) => {
    if (!message?.messageId || message?.addedToInsights) return;
    const raw = String(message?.content || "").trim();
    if (!raw) return;
    try {
      await submitInsightFeedback({
        ...buildAiPayload(),
        kpiId: message.messageId,
        insightType: "chat_answer",
        feedbackType: "helpful",
        useful: true,
        comment: "Added to insight from chat answer",
      });
    } catch (err) {
      console.error("Add-to-insight feedback error:", err);
      toast.error("Could not persist Add to insight for next analysis.");
      return;
    }
    const titleLine = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);
    const title = (titleLine || "Chat insight").slice(0, 100);
    setAiResult((prev) => {
      const safePrev = prev && typeof prev === "object" ? prev : {};
      const current = Array.isArray(safePrev.totalInsights) ? safePrev.totalInsights : [];
      if (current.some((x) => String(x?.chatMessageId || "") === message.messageId)) return safePrev;
      return {
        ...safePrev,
        totalInsights: [
          ...current,
          {
            title,
            text: raw.slice(0, 1800),
            severity: "medium",
            chatMessageId: message.messageId,
            source: "chat",
          },
        ],
      };
    });
    setChatHistory((prev) =>
      prev.map((item) =>
        item?.messageId === message.messageId ? { ...item, addedToInsights: true } : item
      )
    );
    toast.success("Added this answer to insight cards.");
  };

  useEffect(() => {
    if (!aiDialogOpen) return;
    const key = aiInsightChatStateKey(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY);
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.chatHistory)) return;
      setChatHistory(
        parsed.chatHistory.slice(-40).map((m) => ({
          messageId: m?.messageId || buildChatMessageId(),
          role: m?.role === "assistant" ? "assistant" : "user",
          content: String(m?.content || ""),
          insight: m?.insight || null,
          charts: Array.isArray(m?.charts) ? m.charts : [],
          kpisSnapshot: Array.isArray(m?.kpisSnapshot) ? m.kpisSnapshot : [],
          feedbackType: String(m?.feedbackType || ""),
          addedToInsights: Boolean(m?.addedToInsights),
        }))
      );
    } catch {
      // Ignore invalid persisted state.
    }
  }, [aiDialogOpen, user?.id]);

  useEffect(() => {
    const key = aiInsightChatStateKey(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY);
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          chatHistory: chatHistory.slice(-40),
        })
      );
    } catch {
      // Ignore storage quota errors.
    }
  }, [chatHistory, user?.id]);

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

  const handleRunAnalysis = async (optionalCustomPrompt, opts) => {
    const overrideModelId = opts?.modelId;
    const effectiveModelId =
      overrideModelId !== undefined && overrideModelId !== null && String(overrideModelId).trim() !== ""
        ? String(overrideModelId).trim()
        : selectedModelId;
    try {
      setAiLoading(true);
      setAiError("");

      const customPrompt = (typeof optionalCustomPrompt === "string" ? optionalCustomPrompt : null)?.trim() || undefined;
      const payload = {
        ...buildAiPayload(),
        modelId: effectiveModelId || undefined,
        customPrompt,
        focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
      };
      setAiRequestDebug(payload);
      const result = await analyzeDataset(payload);
      setAiResult(applyKpiActionOverrides(result, opts?.kpiActionMap || null));
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

  const handleRunAnalysisRef = useRef(handleRunAnalysis);
  handleRunAnalysisRef.current = handleRunAnalysis;
  const aiResultRef = useRef(aiResult);
  aiResultRef.current = aiResult;

  useEffect(() => {
    const pending = consumeGlobalChatInsightNavForRoute(location.pathname);
    if (!pending) return;

    if (pending.objectId != null && String(pending.objectId).trim() !== "") {
      dispatch(setSelectedObject(String(pending.objectId)));
      if (pending.objectName) dispatch(setSelectedObjectName(String(pending.objectName)));
    } else {
      dispatch(clearSelectedObject());
      dispatch(setSelectedObjectName(""));
    }

    const addedFromGlobal = Array.isArray(pending.addedInsights) ? pending.addedInsights.filter((x) => x && x.text) : [];
    const applyAddedInsights = (base) => {
      if (!addedFromGlobal.length) return base;
      const safeBase = base && typeof base === "object" ? base : {};
      const current = Array.isArray(safeBase.totalInsights) ? safeBase.totalInsights : [];
      const appended = addedFromGlobal.map((item) => ({
        title: String(item.title || "Chat insight").slice(0, 100),
        text: String(item.text || "").slice(0, 1800),
        severity: String(item.severity || "medium"),
        source: "chat",
      }));
      return { ...safeBase, totalInsights: [...current, ...appended] };
    };
    const titles = Array.isArray(pending.kpis) ? pending.kpis.filter(Boolean) : [];
    const actionMap = buildKpiActionMap(titles);

    const timerId = window.setTimeout(() => {
      setHiddenInsightIds(loadHiddenInsightIds(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY));
      setQueuedKpiRequests(titles);
      setKpiTitleActions(actionMap);
      setAiDialogOpen(true);
      if (aiResultRef.current) {
        setAiResult((prev) => applyAddedInsights(applyKpiActionOverrides(prev, actionMap)));
        return;
      }
      void handleRunAnalysisRef.current(undefined, { kpiActionMap: actionMap }).then(() => {
        if (addedFromGlobal.length) {
          setAiResult((prev) => applyAddedInsights(prev));
        }
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [location.pathname, dispatch, user?.id]);

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
        focusColumns: aiFocusColumns?.length ? aiFocusColumns : undefined,
      };

      const result = await chatWithData(payload);
      const assistantMessage = {
        messageId: buildChatMessageId(),
        role: "assistant",
        content: result?.answer || "No answer returned from AI.",
        charts: Array.isArray(result?.charts) ? result.charts : [],
        kpisSnapshot: Array.isArray(aiResult?.kpis) ? aiResult.kpis : [],
        feedbackType: "",
        addedToInsights: false,
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
        { messageId: buildChatMessageId(), role: "assistant", content: errorMessage, feedbackType: "", addedToInsights: false },
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
      clearHiddenInsightIds(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY);
      await clearChatSession(buildAiPayload());
      try {
        sessionStorage.removeItem(aiInsightChatStateKey(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY));
      } catch {
        // noop
      }
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

  const handleAiModelSwitch = async (nextId) => {
    if (nextId === selectedModelId) return;
    setSelectedModelId(nextId);
    if (!aiDialogOpen) return;

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
      clearHiddenInsightIds(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY);
      await clearChatSession({
        ...buildAiPayload(),
        modelId: nextId || undefined,
      });
      try {
        sessionStorage.removeItem(aiInsightChatStateKey(user?.id, ORIGINAL_SOURCE_AI_PAGE, ORIGINAL_SOURCE_AI_CATEGORY));
      } catch {
        // noop
      }
      await handleRunAnalysis(undefined, { modelId: nextId });
      toast.success("Switched model — insights refreshed for this dataset.");
    } catch (error) {
      console.error("AI model switch error:", error);
      const errBody = error?.response?.data;
      setAiError(
        errBody?.detail ||
          errBody?.message ||
          error?.message ||
          "Failed to switch model. Please try again.",
      );
    } finally {
      setChatLoading(false);
      setAiLoading(false);
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

  const AI_ORIGINAL_SOURCE_DRILL_MAX = 8000;
  const aiOriginalSourceDrillDown = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const total = rows.length;
    const sliced =
      total > AI_ORIGINAL_SOURCE_DRILL_MAX
        ? rows.slice(0, AI_ORIGINAL_SOURCE_DRILL_MAX)
        : rows;
    return {
      rows: sliced,
      caption: selectedObject
        ? `Original Source — jobs (filtered by object: ${selectedObject})`
        : "Original Source — job list (current view)",
      truncated: total > AI_ORIGINAL_SOURCE_DRILL_MAX,
      totalRowCount: total,
    };
  }, [rows, selectedObject]);

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
        scroll="paper"
        slotProps={{
          root: { sx: { zIndex: 1400 } },
          backdrop: { sx: { zIndex: 1399 } },
          paper: {
            className:
              "rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[min(90vh,calc(100dvh-48px))]",
            sx: {
              backgroundImage: "linear-gradient(180deg, #fafafa 0%, #ffffff 120px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <DialogTitle className="!flex !shrink-0 !flex-row !items-start !justify-between !gap-3 !pr-2 !pb-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="text-white" size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block text-lg font-semibold tracking-tight leading-tight">AI insights</span>
              <span className="block text-xs font-normal text-violet-100/95 mt-1 leading-snug">
                Original Source jobs — analysis across your job list, then chat in context.
              </span>
            </div>
          </div>
          <IconButton
            size="small"
            onClick={() => setAiDialogOpen(false)}
            aria-label="Close AI Insights"
            sx={{ ml: 0, color: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          className="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !border-slate-200/80 !bg-slate-50/30 !p-0"
        >
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/70 bg-slate-50/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm z-[8]">
            {aiModels.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200, flex: "1 1 200px", maxWidth: "100%" }}>
                <InputLabel id="ai-model-label">Model</InputLabel>
                <Select
                  labelId="ai-model-label"
                  value={selectedModelId || aiModels[0]?.id || ""}
                  label="Model"
                  onChange={(e) => handleAiModelSwitch(e.target.value)}
                >
                  {aiModels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label || m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <div className="flex flex-wrap items-center gap-2 min-w-0 sm:ml-auto">
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
                Clear memory
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [scrollbar-gutter:stable]">
          {aiError && (
            <div
              className="mb-4 flex gap-3 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-900 shadow-sm"
              role="alert"
            >
              <span className="shrink-0 font-semibold">Error</span>
              <span className="leading-relaxed">{aiError}</span>
            </div>
          )}
          {!aiError && aiLoading && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-violet-100 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
              <CircularProgress size={28} sx={{ color: "#7c3aed" }} />
              <div>
                <div className="font-semibold text-slate-800">Working on your analysis</div>
                <div className="text-slate-600 mt-0.5">{currentAiStageMessage}</div>
              </div>
            </div>
          )}
          {!aiLoading && aiResult && (
            <AiInsightContent
              aiResult={aiResult}
              pathname="/data-console/reports/original-source"
              onInsightFeedback={handleInsightFeedback}
              hiddenInsightIds={hiddenInsightIds}
              drillDown={aiOriginalSourceDrillDown}
            />
          )}
          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 md:p-5 shadow-sm ring-1 ring-slate-100/80">
            <div className="flex items-center gap-2 mb-3 text-slate-800">
              <MessageSquareText className="text-violet-600 shrink-0" size={20} strokeWidth={1.75} aria-hidden />
              <h3 className="font-semibold text-base">Chat with Original Source data</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mb-4">
              Same session as the insights above. Use <span className="font-medium text-slate-600">Refresh insights</span>{" "}
              above to rebuild analysis for all listed jobs, or <span className="font-medium text-slate-600">Clear memory</span>{" "}
              to reset chat.
            </p>
            <div className="min-h-[300px] max-h-[380px] overflow-y-auto rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-4 mb-3 shadow-inner text-sm [scrollbar-width:thin]">
              {chatHistory.length === 0 && (
                <div className="text-slate-500 text-sm py-10 text-center px-4 leading-relaxed max-w-md mx-auto">
                  <span className="block text-violet-600/90 font-medium mb-1">Start the conversation</span>
                  Try “Which jobs often fail?” or “What changed since yesterday’s run?”
                </div>
              )}
              {chatHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`mb-3 last:mb-0 p-3 rounded-xl ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-sky-50 to-blue-50/80 border border-sky-200/60 text-sky-950 ml-3 sm:ml-8 shadow-sm"
                      : "bg-white border border-slate-200/90 text-slate-800 mr-3 sm:mr-8 shadow-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    <>
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-sky-800/80 block mb-1.5">
                        You
                      </span>
                      <span className="whitespace-pre-wrap break-words block leading-relaxed">{m.content}</span>
                    </>
                  ) : (
                    <AiChatAssistantMessage
                      message={m}
                      kpiTitleActions={kpiTitleActions}
                      onToggleKpiLine={handleToggleKpiLine}
                      onMessageFeedback={handleChatMessageFeedback}
                      onAddToInsight={handleAddChatAnswerToInsights}
                      showContextFromInsights={false}
                      showAddToDashboardKpis={false}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                className="flex-1 border border-slate-300/90 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 outline-none transition bg-white shadow-sm placeholder:text-slate-400"
                placeholder="Ask anything about these jobs…"
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
                sx={{
                  minWidth: 92,
                  height: "42px",
                  minHeight: "42px",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                  boxShadow: "none",
                  "&:hover": { boxShadow: "0 6px 16px rgba(59,130,246,0.28)" },
                }}
              >
                {chatLoading ? "Sending…" : "Send"}
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Focus columns (optional)</label>
              <Autocomplete
                multiple
                size="small"
                options={aiColumnCandidates}
                value={aiFocusColumns}
                onChange={(_, newValue) => setAiFocusColumns(newValue || [])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and select columns to emphasize…"
                    variant="outlined"
                  />
                )}
                sx={{ "& .MuiOutlinedInput-root": { py: 0.5, borderRadius: "12px", bgcolor: "#fff" } }}
              />
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Shapes preprocessing and narrative. Session feedback on insight cards is remembered too.
              </p>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
export default OrginalSource;
