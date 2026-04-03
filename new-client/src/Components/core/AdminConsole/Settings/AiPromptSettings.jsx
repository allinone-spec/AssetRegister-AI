import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
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
import { fetchPromptConfig, savePromptConfig } from "../../../../Service/ai.service";

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

const SettingsContentShell = ({ embedded, routeName, className, children }) => {
  if (embedded) {
    return (
      <div
        className={`min-h-0 max-h-[calc(90vh-11rem)] overflow-y-auto overflow-x-hidden ${className || ""}`}
      >
        {children}
      </div>
    );
  }
  return (
    <PageLayout routeName={routeName} className={className}>
      {children}
    </PageLayout>
  );
};

const AiPromptSettings = ({ routeName, embedded = false }) => {
  const dispatch = useDispatch();
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
      const data = await fetchPromptConfig();
      const list = data?.sections || [];
      setSections(list);
      const next = {};
      const base = {};
      list.forEach((s) => {
        const v = s.value ?? "";
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
  }, []);

  useEffect(() => {
    dispatch(setHeadingTitle(embedded ? "Settings" : "AI prompt templates"));
  }, [dispatch, embedded]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDraftChange = (id, text) => {
    setDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveSection = async (id) => {
    setSavingId(id);
    try {
      await savePromptConfig({ prompts: { [id]: drafts[id] ?? "" } });
      toast.success("Saved. Re-run Refresh on insight panels to pick up tabular analysis changes the same day.");
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
      await savePromptConfig({ prompts: { [id]: null } });
      setDrafts((prev) => ({ ...prev, [id]: defaultText ?? "" }));
      toast.success("Reset to built-in default.");
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
      <SettingsContentShell
        embedded={embedded}
        routeName={routeName}
        className="!bg-gradient-to-b from-page-bg to-surface"
      >
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-20">
          <CircularProgress size={40} sx={{ color: "var(--accent)" }} />
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary">Loading prompt configuration</p>
            <p className="mt-1 text-xs text-text-faint">Contacting the AI service…</p>
          </div>
        </div>
      </SettingsContentShell>
    );
  }

  return (
    <SettingsContentShell
      embedded={embedded}
      routeName={routeName}
      className="!bg-gradient-to-b from-page-bg/95 via-surface to-accent-dim/25"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-border-theme pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl ai-gradient-header text-white shadow-accent sm:flex">
              <Sparkles size={28} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                AI prompt templates
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-sub">
                Override the system instructions sent to the model for each product flow. Empty text falls back to
                built-in defaults. Updates apply on the next request; cached same-day analysis may need{" "}
                <strong className="font-semibold text-text-primary">Refresh</strong> on an insights panel.
              </p>
            </div>
          </div>
          <Button
            variant="outlined"
            size="medium"
            onClick={() => load("refresh")}
            disabled={refreshing}
            startIcon={
              refreshing ? (
                <CircularProgress size={14} sx={{ color: "var(--accent)" }} />
              ) : (
                <RefreshCw size={16} />
              )
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "12px",
              borderColor: "rgba(var(--accent-rgb), 0.35)",
              color: "var(--accent)",
              px: 2,
              "&:hover": { borderColor: "var(--accent)", bgcolor: "rgba(var(--accent-rgb), 0.06)" },
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
                background:
                  "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #2563eb))",
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
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-faint">Jump to</p>
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
                            ? "border-border-theme bg-accent-dim text-text-primary hover:bg-accent-muted/50"
                            : "border-border-theme bg-surface text-text-primary hover:border-accent-muted hover:bg-accent-dim/40"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent ring-1 ring-border-theme">
                        <SectionIcon id={s.id} className="text-accent" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{s.title}</span>
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-text-faint">
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
                  className={`scroll-mt-24 rounded-2xl border bg-surface shadow-sm ring-1 transition-shadow ${
                    s.isCustom
                      ? "border-border-theme ring-[rgba(var(--accent-rgb),0.12)] shadow-theme"
                      : "border-border-theme ring-[rgba(var(--accent-rgb),0.06)]"
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
                        <ChevronDown size={20} className="text-text-sub" aria-hidden />
                      }
                      sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: 1.5,
                        minHeight: 72,
                        "& .MuiAccordionSummary-content": { my: 1, overflow: "hidden" },
                        bgcolor: s.isCustom ? "rgba(var(--accent-rgb), 0.07)" : "color-mix(in srgb, var(--page-bg) 40%, var(--surface))",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-accent shadow-sm ring-1 ring-border-theme">
                          <SectionIcon id={s.id} />
                        </span>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2 gap-y-1">
                            <span className="rounded-md bg-accent-dim px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-text-sub">
                              {i + 1}
                            </span>
                            <Typography component="span" className="!text-base !font-semibold !text-text-primary">
                              {s.title}
                            </Typography>
                            {dirtyById[s.id] && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                Unsaved
                              </span>
                            )}
                            {s.isCustom && !dirtyById[s.id] && (
                              <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                                Custom saved
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-text-sub">{s.description}</p>
                        </div>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        px: { xs: 2, sm: 2.5 },
                        pb: 2.5,
                        pt: 2,
                        bgcolor: "color-mix(in srgb, var(--page-bg) 35%, var(--surface))",
                      }}
                    >
                      <label className="sr-only" htmlFor={`prompt-textarea-${s.id}`}>
                        {s.title}
                      </label>
                      <div className="relative rounded-xl border border-border-theme bg-surface shadow-inner ring-1 ring-[rgba(var(--accent-rgb),0.08)] focus-within:ring-2 focus-within:ring-[rgba(var(--accent-rgb),0.35)]">
                        <textarea
                          id={`prompt-textarea-${s.id}`}
                          className="w-full min-h-[min(320px,45vh)] resize-y rounded-xl border-0 bg-transparent p-4 text-[13px] font-mono leading-relaxed text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-0 sm:min-h-[280px]"
                          value={drafts[s.id] ?? ""}
                          onChange={(e) => handleDraftChange(s.id, e.target.value)}
                          spellCheck={false}
                          aria-label={s.title}
                          placeholder="Leave empty to use the built-in default for this section."
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-faint">
                        <span className="tabular-nums">
                          {(drafts[s.id] ?? "").length.toLocaleString()} characters
                        </span>
                        <span className="hidden sm:inline">Monospace preview · line breaks preserved</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-theme pt-4">
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
                            background:
                              "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #2563eb))",
                            "&:hover": { boxShadow: "0 6px 16px rgba(var(--accent-rgb), 0.25)" },
                            "&.Mui-disabled": {
                              background: "rgba(148, 163, 184, 0.25)",
                              color: "var(--text-sub)",
                            },
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
                          Reset to default
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
    </SettingsContentShell>
  );
};

export default AiPromptSettings;
