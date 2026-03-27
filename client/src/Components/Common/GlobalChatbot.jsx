import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
import { MessageCircle, Sparkles, X } from "lucide-react";
import { clearGlobalChatSession, fetchAiModels, globalChat } from "../../Service/ai.service";
import { resolveAiModelSelection } from "../../Utils/resolveAiModelSelection";
import { getRequest } from "../../Service/api.service";
import { getRequest as getAdminRequest } from "../../Service/Console.service";
import AiChatAssistantMessage from "./AiChatAssistantMessage";
import { normalizeKpiTitle } from "../../Utils/aiChatKpiExtract";
import { saveGlobalChatInsightNav } from "../../Utils/globalChatInsightNav";
import { setSelectedObject, setSelectedObjectName } from "../../redux/Slices/ObjectSelection";

const HEADER_OBJECT = "__header__";

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

const GLOBAL_CHATBOT_STATE_KEY = "global-chatbot-state-v2";

const GlobalChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const selectedObject = useSelector((state) => state.selectedObject?.value);

  const [open, setOpen] = useState(false);
  const [onboardDone, setOnboardDone] = useState(false);
  const [consoleType, setConsoleType] = useState(
    location.pathname.includes("/admin-console") ? "admin" : "data"
  );
  const [chatObjectId, setChatObjectId] = useState(HEADER_OBJECT);
  const [dataModule, setDataModule] = useState("dashboards");
  const [adminModule, setAdminModule] = useState("dashboards");
  const [reportJobName, setReportJobName] = useState("");
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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(GLOBAL_CHATBOT_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setOpen(Boolean(saved.open));
      setOnboardDone(Boolean(saved.onboardDone));
      setConsoleType(
        saved.consoleType || (location.pathname.includes("/admin-console") ? "admin" : "data")
      );
      setChatObjectId(saved.chatObjectId ?? HEADER_OBJECT);
      setDataModule(saved.dataModule || "dashboards");
      setAdminModule(saved.adminModule || "dashboards");
      setReportJobName(saved.reportJobName || "");
      setSecuritySubModule(saved.securitySubModule || "users");
      setSelectedModelId(saved.selectedModelId || "");
      setKpiTitleActions(saved.kpiTitleActions || {});
      setMessages(Array.isArray(saved.messages) ? saved.messages.slice(-40) : []);
    } catch (e) {
      // ignore invalid cache
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        GLOBAL_CHATBOT_STATE_KEY,
        JSON.stringify({
          open,
          onboardDone,
          consoleType,
          chatObjectId,
          dataModule,
          adminModule,
          reportJobName,
          securitySubModule,
          selectedModelId,
          kpiTitleActions,
          messages: messages.slice(-40).map((m) => ({
            role: m.role,
            content: m.content,
            enableKpiPanel: m.enableKpiPanel,
          })),
        })
      );
    } catch (e) {
      // ignore
    }
  }, [
    open,
    onboardDone,
    consoleType,
    chatObjectId,
    dataModule,
    adminModule,
    reportJobName,
    securitySubModule,
    selectedModelId,
    kpiTitleActions,
    messages,
  ]);

  const resolvedObjectId = useMemo(() => {
    if (chatObjectId === HEADER_OBJECT) return selectedObject ?? null;
    return chatObjectId || null;
  }, [chatObjectId, selectedObject]);

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
    if (dataModule === "reports" && reportJobName) {
      out.reportJobName = reportJobName;
    }
    if (dataModule === "security") {
      out.securitySubModule = securitySubModule;
    }
    return out;
  }, [
    resolvedObjectId,
    user?.email,
    user?.userName,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    securitySubModule,
  ]);

  const moduleKeyForApi = consoleType === "data" ? dataModule : adminModule;

  const canStartChat = useMemo(() => {
    if (modelsLoading) return false;
    if (consoleType === "data") {
      if (dataModule === "register" && !resolvedObjectId) return false;
      if (dataModule === "reports" && reportJobName && !resolvedObjectId) return false;
    }
    return true;
  }, [modelsLoading, consoleType, dataModule, reportJobName, resolvedObjectId]);

  const scopeSummary = useMemo(() => {
    const objLabel =
      chatObjectId === HEADER_OBJECT
        ? "Current header object"
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
    if (dataModule === "reports" && reportJobName) tail += ` · Job: ${reportJobName}`;
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
    securitySubModule,
    selectedModelId,
    aiModels,
  ]);

  /** Compact label for header chip; full sentence in title tooltip */
  const scopeChipLabel = useMemo(() => {
    const objTag =
      chatObjectId === HEADER_OBJECT
        ? "Header object"
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
    if (dataModule === "reports" && reportJobName) {
      const jn = reportJobName.length > 18 ? `${reportJobName.slice(0, 16)}…` : reportJobName;
      parts.push(jn);
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
    securitySubModule,
    selectedModelId,
    aiModels,
  ]);

  const handleStartChat = () => {
    if (!canStartChat) return;
    setOnboardDone(true);
    setMessages([
      {
        role: "assistant",
        content: `I’m ready with this context: ${scopeSummary}.\n\nAsk naturally. You can ask for summaries, trends, risks, comparisons, KPIs, visuals, or next actions, and I’ll stay grounded in the data available for this scope.`,
        enableKpiPanel: false,
      },
    ]);
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

  const insightTargetRoute = useMemo(() => {
    if (consoleType !== "data") return "";
    if (dataModule === "reports") {
      return reportJobName
        ? `/data-console/reports/original-source/jobs/${reportJobName}`
        : "/data-console/reports/original-source";
    }
    if (dataModule === "register") return "/data-console/register/detailed";
    return "";
  }, [consoleType, dataModule, reportJobName]);

  const handleGoToInsightPanel = useCallback(
    (selectedKpis) => {
      const route = insightTargetRoute;
      if (!route || !Array.isArray(selectedKpis) || selectedKpis.length === 0) return;
      const matchedJobRow =
        dataModule === "reports" && reportJobName
          ? (filteredJobRows.find((row) => String(row?.jobName || "").trim() === String(reportJobName).trim()) ||
            jobRows.find((row) => String(row?.jobName || "").trim() === String(reportJobName).trim()) ||
            null)
          : null;
      const objectName =
        chatObjectId === HEADER_OBJECT
          ? objects.find((o) => String(o.objectId) === String(selectedObject))?.objectName || ""
          : objects.find((o) => String(o.objectId) === String(chatObjectId))?.objectName || "";

      if (resolvedObjectId != null && String(resolvedObjectId).trim() !== "") {
        dispatch(setSelectedObject(String(resolvedObjectId)));
        if (objectName) dispatch(setSelectedObjectName(objectName));
        localStorage.setItem("selectedObject", String(resolvedObjectId));
        if (objectName) localStorage.setItem("selectedObjectName", objectName);
      }

      saveGlobalChatInsightNav({
        route,
        objectId: resolvedObjectId,
        objectName,
        kpis: selectedKpis.map((x) => x.title).filter(Boolean),
      });
      setOpen(false);
      navigate(route, matchedJobRow ? { state: matchedJobRow } : undefined);
    },
    [
      insightTargetRoute,
      dataModule,
      reportJobName,
      filteredJobRows,
      jobRows,
      chatObjectId,
      objects,
      selectedObject,
      resolvedObjectId,
      dispatch,
      navigate,
    ],
  );

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
        userId: user?.id || localStorage.getItem("user-id") || "anonymous",
        consoleType,
        moduleKey: moduleKeyForApi,
        route: location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
        contextFilters,
        modelId: selectedModelId || undefined,
        messages: newMsgs.slice(-16),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res?.answer || "No response returned.",
          insight: res?.insight || null,
          charts: Array.isArray(res?.charts) ? res.charts : [],
          kpisSnapshot: Array.isArray(res?.insight?.kpis) ? res.insight.kpis : [],
          enableKpiPanel: true,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
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
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearPayload = useMemo(
    () => ({
      orgId: user?.orgId || "default-org",
      userId: user?.id || localStorage.getItem("user-id") || "anonymous",
      consoleType,
      moduleKey: moduleKeyForApi,
      route: location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
      contextFilters,
      modelId: selectedModelId || undefined,
    }),
    [user?.orgId, user?.id, consoleType, moduleKeyForApi, location.pathname, contextFilters, selectedModelId]
  );

  const handleResetConversation = async () => {
    setMessages([]);
    setOnboardDone(false);
    setChatInput("");
    setKpiTitleActions({});
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
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open assistant — cross-console chat"
          title="Open assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[1200] group flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg shadow-violet-500/25 bg-gradient-to-r from-violet-600 to-indigo-600 text-white ring-2 ring-white/90 hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-violet-500/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 transition-all"
        >
          <MessageCircle size={20} strokeWidth={2} className="shrink-0 opacity-95" aria-hidden />
          <span className="text-sm font-semibold pr-1 max-sm:hidden">Assistant</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
            <Sparkles size={18} strokeWidth={1.75} aria-hidden />
          </span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-[1200] w-[420px] max-w-[96vw] max-h-[min(640px,92vh)] flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 overflow-hidden ring-1 ring-slate-900/5"
          role="dialog"
          aria-label="Global assistant"
        >
          <div className="px-3.5 py-3 border-b border-white/10 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shrink-0 shadow-sm">
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
            <div className="mt-2 text-[11px] text-violet-100/90 leading-snug">
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
            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 bg-gradient-to-b from-slate-50/80 to-white">
              <Typography variant="body2" className="text-slate-700 !text-[13px] !leading-relaxed">
                Choose <strong>object</strong>, <strong>console</strong>, <strong>module</strong>, and (when available){" "}
                <strong>model</strong> so answers match where you’re working. Then chat in plain language.
              </Typography>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">1 · Object</label>
                <Select
                  size="small"
                  fullWidth
                  value={chatObjectId}
                  disabled={objectsLoading}
                  onChange={(e) => setChatObjectId(e.target.value)}
                >
                  <MenuItem value={HEADER_OBJECT}>Use object from header</MenuItem>
                  {objects.map((obj) => (
                    <MenuItem key={obj.objectId} value={String(obj.objectId)}>
                      {obj.objectName || obj.objectId}
                    </MenuItem>
                  ))}
                </Select>
                {objectsLoading && (
                  <div className="text-[10px] text-gray-500">Loading objects…</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">2 · Console</label>
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
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">3 · Module</label>
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
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">4 · Job name</label>
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
                  {jobsLoading && <div className="text-[10px] text-gray-500">Loading jobs…</div>}
                </div>
              )}

              {consoleType === "data" && dataModule === "security" && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">4 · Security module</label>
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">4 · Model</label>
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
                  {modelsLoading && <div className="text-[10px] text-gray-500">Refreshing models…</div>}
                </div>
              )}

              {consoleType === "data" && dataModule === "register" && !resolvedObjectId && (
                <Typography variant="caption" className="text-amber-800 block">
                  Choose a specific object (not only the header) if the header has no object — Register needs an
                  object to load rows.
                </Typography>
              )}
              {consoleType === "data" && dataModule === "reports" && reportJobName && !resolvedObjectId && (
                <Typography variant="caption" className="text-amber-800 block">
                  Pick an object (or set the header object) to analyze a specific job’s table.
                </Typography>
              )}

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
                  background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                  "&:hover": { boxShadow: "0 6px 20px rgba(124,58,237,0.4)" },
                }}
              >
                Start conversation
              </Button>
            </div>
          ) : (
            <div className="p-3 flex flex-col flex-1 min-h-0 bg-slate-50/40">
              <div className="max-h-[min(380px,48vh)] overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-0 [scrollbar-width:thin]">
                {messages.map((m, i) => (
                  <div key={`${m.role}-${i}`} className="space-y-2">
                    <div
                      className={`rounded-xl p-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-sky-50 to-blue-50/90 border border-sky-200/70 text-sky-950 ml-5 shadow-sm"
                          : "bg-white border border-slate-200/90 text-slate-800 mr-5 shadow-sm"
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
                          onGoToInsightPanel={handleGoToInsightPanel}
                        />
                      )}
                    </div>

                    {m.role === "assistant" && (m.insight || (m.charts && m.charts.length > 0)) ? (
                      <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white p-3 text-xs text-slate-800 space-y-2 mr-5 shadow-sm ring-1 ring-violet-100/50">
                        <div className="font-semibold text-violet-900 flex items-center gap-1.5">
                          <Sparkles size={12} className="opacity-80" aria-hidden />
                          Insights & visuals
                        </div>

                        {!!(m.insight?.trends || []).length && (
                          <div className="rounded-lg border border-sky-100 bg-white/95 p-2 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-700 mb-1">Trends</div>
                            {(m.insight.trends || []).slice(0, 3).map((t, idx) => (
                              <div key={`t-${i}-${idx}`} className="mb-1 last:mb-0">
                                • {t?.text || t?.insight || String(t)}
                              </div>
                            ))}
                          </div>
                        )}

                        {!!(m.insight?.risks || []).length && (
                          <div className="rounded-lg border border-red-100 bg-white/95 p-2 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-700 mb-1">Risks</div>
                            {(m.insight.risks || []).slice(0, 3).map((r, idx) => (
                              <div key={`r-${i}-${idx}`} className="mb-1 last:mb-0">
                                • {r?.text || r?.insight || String(r)}
                              </div>
                            ))}
                          </div>
                        )}

                        {!!(m.insight?.recommendations || []).length && (
                          <div className="rounded-lg border border-emerald-100 bg-white/95 p-2 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-700 mb-1">Recommendations</div>
                            {(m.insight.recommendations || []).slice(0, 3).map((rec, idx) => (
                              <div key={`rec-${i}-${idx}`} className="mb-1 last:mb-0">
                                • {rec?.text || rec?.insight || String(rec)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2 items-stretch shrink-0 pt-1 border-t border-slate-200/80">
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
                      backgroundColor: "#fff",
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
                    background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                    boxShadow: "none",
                    "&:hover": { boxShadow: "0 4px 14px rgba(59,130,246,0.25)" },
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
