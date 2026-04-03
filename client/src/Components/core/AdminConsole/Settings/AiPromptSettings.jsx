import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  BarChart3,
  Bot,
  ChevronDown,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Table2,
} from "lucide-react";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { fetchPromptConfig, savePromptConfig, saveUserPromptConfig } from "../../../../Service/ai.service";

const SECTION_ICON = {
  admin_console_insights: LayoutDashboard,
  data_console_insights: BarChart3,
  tabular_analysis_system: Table2,
  page_chat_prefix: MessageSquareText,
  global_chat_prefix: Bot,
};

function SectionIcon({ id, className }) {
  const Cmp = SECTION_ICON[id] || FileText;
  return <Cmp className={className} size={20} strokeWidth={1.75} aria-hidden />;
}

const AiPromptSettings = ({ routeName }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const orgId = user?.orgId || "default-org";
  const userId = user?.id || "";
  /** org = shared admin templates; user = your overrides (win over org for your account). */
  const [promptScope, setPromptScope] = useState("org");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  /** Snapshot after last successful load — for dirty detection */
  const [baseline, setBaseline] = useState({});

  const load = useCallback(async (mode = "initial") => {
    const isRefresh = mode === "refresh";
    if (isRefresh) setRefreshing(true);
    else setInitialLoading(true);
    try {
      const scopeUser = promptScope === "user" && userId;
      const data = await fetchPromptConfig(
        scopeUser ? { orgId, userId } : {}
      );
      const list = data?.sections || [];
      setSections(list);
      const next = {};
      const base = {};
      list.forEach((s) => {
        const v = scopeUser ? (s.userPrompt ?? "") : (s.value ?? "");
        next[s.id] = v;
        base[s.id] = v;
      });
      setDrafts(next);
      setBaseline(base);
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not load AI prompts. Is the AI service running?"
      );
      setSections([]);
      setDrafts({});
      setBaseline({});
    } finally {
      if (isRefresh) setRefreshing(false);
      else setInitialLoading(false);
    }
  }, [promptScope, orgId, userId]);

  useEffect(() => {
    dispatch(setHeadingTitle("AI prompt templates"));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDraftChange = (id, text) => {
    setDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveSection = async (id) => {
    setSavingId(id);
    try {
      if (promptScope === "user" && userId) {
        await saveUserPromptConfig({
          orgId,
          userId,
          prompts: { [id]: drafts[id] ?? "" },
        });
        toast.success("Saved your prompt override.");
      } else {
        await savePromptConfig({ prompts: { [id]: drafts[id] ?? "" } });
        toast.success("Saved. Re-run Refresh on insight panels to pick up tabular analysis changes the same day.");
      }
      await load("refresh");
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.message ||
          "Save failed."
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleResetSection = async (id, defaultText) => {
    setSavingId(id);
    try {
      if (promptScope === "user" && userId) {
        await saveUserPromptConfig({ orgId, userId, prompts: { [id]: null } });
        setDrafts((prev) => ({ ...prev, [id]: "" }));
        toast.success("Cleared your override — organization / built-in defaults apply for you.");
      } else {
        await savePromptConfig({ prompts: { [id]: null } });
        setDrafts((prev) => ({ ...prev, [id]: defaultText ?? "" }));
        toast.success("Reset to built-in default.");
      }
      await load("refresh");
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Reset failed.");
    } finally {
      setSavingId(null);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(`prompt-section-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dirtyById = useMemo(() => {
    const out = {};
    sections.forEach((s) => {
      out[s.id] = (drafts[s.id] ?? "") !== (baseline[s.id] ?? "");
    });
    return out;
  }, [sections, drafts, baseline]);

  if (initialLoading) {
    return (
      <PageLayout routeName={routeName} className="!bg-gradient-to-b from-slate-50 to-white">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-20">
          <CircularProgress size={40} sx={{ color: "#7c3aed" }} />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">Loading prompt configuration</p>
            <p className="mt-1 text-xs text-slate-500">Contacting the AI service…</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout routeName={routeName} className="!bg-gradient-to-b from-slate-50/90 via-white to-violet-50/20">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 sm:flex">
              <Sparkles size={28} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                AI prompt templates
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {promptScope === "org"
                  ? "Organization-wide overrides (admin). Empty text falls back to built-in defaults."
                  : "Your personal overrides take effect for your user account on the next AI request (over organization defaults when set)."}
                {" "}
                Cached same-day analysis may need{" "}
                <strong className="font-semibold text-slate-800">Refresh</strong> on an insights panel.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPromptScope("org")}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    promptScope === "org"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Organization prompts
                </button>
                <button
                  type="button"
                  onClick={() => setPromptScope("user")}
                  disabled={!userId}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    promptScope === "user"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  My prompts
                </button>
              </div>
            </div>
          </div>
          <Button
            variant="outlined"
            size="medium"
            onClick={() => load("refresh")}
            disabled={refreshing}
            startIcon={
              refreshing ? (
                <CircularProgress size={14} sx={{ color: "#5b21b6" }} />
              ) : (
                <RefreshCw size={16} />
              )
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "12px",
              borderColor: "#c4b5fd",
              color: "#5b21b6",
              px: 2,
              "&:hover": { borderColor: "#a78bfa", bgcolor: "rgba(139,92,246,0.06)" },
            }}
          >
            Reload
          </Button>
        </header>

        {sections.length === 0 ? (
          <div
            className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-6 py-10 text-center shadow-sm"
            role="status"
          >
            <p className="text-sm font-semibold text-amber-950">No sections returned</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-amber-900/80">
              The AI service did not return any prompt keys. Check that the sidecar is running and reachable, then use
              Reload.
            </p>
            <Button
              variant="contained"
              onClick={() => load("refresh")}
              sx={{
                mt: 4,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                boxShadow: "none",
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
            {/* Sticky nav */}
            <nav
              className="mb-8 lg:mb-0 lg:sticky lg:top-4 lg:self-start"
              aria-label="Prompt sections"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Jump to</p>
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all lg:py-2 ${
                        dirtyById[s.id]
                          ? "border-amber-200/90 bg-amber-50/80 text-amber-950 hover:bg-amber-50"
                          : s.isCustom
                            ? "border-violet-200/80 bg-violet-50/50 text-violet-950 hover:bg-violet-50/80"
                            : "border-slate-200/80 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/30"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-violet-700 ring-1 ring-slate-200/60">
                        <SectionIcon id={s.id} className="text-violet-700" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{s.title}</span>
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {dirtyById[s.id] ? "Unsaved" : s.isCustom ? "Custom" : "Default"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Accordions */}
            <div className="space-y-4 min-w-0">
              {sections.map((s, i) => (
                <article
                  key={s.id}
                  id={`prompt-section-${s.id}`}
                  className={`scroll-mt-24 rounded-2xl border bg-white shadow-sm ring-1 transition-shadow ${
                    s.isCustom
                      ? "border-violet-200/70 ring-violet-100/50 shadow-violet-500/5"
                      : "border-slate-200/80 ring-slate-100/80"
                  } ${dirtyById[s.id] ? "ring-2 ring-amber-200/60 border-amber-200/50" : ""}`}
                >
                  <Accordion
                    defaultExpanded={s.isCustom || dirtyById[s.id]}
                    disableGutters
                    elevation={0}
                    square={false}
                    sx={{
                      borderRadius: "16px !important",
                      overflow: "hidden",
                      background: "transparent",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        <ChevronDown size={20} className="text-slate-500" aria-hidden />
                      }
                      sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: 1.5,
                        minHeight: 72,
                        "& .MuiAccordionSummary-content": { my: 1, overflow: "hidden" },
                        bgcolor: s.isCustom ? "rgba(139, 92, 246, 0.06)" : "rgba(248, 250, 252, 0.9)",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/70">
                          <SectionIcon id={s.id} />
                        </span>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2 gap-y-1">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-500">
                              {i + 1}
                            </span>
                            <Typography component="span" className="!text-base !font-semibold !text-slate-900">
                              {s.title}
                            </Typography>
                            {dirtyById[s.id] && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                Unsaved
                              </span>
                            )}
                            {s.isCustom && !dirtyById[s.id] && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                                Custom saved
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.description}</p>
                          {promptScope === "user" && (s.value || "").trim() ? (
                            <p className="mt-2 max-w-3xl text-[11px] leading-snug text-slate-500">
                              Effective text for your account (preview):{" "}
                              <span className="font-mono text-slate-700">
                                {(s.value || "").slice(0, 280)}
                                {(s.value || "").length > 280 ? "…" : ""}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 2, bgcolor: "#fafafa" }}>
                      <label className="sr-only" htmlFor={`prompt-textarea-${s.id}`}>
                        {s.title}
                      </label>
                      <div className="relative rounded-xl border border-slate-200/90 bg-white shadow-inner ring-1 ring-slate-100/80 focus-within:ring-2 focus-within:ring-violet-400/40">
                        <textarea
                          id={`prompt-textarea-${s.id}`}
                          className="w-full min-h-[min(320px,45vh)] resize-y rounded-xl border-0 bg-transparent p-4 text-[13px] font-mono leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:min-h-[280px]"
                          value={drafts[s.id] ?? ""}
                          onChange={(e) => handleDraftChange(s.id, e.target.value)}
                          spellCheck={false}
                          aria-label={s.title}
                          placeholder={
                            promptScope === "user"
                              ? "Your override only. Leave empty to inherit organization / built-in defaults."
                              : "Leave empty to use the built-in default for this section."
                          }
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="tabular-nums">
                          {(drafts[s.id] ?? "").length.toLocaleString()} characters
                        </span>
                        <span className="hidden sm:inline">Monospace preview · line breaks preserved</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                        <Button
                          variant="contained"
                          size="medium"
                          disabled={savingId === s.id || !dirtyById[s.id]}
                          onClick={() => handleSaveSection(s.id)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: "12px",
                            px: 2.5,
                            boxShadow: "none",
                            background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                            "&:hover": { boxShadow: "0 6px 16px rgba(59,130,246,0.25)" },
                            "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
                          }}
                        >
                          {savingId === s.id ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            "Save section"
                          )}
                        </Button>
                        <Button
                          variant="outlined"
                          size="medium"
                          disabled={savingId === s.id}
                          onClick={() => handleResetSection(s.id, s.defaultText)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: "12px",
                            px: 2,
                            borderColor: "#cbd5e1",
                            color: "#475569",
                            "&:hover": { borderColor: "#94a3b8", bgcolor: "rgba(148,163,184,0.08)" },
                          }}
                        >
                          {promptScope === "user" ? "Clear my override" : "Reset to default"}
                        </Button>
                      </div>
                    </AccordionDetails>
                  </Accordion>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AiPromptSettings;
