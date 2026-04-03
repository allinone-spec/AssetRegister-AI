import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import {
  clearUserApiKeys,
  fetchAiAdminSettings,
  fetchUserApiKeys,
  saveAiAdminSettings,
  saveUserApiKeys,
} from "../../../../Service/ai.service";

const splitListText = (text) =>
  String(text || "")
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);

const listToText = (list) => (Array.isArray(list) ? list.join("\n") : "");

const SettingsContentShell = ({ embedded, routeName, children }) => {
  if (embedded) {
    return (
      <div className="min-h-0 max-h-[calc(90vh-11rem)] overflow-y-auto overflow-x-hidden">{children}</div>
    );
  }
  return <PageLayout routeName={routeName}>{children}</PageLayout>;
};

/** Grouped card with a colored accent bar and API id prefix hint. */
function ProviderBlock({ title, idPrefix, hint, accentClass, children }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 border-l-4 ${accentClass}`}
    >
      <header className="mb-4 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          <code className="max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
            {idPrefix}
          </code>
        </div>
        {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

const AiModelSettings = ({ routeName, embedded = false }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const orgId = user?.orgId || "default-org";
  const userId = user?.id || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUserKeys, setSavingUserKeys] = useState(false);
  const [models, setModels] = useState([]);
  /** Typed API key inputs — always password; cleared after save (server never returns plaintext). */
  const [keyInputs, setKeyInputs] = useState({
    azure: "",
    openai: "",
    gemini: "",
    anthropic: "",
  });
  const [userKeyInputs, setUserKeyInputs] = useState({
    azure: "",
    openai: "",
    gemini: "",
    anthropic: "",
  });
  const [form, setForm] = useState({
    azureOpenAiEndpoint: "",
    azureOpenAiApiVersion: "",
    openAiBaseUrl: "",
    azureDeploymentsText: "",
    openAiModelsText: "",
    geminiModelsText: "",
    anthropicModelsText: "",
    defaultAnalysisModelId: "",
    defaultChatModelId: "",
  });
  const [meta, setMeta] = useState({
    azureMasked: "",
    openaiMasked: "",
    geminiMasked: "",
    anthropicMasked: "",
    hasAzure: false,
    hasOpenai: false,
    hasGemini: false,
    hasAnthropic: false,
  });
  const [userKeyMeta, setUserKeyMeta] = useState({
    azure_openai: { hasOverride: false, masked: "" },
    openai: { hasOverride: false, masked: "" },
    gemini: { hasOverride: false, masked: "" },
    anthropic: { hasOverride: false, masked: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAiAdminSettings();
      const list = Array.isArray(data?.models) ? data.models : [];
      setModels(list);
      setMeta({
        azureMasked: data?.azureOpenAiApiKeyMasked || "",
        openaiMasked: data?.openAiApiKeyMasked || "",
        geminiMasked: data?.geminiApiKeyMasked || "",
        anthropicMasked: data?.anthropicApiKeyMasked || "",
        hasAzure: Boolean(data?.hasAzureOpenAiApiKey),
        hasOpenai: Boolean(data?.hasOpenAiApiKey),
        hasGemini: Boolean(data?.hasGeminiApiKey),
        hasAnthropic: Boolean(data?.hasAnthropicApiKey),
      });
      setKeyInputs({ azure: "", openai: "", gemini: "", anthropic: "" });
      setForm((p) => ({
        ...p,
        azureOpenAiEndpoint: data?.azureOpenAiEndpoint || "",
        azureOpenAiApiVersion: data?.azureOpenAiApiVersion || "",
        openAiBaseUrl: data?.openAiBaseUrl || "",
        azureDeploymentsText: listToText(data?.azureDeployments || []),
        openAiModelsText: listToText(data?.openAiModels || []),
        geminiModelsText: listToText(data?.geminiModels || []),
        anthropicModelsText: listToText(data?.anthropicModels || []),
        defaultAnalysisModelId: data?.defaultAnalysisModelId || "",
        defaultChatModelId: data?.defaultChatModelId || "",
      }));
      if (userId) {
        const uk = await fetchUserApiKeys(orgId, userId);
        const prov = uk?.providers || {};
        setUserKeyMeta({
          azure_openai: prov.azure_openai || { hasOverride: false, masked: "" },
          openai: prov.openai || { hasOverride: false, masked: "" },
          gemini: prov.gemini || { hasOverride: false, masked: "" },
          anthropic: prov.anthropic || { hasOverride: false, masked: "" },
        });
        setUserKeyInputs({ azure: "", openai: "", gemini: "", anthropic: "" });
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed to load AI model settings.");
    } finally {
      setLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    dispatch(setHeadingTitle(embedded ? "Settings" : "AI model settings"));
  }, [dispatch, embedded]);

  useEffect(() => {
    load();
  }, [load]);

  const modelOptions = useMemo(() => (Array.isArray(models) ? models : []), [models]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveAiAdminSettings({
        azureOpenAiApiKey: keyInputs.azure.trim() || undefined,
        openAiApiKey: keyInputs.openai.trim() || undefined,
        geminiApiKey: keyInputs.gemini.trim() || undefined,
        anthropicApiKey: keyInputs.anthropic.trim() || undefined,
        azureOpenAiEndpoint: form.azureOpenAiEndpoint,
        azureOpenAiApiVersion: form.azureOpenAiApiVersion,
        openAiBaseUrl: form.openAiBaseUrl,
        azureDeployments: splitListText(form.azureDeploymentsText),
        openAiModels: splitListText(form.openAiModelsText),
        geminiModels: splitListText(form.geminiModelsText),
        anthropicModels: splitListText(form.anthropicModelsText),
        defaultAnalysisModelId: form.defaultAnalysisModelId || "",
        defaultChatModelId: form.defaultChatModelId || "",
      });
      toast.success("AI settings saved. Keys are stored encrypted on the AI server.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveServerKey = async (which) => {
    const payload = {};
    if (which === "azure") payload.clearAzureOpenAiApiKey = true;
    if (which === "openai") payload.clearOpenAiApiKey = true;
    if (which === "gemini") payload.clearGeminiApiKey = true;
    if (which === "anthropic") payload.clearAnthropicApiKey = true;
    setSaving(true);
    try {
      await saveAiAdminSettings(payload);
      toast.success("Saved key removed.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Remove failed.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveUserKeys = async () => {
    if (!userId) {
      toast.error("Not signed in.");
      return;
    }
    setSavingUserKeys(true);
    try {
      await saveUserApiKeys({
        orgId,
        userId,
        azureOpenAiApiKey: userKeyInputs.azure.trim() || undefined,
        openAiApiKey: userKeyInputs.openai.trim() || undefined,
        geminiApiKey: userKeyInputs.gemini.trim() || undefined,
        anthropicApiKey: userKeyInputs.anthropic.trim() || undefined,
      });
      toast.success("Your API keys saved (encrypted). They override defaults for your account.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Save failed.");
    } finally {
      setSavingUserKeys(false);
    }
  };

  const onLoadDefaultUserKeys = async () => {
    if (!userId) return;
    setSavingUserKeys(true);
    try {
      await clearUserApiKeys({ orgId, userId });
      toast.success("Your overrides cleared. The AI service will use default keys.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed.");
    } finally {
      setSavingUserKeys(false);
    }
  };

  if (loading) {
    return (
      <SettingsContentShell embedded={embedded} routeName={routeName}>
        <div className="flex min-h-[45vh] items-center justify-center">
          <CircularProgress sx={{ color: "var(--accent)" }} />
        </div>
      </SettingsContentShell>
    );
  }

  return (
    <SettingsContentShell embedded={embedded} routeName={routeName}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold text-text-primary">AI Model</h1>
        <p className="mt-2 text-sm text-text-sub">
          Default provider keys are stored <strong className="font-semibold">encrypted</strong> on the AI server and are
          never returned in plaintext to the browser. Type a new key only to replace the saved one. Model ids use the
          prefix shown on each card (e.g. <code className="font-mono text-xs">azure::gpt-4o-mini</code>).
        </p>

        <div className="mt-8 space-y-8">
          <ProviderBlock
            title="Microsoft Azure OpenAI"
            idPrefix="azure::<deployment-name>"
            hint="Use your Azure OpenAI resource endpoint, API version, and deployment names that exist in that resource."
            accentClass="border-l-blue-600"
          >
            <div className="md:col-span-2">
              <TextField
                label="API key"
                type="password"
                autoComplete="new-password"
                value={keyInputs.azure}
                onChange={(e) => setKeyInputs((p) => ({ ...p, azure: e.target.value }))}
                fullWidth
                size="small"
                placeholder={meta.hasAzure ? "Enter new key to replace saved key" : "Paste API key"}
                helperText={
                  meta.hasAzure
                    ? `Saved (masked): ${meta.azureMasked} — leave blank to keep, or replace above`
                    : "No key saved in DB yet (.env may still supply one on the server)"
                }
              />
              {meta.hasAzure ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-rose-700 underline"
                  onClick={() => onRemoveServerKey("azure")}
                >
                  Remove saved Azure key from server
                </button>
              ) : null}
            </div>
            <TextField
              label="Endpoint"
              value={form.azureOpenAiEndpoint}
              onChange={(e) => setForm((p) => ({ ...p, azureOpenAiEndpoint: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="API version"
              value={form.azureOpenAiApiVersion}
              onChange={(e) => setForm((p) => ({ ...p, azureOpenAiApiVersion: e.target.value }))}
              fullWidth
              size="small"
            />
            <div className="md:col-span-2">
              <TextField
                label="Deployments"
                value={form.azureDeploymentsText}
                onChange={(e) => setForm((p) => ({ ...p, azureDeploymentsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                helperText="One deployment name per line or comma-separated."
              />
            </div>
          </ProviderBlock>

          <ProviderBlock
            title="OpenAI (platform API)"
            idPrefix="openai::<model-id>"
            hint="Standard OpenAI API. Set the base URL if you use a proxy or compatible endpoint; model ids must match what that endpoint accepts."
            accentClass="border-l-emerald-600"
          >
            <div className="md:col-span-2">
              <TextField
                label="API key"
                type="password"
                autoComplete="new-password"
                value={keyInputs.openai}
                onChange={(e) => setKeyInputs((p) => ({ ...p, openai: e.target.value }))}
                fullWidth
                size="small"
                placeholder={meta.hasOpenai ? "Enter new key to replace saved key" : "Paste API key"}
                helperText={
                  meta.hasOpenai
                    ? `Saved (masked): ${meta.openaiMasked}`
                    : "No key saved in DB yet (.env may still supply one on the server)"
                }
              />
              {meta.hasOpenai ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-rose-700 underline"
                  onClick={() => onRemoveServerKey("openai")}
                >
                  Remove saved OpenAI key from server
                </button>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Base URL"
                value={form.openAiBaseUrl}
                onChange={(e) => setForm((p) => ({ ...p, openAiBaseUrl: e.target.value }))}
                fullWidth
                size="small"
                placeholder="https://api.openai.com/v1"
                helperText="Default is https://api.openai.com/v1 when empty."
              />
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Models"
                value={form.openAiModelsText}
                onChange={(e) => setForm((p) => ({ ...p, openAiModelsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                helperText="e.g. gpt-4o-mini, gpt-5-mini — one per line or comma-separated."
              />
            </div>
          </ProviderBlock>

          <ProviderBlock
            title="Google Gemini"
            idPrefix="gemini::<model-id>"
            hint="Google AI Studio / Gemini API key. Model ids are the API model names (e.g. gemini-2.5-pro)."
            accentClass="border-l-amber-500"
          >
            <div className="md:col-span-2">
              <TextField
                label="API key"
                type="password"
                autoComplete="new-password"
                value={keyInputs.gemini}
                onChange={(e) => setKeyInputs((p) => ({ ...p, gemini: e.target.value }))}
                fullWidth
                size="small"
                placeholder={meta.hasGemini ? "Enter new key to replace saved key" : "Paste API key"}
                helperText={
                  meta.hasGemini
                    ? `Saved (masked): ${meta.geminiMasked}`
                    : "No key saved in DB yet (.env may still supply one on the server)"
                }
              />
              {meta.hasGemini ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-rose-700 underline"
                  onClick={() => onRemoveServerKey("gemini")}
                >
                  Remove saved Gemini key from server
                </button>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Models"
                value={form.geminiModelsText}
                onChange={(e) => setForm((p) => ({ ...p, geminiModelsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                helperText="e.g. gemini-2.5-pro, gemini-2.0-flash"
              />
            </div>
          </ProviderBlock>

          <ProviderBlock
            title="Anthropic Claude"
            idPrefix="anthropic::<model-id>"
            hint="Anthropic API key for Claude. Model ids must match your account (e.g. claude-sonnet-4-6)."
            accentClass="border-l-orange-600"
          >
            <div className="md:col-span-2">
              <TextField
                label="API key"
                type="password"
                autoComplete="new-password"
                value={keyInputs.anthropic}
                onChange={(e) => setKeyInputs((p) => ({ ...p, anthropic: e.target.value }))}
                fullWidth
                size="small"
                placeholder={meta.hasAnthropic ? "Enter new key to replace saved key" : "Paste API key"}
                helperText={
                  meta.hasAnthropic
                    ? `Saved (masked): ${meta.anthropicMasked}`
                    : "No key saved in DB yet (.env may still supply one on the server)"
                }
              />
              {meta.hasAnthropic ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-rose-700 underline"
                  onClick={() => onRemoveServerKey("anthropic")}
                >
                  Remove saved Anthropic key from server
                </button>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <TextField
                label="Models"
                value={form.anthropicModelsText}
                onChange={(e) => setForm((p) => ({ ...p, anthropicModelsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                helperText="e.g. claude-sonnet-4-6, claude-haiku-4-5-20251001"
              />
            </div>
          </ProviderBlock>

          {userId ? (
            <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm ring-1 ring-violet-100/80 border-l-4 border-l-violet-600">
              <header className="mb-4 border-b border-violet-200/80 pb-3">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Your API keys (optional)</h2>
                <p className="mt-1 text-xs text-slate-600">
                  If set, these override the default keys above for <strong>your</strong> user only. Stored encrypted on
                  the AI server. Use “Use default keys” to clear your overrides and fall back to server defaults.
                </p>
              </header>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <TextField
                    label="Azure OpenAI API key (yours)"
                    type="password"
                    autoComplete="new-password"
                    value={userKeyInputs.azure}
                    onChange={(e) => setUserKeyInputs((p) => ({ ...p, azure: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder={
                      userKeyMeta.azure_openai?.hasOverride ? "Enter new key to replace" : "Optional override"
                    }
                    helperText={
                      userKeyMeta.azure_openai?.hasOverride
                        ? `Saved (masked): ${userKeyMeta.azure_openai.masked}`
                        : "Not set — using server default"
                    }
                  />
                  {userKeyMeta.azure_openai?.hasOverride ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-rose-700 underline"
                      onClick={() => saveUserApiKeys({ orgId, userId, clearAzureOpenAiApiKey: true }).then(() => load())}
                    >
                      Remove my Azure override
                    </button>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <TextField
                    label="OpenAI API key (yours)"
                    type="password"
                    autoComplete="new-password"
                    value={userKeyInputs.openai}
                    onChange={(e) => setUserKeyInputs((p) => ({ ...p, openai: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder={userKeyMeta.openai?.hasOverride ? "Enter new key to replace" : "Optional override"}
                    helperText={
                      userKeyMeta.openai?.hasOverride
                        ? `Saved (masked): ${userKeyMeta.openai.masked}`
                        : "Not set — using server default"
                    }
                  />
                  {userKeyMeta.openai?.hasOverride ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-rose-700 underline"
                      onClick={() => saveUserApiKeys({ orgId, userId, clearOpenAiApiKey: true }).then(() => load())}
                    >
                      Remove my OpenAI override
                    </button>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <TextField
                    label="Gemini API key (yours)"
                    type="password"
                    autoComplete="new-password"
                    value={userKeyInputs.gemini}
                    onChange={(e) => setUserKeyInputs((p) => ({ ...p, gemini: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder={userKeyMeta.gemini?.hasOverride ? "Enter new key to replace" : "Optional override"}
                    helperText={
                      userKeyMeta.gemini?.hasOverride
                        ? `Saved (masked): ${userKeyMeta.gemini.masked}`
                        : "Not set — using server default"
                    }
                  />
                  {userKeyMeta.gemini?.hasOverride ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-rose-700 underline"
                      onClick={() => saveUserApiKeys({ orgId, userId, clearGeminiApiKey: true }).then(() => load())}
                    >
                      Remove my Gemini override
                    </button>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <TextField
                    label="Anthropic API key (yours)"
                    type="password"
                    autoComplete="new-password"
                    value={userKeyInputs.anthropic}
                    onChange={(e) => setUserKeyInputs((p) => ({ ...p, anthropic: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder={
                      userKeyMeta.anthropic?.hasOverride ? "Enter new key to replace" : "Optional override"
                    }
                    helperText={
                      userKeyMeta.anthropic?.hasOverride
                        ? `Saved (masked): ${userKeyMeta.anthropic.masked}`
                        : "Not set — using server default"
                    }
                  />
                  {userKeyMeta.anthropic?.hasOverride ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-rose-700 underline"
                      onClick={() => saveUserApiKeys({ orgId, userId, clearAnthropicApiKey: true }).then(() => load())}
                    >
                      Remove my Anthropic override
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="contained" size="small" disabled={savingUserKeys} onClick={onSaveUserKeys}>
                  {savingUserKeys ? <CircularProgress size={16} /> : "Save my API keys"}
                </Button>
                <Button variant="outlined" size="small" disabled={savingUserKeys} onClick={onLoadDefaultUserKeys}>
                  Use default keys (clear my overrides)
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm ring-1 ring-slate-900/5 border-l-4 border-l-slate-500">
            <header className="mb-4 border-b border-slate-200/80 pb-3">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Defaults</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pre-selected model when the UI does not send a specific model (Auto picks a configured provider).
              </p>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormControl fullWidth size="small">
                <InputLabel id="ai-default-analysis-label">Default analysis model</InputLabel>
                <Select
                  labelId="ai-default-analysis-label"
                  label="Default analysis model"
                  value={form.defaultAnalysisModelId}
                  onChange={(e) => setForm((p) => ({ ...p, defaultAnalysisModelId: e.target.value }))}
                >
                  <MenuItem value="">Auto</MenuItem>
                  {modelOptions.map((m) => (
                    <MenuItem key={`analysis-${m.id}`} value={m.id}>
                      {m.label || m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="ai-default-chat-label">Default chat model</InputLabel>
                <Select
                  labelId="ai-default-chat-label"
                  label="Default chat model"
                  value={form.defaultChatModelId}
                  onChange={(e) => setForm((p) => ({ ...p, defaultChatModelId: e.target.value }))}
                >
                  <MenuItem value="">Auto</MenuItem>
                  {modelOptions.map((m) => (
                    <MenuItem key={`chat-${m.id}`} value={m.id}>
                      {m.label || m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="contained" disabled={saving} onClick={onSave}>
            {saving ? <CircularProgress color="inherit" size={18} /> : "Save AI model settings"}
          </Button>
          <Button variant="outlined" onClick={() => load()} disabled={saving}>
            Reload
          </Button>
        </div>
      </div>
    </SettingsContentShell>
  );
};

export default AiModelSettings;
