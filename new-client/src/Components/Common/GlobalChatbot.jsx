import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Sparkles, X } from "lucide-react";
import { clearGlobalChatSession, fetchAiModels, globalChat, submitInsightFeedback } from "../../Service/ai.service";
import { resolveAiModelSelection } from "../../Utils/resolveAiModelSelection";
import { getRequest } from "../../Service/api.service";
import { getRequest as getAdminRequest } from "../../Service/Console.service";
import AiChatAssistantMessage from "./AiChatAssistantMessage";
import { AiChatContextStrip } from "./AiInsightContent";
import { normalizeKpiTitle } from "../../Utils/aiChatKpiExtract";
import { canonicalInsightTargetRoute, saveGlobalChatInsightNav } from "../../Utils/globalChatInsightNav";

const ALL_OBJECT = "__all__";
const LEGACY_HEADER_OBJECT = "__header__";

const DATA_MODULES = [
  { id: "dashboards", label: "Dashboards" },
  { id: "reports", label: "Reports" },
  { id: "register", label: "Register" },
  { id: "security", label: "Security" },
];

const ADMIN_MODULES = [
  { id: "dashboards", label: "Dashboards" },
  { id: "import-status", label: "Import status" },
  { id: "saved-jobs", label: "Saved jobs" },
  { id: "ar-mapping", label: "AR mapping" },
  { id: "ar-rules", label: "AR rules" },
];

const SECURITY_SUBS = [
  { id: "users", label: "Users" },
  { id: "groups", label: "Groups" },
  { id: "roles", label: "Roles" },
  { id: "permissions", label: "Permissions" },
];

/** Matches report job URL segments and DataTable `dashboardData.tableType` */
const REPORT_SOURCE_TYPES = [
  { id: "original-source", label: "Original source" },
  { id: "by-ar-resource", label: "By AR source" },
];

const buildChatMessageId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const canRenderChart = (chart) => {
  const labels = Array.isArray(chart?.xAxis) ? chart.xAxis : [];
  const series = Array.isArray(chart?.series) ? chart.series : [];
  const values = Array.isArray(series?.[0]?.values) ? series[0].values : [];
  return labels.length > 0 && values.length > 0;
};
const toAppRoute = (pageId) => {
  const raw = String(pageId || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const GlobalChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.permission?.user);
  const [open, setOpen] = useState(false);
  const [onboardDone, setOnboardDone] = useState(false);
  const [consoleType, setConsoleType] = useState(
    location.pathname.includes("/admin-console") ? "admin" : "data"
  );
  const [chatObjectId, setChatObjectId] = useState(ALL_OBJECT);
  const [dataModule, setDataModule] = useState("dashboards");
  const [adminModule, setAdminModule] = useState("dashboards");
  const [reportJobName, setReportJobName] = useState("");
  const [reportSourceType, setReportSourceType] = useState("original-source");
  const [securitySubModule, setSecuritySubModule] = useState("users");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [objects, setObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [jobRows, setJobRows] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [aiModels, setAiModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [kpiTitleActions, setKpiTitleActions] = useState({});
  /** Latest /api/ai/global-chat `analysis` payload — hydrates insight panel instantly on Go to insight. */
  const [lastScopedAnalysis, setLastScopedAnalysis] = useState(null);
  const effectiveUserId = user?.id || localStorage.getItem("user-id") || "anonymous";
  const globalChatStateKey = useMemo(
    () => `global-chatbot-state-v3:${String(effectiveUserId)}`,
    [effectiveUserId]
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(globalChatStateKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setOpen(Boolean(saved.open));
      setOnboardDone(Boolean(saved.onboardDone));
      setConsoleType(
        saved.consoleType || (location.pathname.includes("/admin-console") ? "admin" : "data")
      );
      const savedObject = saved.chatObjectId ?? ALL_OBJECT;
      setChatObjectId(savedObject === LEGACY_HEADER_OBJECT ? ALL_OBJECT : savedObject);
      setDataModule(saved.dataModule || "dashboards");
      setAdminModule(saved.adminModule || "dashboards");
      setReportJobName(saved.reportJobName || "");
      setReportSourceType(saved.reportSourceType || "original-source");
      setSecuritySubModule(saved.securitySubModule || "users");
      setSelectedModelId(saved.selectedModelId || "");
      setKpiTitleActions(saved.kpiTitleActions || {});
      setMessages(Array.isArray(saved.messages) ? saved.messages.slice(-40) : []);
    } catch (e) {
      // ignore invalid cache
    }
  }, [globalChatStateKey, location.pathname]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        globalChatStateKey,
        JSON.stringify({
          open,
          onboardDone,
          consoleType,
          chatObjectId,
          dataModule,
          adminModule,
          reportJobName,
          reportSourceType,
          securitySubModule,
          selectedModelId,
          kpiTitleActions,
          messages: messages.slice(-40).map((m) => ({
            messageId: m.messageId,
            role: m.role,
            content: m.content,
            enableKpiPanel: m.enableKpiPanel,
            feedbackType: m.feedbackType || "",
            addedToInsights: Boolean(m.addedToInsights),
            disableAnswerActions: Boolean(m.disableAnswerActions),
            isIntroCard: Boolean(m.isIntroCard),
            scope: m.scope || null,
            insight: m.insight || null,
            charts: Array.isArray(m.charts) ? m.charts : [],
            kpisSnapshot: Array.isArray(m.kpisSnapshot) ? m.kpisSnapshot : [],
          })),
        })
      );
    } catch (e) {
      // ignore
    }
  }, [
    globalChatStateKey,
    open,
    onboardDone,
    consoleType,
    chatObjectId,
    dataModule,
    adminModule,
    reportJobName,
    reportSourceType,
    securitySubModule,
    selectedModelId,
    kpiTitleActions,
    messages,
  ]);

  const resolvedObjectId = useMemo(() => {
    if (chatObjectId === ALL_OBJECT) return null;
    return chatObjectId || null;
  }, [chatObjectId]);

  const loadObjects = useCallback(async () => {
    setObjectsLoading(true);
    try {
      const res = await getRequest("/objects/readAll", false);
      if (res?.status === 200 && Array.isArray(res.data)) {
        setObjects(res.data);
      } else {
        setObjects([]);
      }
    } catch (e) {
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await getAdminRequest("/table/get/jobNames");
      const rawRows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
      if (res?.status === 200) {
        const ordered = [...rawRows]
          .map((row) => ({
            jobName: row?.jobName,
            ...row,
          }))
          .sort((a, b) => {
          const ap = Number(a?.priority ?? Number.MAX_SAFE_INTEGER);
          const bp = Number(b?.priority ?? Number.MAX_SAFE_INTEGER);
          if (ap !== bp) return ap - bp;
          const an = String(a?.jobName ?? a?.name ?? "");
          const bn = String(b?.jobName ?? b?.name ?? "");
          return an.localeCompare(bn, undefined, { sensitivity: "base" });
        });
        const uniqueRows = [];
        const seen = new Set();
        for (const row of ordered) {
          const name = String(row?.jobName ?? row?.name ?? "").trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          uniqueRows.push({ ...row, jobName: name });
        }
        setJobRows(uniqueRows);
      } else {
        setJobRows([]);
      }
    } catch (e) {
      setJobRows([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const filteredJobRows = useMemo(() => {
    return resolvedObjectId
      ? jobRows.filter((job) => job?.object == resolvedObjectId)
      : jobRows;
  }, [jobRows, resolvedObjectId]);

  useEffect(() => {
    if (!open) return;
    loadObjects();
  }, [open, loadObjects]);

  useEffect(() => {
    if (!open || consoleType !== "data" || dataModule !== "reports") return;
    loadJobs();
  }, [open, consoleType, dataModule, loadJobs]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setModelsLoading(true);
    fetchAiModels()
      .then((res) => {
        const list = Array.isArray(res?.models) ? res.models : [];
        if (cancelled) return;
        setAiModels(list);
        setSelectedModelId((prev) => resolveAiModelSelection(prev, list, res?.defaultChatModelId || ""));
      })
      .catch(() => {
        if (!cancelled) setAiModels([]);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const contextFilters = useMemo(() => {
    const base = {
      selectedObject: resolvedObjectId,
      userName: user?.email || user?.userName || undefined,
    };
    if (consoleType === "admin") {
      return { ...base, adminModule };
    }
    const out = { ...base, dataModule };
    if (dataModule === "reports") {
      out.reportSourceType = reportSourceType;
      if (reportJobName) out.reportJobName = reportJobName;
    }
    if (dataModule === "register" && chatObjectId !== ALL_OBJECT) {
      const on = objects.find((o) => String(o.objectId) === String(chatObjectId))?.objectName;
      if (on) out.objectName = on;
    }
    if (dataModule === "security") {
      out.securitySubModule = securitySubModule;
    }
    return out;
  }, [
    resolvedObjectId,
    chatObjectId,
    objects,
    user?.email,
    user?.userName,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    reportSourceType,
    securitySubModule,
  ]);

  const moduleKeyForApi = consoleType === "data" ? dataModule : adminModule;
  const insightTargetRoute = useMemo(() => {
    if (consoleType === "admin") {
      if (adminModule === "import-status") return "/admin-console/import-status";
      if (adminModule === "saved-jobs") return "/admin-console/saved-jobs";
      if (adminModule === "ar-mapping") return "/admin-console/ar-mapping";
      if (adminModule === "ar-rules") return "/admin-console/ar-rules";
      return "/admin-console";
    }
    if (consoleType !== "data") return "";
    if (dataModule === "reports") {
      if (!reportJobName) {
        return "/data-console/reports";
      }
      const segment = reportSourceType === "by-ar-resource" ? "by-ar-resource" : "original-source";
      return `/data-console/reports/${segment}/jobs/${reportJobName}`;
    }
    if (dataModule === "register") return "/data-console/register/detailed";
    if (dataModule === "security") {
      const sub = securitySubModule || "users";
      if (sub === "permissions") return "/data-console/security/permission";
      return `/data-console/security/${sub}`;
    }
    if (dataModule === "dashboards") return "/data-console";
    return "";
  }, [consoleType, adminModule, dataModule, reportJobName, reportSourceType, securitySubModule]);

  const canStartChat = useMemo(() => {
    if (modelsLoading) return false;
    if (consoleType === "data") {
      if (dataModule === "register" && !resolvedObjectId) return false;
    }
    return true;
  }, [modelsLoading, consoleType, dataModule, resolvedObjectId]);
  const canGoToInsight = useMemo(() => {
    if (!onboardDone) return false;
    if (!insightTargetRoute) return false;
    if (consoleType === "data" && dataModule === "register" && !resolvedObjectId) return false;
    return true;
  }, [onboardDone, insightTargetRoute, consoleType, dataModule, resolvedObjectId]);

  const scopeSummary = useMemo(() => {
    const objLabel =
      chatObjectId === ALL_OBJECT
        ? "All object"
        : objects.find((o) => String(o.objectId) === String(chatObjectId))?.objectName || "Selected object";
    if (consoleType === "admin") {
      const m = ADMIN_MODULES.find((x) => x.id === adminModule);
      const base = `${objLabel} · Admin · ${m?.label || adminModule}`;
      const modelLabel =
        selectedModelId && aiModels.length
          ? aiModels.find((x) => x.id === selectedModelId)?.label || selectedModelId
          : null;
      return modelLabel ? `${base} · ${modelLabel}` : base;
    }
    const m = DATA_MODULES.find((x) => x.id === dataModule);
    let tail = m?.label || dataModule;
    if (dataModule === "reports") {
      const rs = REPORT_SOURCE_TYPES.find((x) => x.id === reportSourceType);
      if (rs) tail += ` · ${rs.label}`;
      if (reportJobName) tail += ` · Job: ${reportJobName}`;
    }
    if (dataModule === "security") {
      const s = SECURITY_SUBS.find((x) => x.id === securitySubModule);
      tail += ` · ${s?.label || securitySubModule}`;
    }
    const modelLabel =
      selectedModelId && aiModels.length
        ? aiModels.find((m) => m.id === selectedModelId)?.label || selectedModelId
        : null;
    const base = `${objLabel} · Data · ${tail}`;
    return modelLabel ? `${base} · ${modelLabel}` : base;
  }, [
    chatObjectId,
    objects,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    reportSourceType,
    securitySubModule,
    selectedModelId,
    aiModels,
  ]);

  /** Compact label for context chip; full sentence in title tooltip */
  const scopeChipLabel = useMemo(() => {
    const objTag =
      chatObjectId === ALL_OBJECT
        ? "All object"
        : (() => {
            const name = objects.find((o) => String(o.objectId) === String(chatObjectId))?.objectName;
            if (!name) return "Object";
            return name.length > 16 ? `${name.slice(0, 14)}…` : name;
          })();
    if (consoleType === "admin") {
      const m = ADMIN_MODULES.find((x) => x.id === adminModule);
      const adminBase = `${objTag} · Admin · ${m?.label || adminModule}`;
      const adminModel =
        selectedModelId && aiModels.length
          ? aiModels.find((x) => x.id === selectedModelId)?.label || selectedModelId
          : null;
      if (adminModel) {
        const short = adminModel.length > 14 ? `${adminModel.slice(0, 12)}…` : adminModel;
        return `${adminBase} · ${short}`;
      }
      return adminBase;
    }
    const m = DATA_MODULES.find((x) => x.id === dataModule);
    const parts = [objTag, "Data", m?.label || dataModule];
    if (dataModule === "reports") {
      parts.push(reportSourceType === "by-ar-resource" ? "By AR" : "Original");
      if (reportJobName) {
        const jn = reportJobName.length > 18 ? `${reportJobName.slice(0, 16)}…` : reportJobName;
        parts.push(jn);
      }
    }
    if (dataModule === "security") {
      const s = SECURITY_SUBS.find((x) => x.id === securitySubModule);
      parts.push(s?.label || securitySubModule);
    }
    let chip = parts.join(" · ");
    const dataModel =
      selectedModelId && aiModels.length
        ? aiModels.find((x) => x.id === selectedModelId)?.label || selectedModelId
        : null;
    if (dataModel) {
      const short = dataModel.length > 14 ? `${dataModel.slice(0, 12)}…` : dataModel;
      chip += ` · ${short}`;
    }
    return chip;
  }, [
    chatObjectId,
    objects,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    reportSourceType,
    securitySubModule,
    selectedModelId,
    aiModels,
  ]);

  const handleStartChat = async () => {
    if (!canStartChat) return;
    setOnboardDone(true);
    setMessages([]);
    const introQuestion =
      "Give me a conversational starter summary for this exact context using raw data. Include key KPIs, trends, risks, recommendations, and useful visuals.";
    try {
      setChatLoading(true);
      const res = await globalChat({
        orgId: user?.orgId || "default-org",
        userId: effectiveUserId,
        consoleType,
        moduleKey: moduleKeyForApi,
        route: location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
        contextFilters,
        userName: user?.email || user?.userName || undefined,
        modelId: selectedModelId || undefined,
        messages: [{ role: "user", content: introQuestion }],
      });
      setLastScopedAnalysis(res?.analysis && typeof res.analysis === "object" ? res.analysis : null);
      setMessages([
        {
          messageId: buildChatMessageId(),
          role: "assistant",
          content: res?.answer || `I’m ready with this context: ${scopeSummary}.`,
          insight: res?.insight || null,
          charts: Array.isArray(res?.charts) ? res.charts : [],
          kpisSnapshot: Array.isArray(res?.insight?.kpis) ? res.insight.kpis : [],
          scope: res?.scope || null,
          enableKpiPanel: false,
          feedbackType: "",
          addedToInsights: false,
          disableAnswerActions: true,
          isIntroCard: true,
        },
      ]);
    } catch (err) {
      setLastScopedAnalysis(null);
      setMessages([
        {
          messageId: buildChatMessageId(),
          role: "assistant",
          content:
            err?.response?.data?.message ||
            err?.message ||
            "I couldn't load the initial context summary. Please try Start conversation again.",
          enableKpiPanel: false,
          feedbackType: "",
          addedToInsights: false,
          disableAnswerActions: true,
          isIntroCard: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleToggleKpiLine = useCallback((kpiTitle, checked) => {
    const key = normalizeKpiTitle(kpiTitle);
    if (!key) return;
    setKpiTitleActions((prev) => {
      const next = { ...prev };
      if (checked) next[key] = { title: kpiTitle, action: "add" };
      else delete next[key];
      return next;
    });
  }, []);

  const handleChatMessageFeedback = useCallback(
    async (message, feedbackType) => {
      if (!message?.messageId || !feedbackType) return;
      const scope = message?.scope || {};
      const pageIdForFeedback =
        String(scope?.resolvedPageId || "").trim() ||
        (location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname);
      const categoryForFeedback = String(scope?.resolvedCategory || "").trim() || "global-chat";
      const filtersForFeedback = scope?.resolvedFilters || contextFilters;
      try {
        await submitInsightFeedback({
          orgId: user?.orgId || "default-org",
          userId: effectiveUserId,
          pageId: pageIdForFeedback,
          category: categoryForFeedback,
          filters: filtersForFeedback,
          kpiId: message.messageId,
          insightType: "chat_answer",
          feedbackType,
          useful: feedbackType === "helpful",
          comment: undefined,
        });
        setMessages((prev) =>
          prev.map((item) => (item?.messageId === message.messageId ? { ...item, feedbackType } : item))
        );
      } catch {
        // Ignore feedback failures to keep chat flow smooth.
      }
    },
    [user?.orgId, effectiveUserId, location.pathname, contextFilters]
  );

  const handleAddToInsights = useCallback(async (message) => {
    if (!message?.messageId || message?.addedToInsights) return;
    const raw = String(message?.content || "").trim();
    if (!raw) return;
    setMessages((prev) =>
      prev.map((item) => {
        if (item?.messageId !== message.messageId) return item;
        const currentInsight = item?.insight && typeof item.insight === "object" ? item.insight : {};
        const currentRecs = Array.isArray(currentInsight.recommendations) ? currentInsight.recommendations : [];
        return {
          ...item,
          addedToInsights: true,
          insight: {
            ...currentInsight,
            recommendations: [...currentRecs, { text: raw.slice(0, 1200) }],
          },
        };
      })
    );
    const scope = message?.scope || {};
    const targetRoute = toAppRoute(scope?.resolvedPageId) || insightTargetRoute;
    if (targetRoute) {
      const titleLine = raw.split(/\n+/).map((x) => x.trim()).find(Boolean) || "Chat insight";
    saveGlobalChatInsightNav({
      route: canonicalInsightTargetRoute(targetRoute),
      objectId: resolvedObjectId,
      objectName:
        objects.find((o) => String(o.objectId) === String(resolvedObjectId))?.objectName || "",
      addedInsights: [{ title: titleLine.slice(0, 100), text: raw.slice(0, 1800), severity: "medium", source: "chat" }],
    });
    }
  }, [insightTargetRoute, resolvedObjectId, objects]);

  const handleGoToInsight = useCallback(() => {
    if (!canGoToInsight || !insightTargetRoute) return;
    const path = canonicalInsightTargetRoute(insightTargetRoute);
    let navigatePath = path;
    if (dataModule === "register") {
      navigatePath = "/data-console/register?tab=detailed";
    } else if (dataModule === "reports") {
      const seg =
        reportSourceType === "by-ar-resource" ? "by-ar-resource" : "original-source";
      const sp = new URLSearchParams();
      sp.set("source", seg);
      navigatePath = `/data-console/reports?${sp.toString()}`;
    } else if (dataModule === "security") {
      const sub = securitySubModule || "users";
      const sp = new URLSearchParams();
      sp.set("section", sub);
      navigatePath = `/data-console/security?${sp.toString()}`;
    }
    saveGlobalChatInsightNav({
      route: path,
      objectId: resolvedObjectId,
      objectName:
        objects.find((o) => String(o.objectId) === String(resolvedObjectId))?.objectName || "",
      kpis: [],
      addedInsights: [],
      seedAnalysis: lastScopedAnalysis,
    });
    navigate(navigatePath, {
      state:
        dataModule === "reports" && reportJobName
          ? { openReportInsightJob: reportJobName }
          : dataModule === "security"
            ? { openSecurityInsightSection: securitySubModule || "users" }
            : undefined,
    });
  }, [
    canGoToInsight,
    insightTargetRoute,
    dataModule,
    reportJobName,
    reportSourceType,
    securitySubModule,
    resolvedObjectId,
    objects,
    navigate,
    lastScopedAnalysis,
  ]);

  const handleSend = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    const userMsg = { role: "user", content: question };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setChatInput("");
    try {
      setChatLoading(true);
      const res = await globalChat({
        orgId: user?.orgId || "default-org",
        userId: effectiveUserId,
        consoleType,
        moduleKey: moduleKeyForApi,
        route: location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
        contextFilters,
        userName: user?.email || user?.userName || undefined,
        modelId: selectedModelId || undefined,
        messages: newMsgs.slice(-16),
      });
      setLastScopedAnalysis(res?.analysis && typeof res.analysis === "object" ? res.analysis : null);
      setMessages((prev) => [
        ...prev,
        {
          messageId: buildChatMessageId(),
          role: "assistant",
          content: res?.answer || "No response returned.",
          insight: res?.insight || null,
          charts: Array.isArray(res?.charts) ? res.charts : [],
          kpisSnapshot: Array.isArray(res?.insight?.kpis) ? res.insight.kpis : [],
          scope: res?.scope || null,
          enableKpiPanel: true,
          feedbackType: "",
          addedToInsights: false,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          messageId: buildChatMessageId(),
          role: "assistant",
          content:
            err?.response?.data?.message ||
            (typeof err?.response?.data?.detail === "string"
              ? err.response.data.detail
              : Array.isArray(err?.response?.data?.detail)
                ? err.response.data.detail.map((d) => d?.msg || d).join("; ")
                : "") ||
            err?.message ||
            "Sorry, I could not process that right now.",
          feedbackType: "",
          addedToInsights: false,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearPayload = useMemo(
    () => ({
      orgId: user?.orgId || "default-org",
      userId: effectiveUserId,
      consoleType,
      moduleKey: moduleKeyForApi,
      route: location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
      contextFilters,
      modelId: selectedModelId || undefined,
    }),
    [user?.orgId, effectiveUserId, consoleType, moduleKeyForApi, location.pathname, contextFilters, selectedModelId]
  );

  const handleResetConversation = async () => {
    setMessages([]);
    setOnboardDone(false);
    setChatInput("");
    setKpiTitleActions({});
    setLastScopedAnalysis(null);
    try {
      await clearGlobalChatSession(clearPayload);
    } catch (e) {
      // local reset still applies
    }
  };

  const handleChangeModule = () => {
    setMessages([]);
    setOnboardDone(false);
    setChatInput("");
    setKpiTitleActions({});
    setLastScopedAnalysis(null);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open assistant — cross-console chat"
          title="Open assistant"
          onClick={() => setOpen(true)}
          className="group fixed bottom-4 right-4 z-[1100] flex h-14 max-w-[100vw] items-center overflow-hidden rounded-full text-white ring-2 ring-surface dark:ring-white/20 ai-gradient-fab hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(var(--accent-rgb),0.35)] transition-[width,box-shadow] duration-300 ease-out w-14 hover:w-[11.5rem] hover:shadow-lg"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
            <Sparkles size={22} strokeWidth={1.85} className="opacity-95" />
          </span>
          <span className="min-w-0 pr-3 text-left text-sm font-semibold leading-none opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 pointer-events-none">
            Open assistant
          </span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-4 right-4 z-[1100] w-[420px] max-w-[96vw] h-[min(640px,92vh)] flex flex-col bg-surface rounded-2xl border border-border-theme shadow-2xl shadow-theme overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
          role="dialog"
          aria-label="Global assistant"
        >
          <div className="px-3.5 py-3 border-b border-white/10 ai-gradient-header text-white shrink-0 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 shrink-0">
                  <Sparkles size={16} className="text-white" strokeWidth={2} aria-hidden />
                </span>
                <div className="text-sm font-semibold leading-tight tracking-tight">Assistant</div>
              </div>
              <div className="flex shrink-0 items-center gap-1 pt-0.5">
                {onboardDone && (
                  <>
                    <button
                      type="button"
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                        canGoToInsight
                          ? "border-emerald-200/80 bg-emerald-500/20 text-white hover:bg-emerald-500/30"
                          : "border-white/20 bg-white/5 text-white/60 cursor-not-allowed"
                      }`}
                      onClick={handleGoToInsight}
                      disabled={!canGoToInsight}
                      aria-label="Go to insight"
                    >
                      Go to insight
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-2.5 py-1 rounded-full border border-white/35 bg-white/10 text-white hover:bg-white/20 transition-colors"
                      onClick={handleChangeModule}
                      aria-label="Change context"
                    >
                      Context
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-2.5 py-1 rounded-full border border-red-200/80 bg-red-500/20 text-white hover:bg-red-500/30 transition-colors"
                      onClick={handleResetConversation}
                      aria-label="Reset conversation"
                    >
                      Reset
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="p-1 rounded-lg text-white/90 hover:bg-white/15 hover:text-white"
                  onClick={() => setOpen(false)}
                  aria-label="Close global chatbot"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-white/80 leading-snug">
              Grounded in your console scope and metrics
            </div>
            {onboardDone && (
              <div className="mt-2">
                <span
                  className="inline-flex w-fit max-w-full items-center rounded-full border border-white/25 bg-black/10 px-2.5 py-0.5 text-[10px] font-medium leading-tight text-white"
                  title={scopeSummary}
                >
                  <span className="max-w-full truncate">{scopeChipLabel}</span>
                </span>
              </div>
            )}
          </div>

          {!onboardDone ? (
            <div className="p-4 flex flex-col flex-1 min-h-0 bg-gradient-to-b from-page-bg to-surface">
              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1 [scrollbar-width:thin]">
              <Typography variant="body2" className="text-text-sub !text-[13px] !leading-relaxed">
                Choose <strong>object</strong>, <strong>console</strong>, <strong>module</strong>, and (when available){" "}
                <strong>model</strong> so answers match where you’re working. Then chat in plain language.
              </Typography>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">1 · Object</label>
                <Select
                  size="small"
                  fullWidth
                  value={chatObjectId}
                  disabled={objectsLoading}
                  onChange={(e) => setChatObjectId(e.target.value)}
                >
                  <MenuItem value={ALL_OBJECT}>All object</MenuItem>
                  {objects.map((obj) => (
                    <MenuItem key={obj.objectId} value={String(obj.objectId)}>
                      {obj.objectName || obj.objectId}
                    </MenuItem>
                  ))}
                </Select>
                {objectsLoading && (
                  <div className="text-[10px] text-text-faint">Loading objects…</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">2 · Console</label>
                <Select
                  size="small"
                  fullWidth
                  value={consoleType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setConsoleType(next);
                  }}
                >
                  <MenuItem value="data">Data console</MenuItem>
                  <MenuItem value="admin">Admin console</MenuItem>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">3 · Module</label>
                <Select
                  size="small"
                  fullWidth
                  value={consoleType === "data" ? dataModule : adminModule}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (consoleType === "data") {
                      setDataModule(v);
                      if (v !== "reports") setReportJobName("");
                    } else {
                      setAdminModule(v);
                    }
                  }}
                >
                  {(consoleType === "data" ? DATA_MODULES : ADMIN_MODULES).map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>

              {consoleType === "data" && dataModule === "reports" && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                      4 · Report source
                    </label>
                    <Select
                      size="small"
                      fullWidth
                      value={reportSourceType}
                      onChange={(e) => setReportSourceType(e.target.value)}
                    >
                      {REPORT_SOURCE_TYPES.map((opt) => (
                        <MenuItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                      5 · Job name
                    </label>
                    <Select
                      size="small"
                      fullWidth
                      value={reportJobName}
                      disabled={jobsLoading}
                      onChange={(e) => setReportJobName(e.target.value)}
                    >
                      {filteredJobRows.map((row) => {
                        const name = row?.jobName ?? row?.name ?? String(row);
                        return (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    {jobsLoading && <div className="text-[10px] text-text-faint">Loading jobs…</div>}
                  </div>
                </>
              )}

              {consoleType === "data" && dataModule === "security" && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">4 · Security module</label>
                  <Select
                    size="small"
                    fullWidth
                    value={securitySubModule}
                    onChange={(e) => setSecuritySubModule(e.target.value)}
                  >
                    {SECURITY_SUBS.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )}

              {aiModels.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                    {consoleType === "data" && dataModule === "reports" ? "6 · Model" : "4 · Model"}
                  </label>
                  <FormControl size="small" fullWidth disabled={modelsLoading}>
                    <InputLabel id="global-chat-model-label">Cloud AI model</InputLabel>
                    <Select
                      labelId="global-chat-model-label"
                      label="Cloud AI model"
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
                  {modelsLoading && <div className="text-[10px] text-text-faint">Refreshing models…</div>}
                </div>
              )}

              {consoleType === "data" && dataModule === "register" && !resolvedObjectId && (
                <Typography variant="caption" className="text-amber-800 block">
                  Choose a specific object (not only the header) if the header has no object — Register needs an
                  object to load rows.
                </Typography>
              )}
              {consoleType === "data" && dataModule === "reports" && reportJobName && chatObjectId !== ALL_OBJECT && !resolvedObjectId && (
                <Typography variant="caption" className="text-amber-800 block">
                  Pick a specific object or choose All object to analyze this job across objects.
                </Typography>
              )}
              </div>

              <div className="mt-3 pt-3 border-t border-border-theme bg-surface/90 rounded-xl">
              <Button
                variant="contained"
                fullWidth
                disabled={!canStartChat}
                onClick={handleStartChat}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  py: 1.25,
                  background:
                    "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #2563eb))",
                  boxShadow: "0 4px 14px rgba(var(--accent-rgb), 0.35)",
                  "&:hover": { boxShadow: "0 6px 20px rgba(var(--accent-rgb), 0.4)" },
                }}
              >
                Start conversation
              </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 flex flex-col flex-1 min-h-0 bg-page-bg/60">
              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-0 [scrollbar-width:thin]">
                {messages.map((m, i) => (
                  <div key={`${m.role}-${i}`} className="space-y-2">
                    <div
                      className={`rounded-xl p-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-accent-dim border border-border-theme text-text-primary ml-5 shadow-sm"
                          : "rounded-xl border border-border-theme bg-surface text-text-primary mr-5 shadow-sm ring-1 ring-[rgba(var(--accent-rgb),0.12)]"
                      }`}
                    >
                      {m.role === "user" ? (
                        <>
                          <div className="text-[10px] uppercase tracking-wider opacity-75 mb-1.5 font-semibold text-current">
                            You
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </>
                      ) : (
                        <AiChatAssistantMessage
                          message={m}
                          kpiTitleActions={kpiTitleActions}
                          onToggleKpiLine={handleToggleKpiLine}
                          kpiPanelHelpText="Tick lines to remember KPI ideas for this chat session."
                          onMessageFeedback={m?.disableAnswerActions ? undefined : handleChatMessageFeedback}
                          onAddToInsight={m?.disableAnswerActions ? undefined : handleAddToInsights}
                          showAnswerActions={!m?.disableAnswerActions}
                        />
                      )}
                    </div>

                    {m.role === "assistant" &&
                    Array.isArray(m.charts) &&
                    m.charts.some((chart) => canRenderChart(chart)) ? (
                      <div className="rounded-xl border border-border-theme bg-accent-dim/40 p-3 text-xs text-text-primary space-y-2 mr-5 shadow-sm ring-1 ring-[rgba(var(--accent-rgb),0.1)]">
                        <div className="font-semibold text-accent flex items-center gap-1.5">
                          <Sparkles size={12} className="opacity-80" aria-hidden />
                          Insights & visuals
                        </div>
                        <AiChatContextStrip charts={(m.charts || []).filter((chart) => canRenderChart(chart)).slice(0, 3)} kpisSnapshot={[]} maxCharts={3} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-auto flex gap-2 items-stretch shrink-0 pt-3 border-t border-border-theme bg-surface/90 rounded-xl">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Message in plain language…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "var(--surface)",
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSend}
                  disabled={chatLoading}
                  sx={{
                    minHeight: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    minWidth: 84,
                    textTransform: "none",
                    fontWeight: 600,
                    background:
                      "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #2563eb))",
                    boxShadow: "none",
                    "&:hover": { boxShadow: "0 4px 14px rgba(var(--accent-rgb), 0.28)" },
                  }}
                >
                  {chatLoading ? <CircularProgress size={16} color="inherit" /> : "Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GlobalChatbot;
