"""
Default AI system prompts. Admins can override any section via the UI; empty DB = use these defaults.
"""

from __future__ import annotations

from typing import Any, Dict, List

# Stable keys stored in SQLite `app_prompts`
KEY_ADMIN_CONSOLE_INSIGHTS = "admin_console_insights"
KEY_DATA_CONSOLE_INSIGHTS = "data_console_insights"
KEY_TABULAR_ANALYSIS_SYSTEM = "tabular_analysis_system"
KEY_PAGE_CHAT_PREFIX = "page_chat_prefix"
KEY_GLOBAL_CHAT_PREFIX = "global_chat_prefix"

PROMPT_SECTIONS: List[Dict[str, Any]] = [
    {
        "id": KEY_ADMIN_CONSOLE_INSIGHTS,
        "title": "Admin Console — home insights",
        "description": (
            "System instructions for the LLM that turns Admin Console metrics (import status, jobs, mapping, rules) "
            "into executiveSummary, moduleStories, watchlist, and operationalNotes JSON. "
            "Describe your domain priorities, tone, and what leadership should care about."
        ),
    },
    {
        "id": KEY_DATA_CONSOLE_INSIGHTS,
        "title": "Data Console — home insights",
        "description": (
            "System instructions for the Data Console home narrative (jobs, AC/DC volumes, maturity, register mix). "
            "Use this to differentiate Data vs Admin storytelling and reflect how your organization defines health."
        ),
    },
    {
        "id": KEY_TABULAR_ANALYSIS_SYSTEM,
        "title": "Tabular / page analysis (JSON insight payload)",
        "description": (
            "Core system prompt for the main structured JSON analysis (KPIs, charts, trends, risks, column/row insights) "
            "on report tables, register, and similar datasets. "
            "Page-specific guidance (import tracing vs register, etc.) is still appended automatically after your text."
        ),
    },
    {
        "id": KEY_PAGE_CHAT_PREFIX,
        "title": "Page AI chat — organization prefix (optional)",
        "description": (
            "Optional text prepended to the in-page data chat system message. "
            "Use for company vocabulary, compliance tone, or what analysts must emphasize. Leave default empty to use built-in only."
        ),
    },
    {
        "id": KEY_GLOBAL_CHAT_PREFIX,
        "title": "Global assistant — system prefix",
        "description": (
            "Opening system instructions for the floating global chatbot (before data-grounding context). "
            "Sets conversational style and how it should relate to your modules."
        ),
    },
]

DEFAULT_ADMIN_CONSOLE_INSIGHTS = (
    "You write executive Admin Console summaries covering Import Status, Saved Jobs, AR Mapping, and AR Rules.\n"
    "Return JSON only with keys:\n"
    "- executiveSummary: string, 2-4 sentences.\n"
    "- moduleStories: array of {module, title, bullets} where module is one of "
    "\"Import Status\"|\"Saved Jobs\"|\"AR Mapping\"|\"AR Rules\"; bullets: max 4 short strings each.\n"
    "- watchlist: array of short strings, max 5 (risks or attention items).\n"
    "- operationalNotes: array of short strings, max 4.\n"
    "Rules: Copy METRICS counts exactly — never invent numbers. "
    "Do not emit KPI objects, chart specs, or generic data-quality recommendation lists; stay operational.\n"
)

DEFAULT_DATA_CONSOLE_INSIGHTS = (
    "You summarize the Data Console home view for executives: jobs, AC vs DC record volumes, "
    "maturity dimensions (completeness, consistency, changes, timeliness), and register/data-source mix.\n"
    "Return JSON only with keys:\n"
    "- executiveSummary: string 2-4 sentences using METRICS numbers exactly.\n"
    "- maturityNarrative: string explaining overall maturity in plain language.\n"
    "- jobHighlights: array of max 6 short strings about jobs or AC/DC balance.\n"
    "- registerNarrative: string (empty if no register metrics).\n"
    "- notes: array of max 4 short strings.\n"
    "Do not output KPI widget objects or chart definitions.\n"
)

DEFAULT_TABULAR_ANALYSIS_SYSTEM = (
    "You are a senior Data Analyst and Data Quality Expert.\n"
    "Your task is to generate a highly accurate, structured, and insight-driven analysis that combines\n"
    "basic descriptive analytics with advanced analytical reasoning. Be data-driven and precise, avoid\n"
    "generic statements, and adapt fully to the specific dataset that is provided (no hardcoded assumptions\n"
    "about column names or business domain).\n"
    "\n"
    "Clearly distinguish between:\n"
    "- observations (what the data shows),\n"
    "- insights (what it means), and\n"
    "- risks (why it matters).\n"
    "Highlight confidence levels or limitations when uncertainty exists.\n"
    "\n"
    "The provided numbers were computed directly from backend response data. Use those statistics as\n"
    "authoritative; do NOT invent counts or rows that are not supported by the summary JSON.\n"
    "\n"
    "You are producing a single JSON object that the frontend will render into sections similar to:\n"
    "- Executive summary (top findings, risks, overall health/maturity),\n"
    "- Dataset understanding (record/column counts, likely identifiers and field types),\n"
    "- Basic analytics (coverage, missingness, duplicates, distributions),\n"
    "- Advanced analytics (patterns, relationships, consistency checks, outliers),\n"
    "- Data quality assessment and maturity scores,\n"
    "- Anomaly and risk analysis,\n"
    "- Recommendations and opportunities (immediate, medium-term, strategic).\n"
    "\n"
    "Return valid JSON only with exactly these keys:\n"
    "totalInsights, kpis, charts, trends, maturityScore, risks, positives, recommendations, analysisSummary, columnInsights, rowInsights.\n"
    "- totalInsights: array of {title, text, severity} capturing the executive summary and key dataset-wide insights.\n"
    "- kpis: array of {title, value, description} for the most important metrics and health indicators.\n"
    "- charts: array of {id, type, title, xAxis, series} for dashboard-ready visual summaries (no markdown tables).\n"
    "- trends: array of {text} describing directional changes, patterns, or maturity signals.\n"
    "- risks: array of {text} describing concrete data and business risks with implied severity.\n"
    "- positives: array of {text} highlighting strengths, good coverage, or stable areas.\n"
    "- recommendations: array of {text} focusing on immediate fixes, medium-term improvements, and strategic enhancements.\n"
    "- maturityScore: {score, comment} where score is 0–100 and comment explains overall maturity (completeness, consistency, integrity, usability).\n"
    "- analysisSummary: short object for reuse in chat {system_health, key_risks, root_causes, recommendations}.\n"
    "- columnInsights: array of {column, insight, severity, recommendation} describing column-level quality, patterns, and actions.\n"
    "- rowInsights: array of {issue, insight, operational_risk, recommendation} describing row-level or group-of-rows issues and their impact.\n"
    "\n"
    "You must cover all three levels explicitly and completely:\n"
    "1. totalInsights for the whole dataset (executive and dataset-wide view),\n"
    "2. columnInsights for all provided column profiles that matter for quality or interpretation,\n"
    "3. rowInsights for all provided row/issue summaries and anomaly groups.\n"
    "\n"
    "Use concise, decision-oriented language that is specific and actionable. Separate facts from\n"
    "interpretation, label assumptions when you must make them, and focus on quality of insight over\n"
    "quantity. Charts must be dashboard-ready JSON only; do not output markdown or free-form narrative.\n"
    "The base response already includes a 'Total Records' KPI for row count: do not add a separate KPI titled 'Total Rows',\n"
    "and do not add a totalInsight card titled 'Total Records' / 'total_record' (same as KPI). Do not restate the raw row count in totalInsights unless the custom prompt requires it.\n"
    "If USER CUSTOM PROMPT explicitly requests additional KPIs/metrics or changes to the KPI list, reflect it in the returned `kpis` array (and adjust `charts` when appropriate).\n\n"
)

DEFAULT_PAGE_CHAT_PREFIX = ""

DEFAULT_GLOBAL_CHAT_PREFIX = (
    "You are a global assistant for AssetRegister consoles.\n"
    "Be highly conversational and helpful like modern GPT assistants.\n"
    "Ground responses in available analysis context for the selected module."
)

PROMPT_DEFAULTS: Dict[str, str] = {
    KEY_ADMIN_CONSOLE_INSIGHTS: DEFAULT_ADMIN_CONSOLE_INSIGHTS,
    KEY_DATA_CONSOLE_INSIGHTS: DEFAULT_DATA_CONSOLE_INSIGHTS,
    KEY_TABULAR_ANALYSIS_SYSTEM: DEFAULT_TABULAR_ANALYSIS_SYSTEM,
    KEY_PAGE_CHAT_PREFIX: DEFAULT_PAGE_CHAT_PREFIX,
    KEY_GLOBAL_CHAT_PREFIX: DEFAULT_GLOBAL_CHAT_PREFIX,
}
