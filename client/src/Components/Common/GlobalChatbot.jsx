import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, CircularProgress, MenuItem, Select, TextField, Typography } from "@mui/material";
import { MessageCircle, X } from "lucide-react";
import { clearGlobalChatSession, globalChat } from "../../Service/ai.service";
import { getRequest } from "../../Service/api.service";
import { AiChatContextStrip } from "./AiInsightContent";

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
  const [latestInsight, setLatestInsight] = useState(null);
  const [latestCharts, setLatestCharts] = useState([]);
  const [objects, setObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [jobRows, setJobRows] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

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
      setMessages(Array.isArray(saved.messages) ? saved.messages.slice(-40) : []);
      setLatestInsight(saved.latestInsight || null);
      setLatestCharts(Array.isArray(saved.latestCharts) ? saved.latestCharts : []);
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
          messages: messages.slice(-40),
          latestInsight,
          latestCharts,
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
    messages,
    latestInsight,
    latestCharts,
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
      const res = await getRequest("/table/get/jobNames", false);
      if (res?.status === 200 && Array.isArray(res.data)) {
        setJobRows(res.data);
      } else {
        setJobRows([]);
      }
    } catch (e) {
      setJobRows([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadObjects();
  }, [open, loadObjects]);

  useEffect(() => {
    if (!open || consoleType !== "data" || dataModule !== "reports") return;
    loadJobs();
  }, [open, consoleType, dataModule, loadJobs]);

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
    if (consoleType === "data") {
      if (dataModule === "register" && !resolvedObjectId) return false;
      if (dataModule === "reports" && reportJobName && !resolvedObjectId) return false;
    }
    return true;
  }, [consoleType, dataModule, reportJobName, resolvedObjectId]);

  const scopeSummary = useMemo(() => {
    const objLabel =
      chatObjectId === HEADER_OBJECT
        ? "Current header object"
        : objects.find((o) => String(o.objectId) === String(chatObjectId))?.objectName || "Selected object";
    if (consoleType === "admin") {
      const m = ADMIN_MODULES.find((x) => x.id === adminModule);
      return `${objLabel} · Admin · ${m?.label || adminModule}`;
    }
    const m = DATA_MODULES.find((x) => x.id === dataModule);
    let tail = m?.label || dataModule;
    if (dataModule === "reports" && reportJobName) tail += ` · Job: ${reportJobName}`;
    if (dataModule === "security") {
      const s = SECURITY_SUBS.find((x) => x.id === securitySubModule);
      tail += ` · ${s?.label || securitySubModule}`;
    }
    return `${objLabel} · Data · ${tail}`;
  }, [
    chatObjectId,
    objects,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    securitySubModule,
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
      return `${objTag} · Admin · ${m?.label || adminModule}`;
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
    return parts.join(" · ");
  }, [
    chatObjectId,
    objects,
    consoleType,
    adminModule,
    dataModule,
    reportJobName,
    securitySubModule,
  ]);

  const handleStartChat = () => {
    if (!canStartChat) return;
    setOnboardDone(true);
    setMessages([
      {
        role: "assistant",
        content: `Thanks — I’ve set context to: ${scopeSummary}.\n\nAsk in your own words: summaries, counts, risks, how to navigate, or say “show insights” for KPI-style highlights. I’ll stay grounded in the data we load for this scope.`,
      },
    ]);
  };

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
        messages: newMsgs.slice(-16),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res?.answer || "No response returned." },
      ]);
      setLatestInsight(res?.insight || null);
      setLatestCharts(Array.isArray(res?.charts) ? res.charts : []);
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
    }),
    [user?.orgId, user?.id, consoleType, moduleKeyForApi, location.pathname, contextFilters]
  );

  const handleResetConversation = async () => {
    setMessages([]);
    setLatestInsight(null);
    setLatestCharts([]);
    setOnboardDone(false);
    setChatInput("");
    try {
      await clearGlobalChatSession(clearPayload);
    } catch (e) {
      // local reset still applies
    }
  };

  const handleChangeModule = () => {
    setMessages([]);
    setLatestInsight(null);
    setLatestCharts([]);
    setOnboardDone(false);
    setChatInput("");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open global chatbot"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[1200] rounded-full shadow-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white p-3.5 hover:from-purple-700 hover:to-blue-700 transition"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[1200] w-[420px] max-w-[96vw] max-h-[min(640px,92vh)] flex flex-col bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-3 py-2.5 border-b flex items-start justify-between gap-2 bg-gradient-to-r from-purple-50 to-blue-50 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800 leading-tight">Assistant</div>
              {onboardDone && (
                <span
                  className="mt-1 inline-flex max-w-full items-center rounded-full border border-violet-200/90 bg-white/95 px-2 py-0.5 text-[10px] font-medium leading-tight text-violet-900 shadow-sm"
                  title={scopeSummary}
                >
                  <span className="truncate">{scopeChipLabel}</span>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {onboardDone && (
                <>
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    onClick={handleChangeModule}
                    aria-label="Change context"
                  >
                    Change context
                  </button>
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    onClick={handleResetConversation}
                    aria-label="Reset conversation"
                  >
                    Reset
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setOpen(false)}
                aria-label="Close global chatbot"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!onboardDone ? (
            <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-0">
              <Typography variant="body2" className="text-gray-700 !text-[13px] !leading-snug">
                Hi — I’ll route your questions to the right data. Pick where you’re working (object, console, then
                area). After that, type naturally; I’ll infer what you need.
              </Typography>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">1 · Object</label>
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

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">2 · Console</label>
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

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">3 · Area</label>
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
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Report job (optional)</label>
                  <Select
                    size="small"
                    fullWidth
                    displayEmpty
                    value={reportJobName}
                    disabled={jobsLoading}
                    onChange={(e) => setReportJobName(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All jobs (list context)</em>
                    </MenuItem>
                    {jobRows.map((row) => {
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
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Security data</label>
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

              <Button variant="contained" fullWidth disabled={!canStartChat} onClick={handleStartChat}>
                Start conversation
              </Button>
            </div>
          ) : (
            <div className="p-3 flex flex-col flex-1 min-h-0">
              <div className="max-h-[min(380px,48vh)] overflow-y-auto space-y-2 pr-1 flex-1 min-h-0">
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`rounded-lg p-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-blue-50 border border-blue-100 text-blue-900 ml-6 shadow-sm"
                        : "bg-white border border-slate-200 text-gray-800 mr-6 shadow-sm"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-70 mb-1 font-semibold">
                      {m.role === "user" ? "You" : "Assistant"}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                ))}

                {(latestInsight || (latestCharts && latestCharts.length > 0)) && (
                  <div className="rounded-lg border border-purple-100 bg-purple-50/80 p-2.5 text-xs text-gray-800 space-y-2">
                    <div className="font-semibold text-purple-900">Insights & visuals</div>

                    <AiChatContextStrip
                      charts={latestCharts}
                      kpisSnapshot={latestInsight?.kpis || []}
                      maxCharts={2}
                    />

                    {!!(latestInsight?.trends || []).length && (
                      <div className="rounded border border-blue-100 bg-white p-2">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1">Trends</div>
                        {(latestInsight.trends || []).slice(0, 3).map((t, idx) => (
                          <div key={`t-${idx}`} className="mb-1 last:mb-0">
                            • {t?.text || t?.insight || String(t)}
                          </div>
                        ))}
                      </div>
                    )}

                    {!!(latestInsight?.risks || []).length && (
                      <div className="rounded border border-red-100 bg-white p-2">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1">Risks</div>
                        {(latestInsight.risks || []).slice(0, 3).map((r, idx) => (
                          <div key={`r-${idx}`} className="mb-1 last:mb-0">
                            • {r?.text || r?.insight || String(r)}
                          </div>
                        ))}
                      </div>
                    )}

                    {!!(latestInsight?.recommendations || []).length && (
                      <div className="rounded border border-green-100 bg-white p-2">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1">Recommendations</div>
                        {(latestInsight.recommendations || []).slice(0, 3).map((rec, idx) => (
                          <div key={`rec-${idx}`} className="mb-1 last:mb-0">
                            • {rec?.text || rec?.insight || String(rec)}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>

              <div className="mt-2 flex gap-2 items-stretch shrink-0">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Ask anything in plain language…"
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
                  sx={{ minHeight: "40px", height: "40px" }}
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
