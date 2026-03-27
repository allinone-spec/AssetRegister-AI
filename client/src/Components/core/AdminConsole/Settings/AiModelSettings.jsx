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
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { fetchAiAdminSettings, saveAiAdminSettings } from "../../../../Service/ai.service";

const splitListText = (text) =>
  String(text || "")
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);

const listToText = (list) => (Array.isArray(list) ? list.join("\n") : "");

const AiModelSettings = ({ routeName }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({
    azureOpenAiApiKey: "",
    openAiApiKey: "",
    azureOpenAiEndpoint: "",
    azureOpenAiApiVersion: "",
    openAiBaseUrl: "",
    azureDeploymentsText: "",
    openAiModelsText: "",
    defaultAnalysisModelId: "",
    defaultChatModelId: "",
  });
  const [meta, setMeta] = useState({
    azureMasked: "",
    openaiMasked: "",
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
      });
      setForm({
        azureOpenAiApiKey: data?.azureOpenAiApiKey || "",
        openAiApiKey: data?.openAiApiKey || "",
        azureOpenAiEndpoint: data?.azureOpenAiEndpoint || "",
        azureOpenAiApiVersion: data?.azureOpenAiApiVersion || "",
        openAiBaseUrl: data?.openAiBaseUrl || "",
        azureDeploymentsText: listToText(data?.azureDeployments || []),
        openAiModelsText: listToText(data?.openAiModels || []),
        defaultAnalysisModelId: data?.defaultAnalysisModelId || "",
        defaultChatModelId: data?.defaultChatModelId || "",
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed to load AI model settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(setHeadingTitle("AI model settings"));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const modelOptions = useMemo(() => (Array.isArray(models) ? models : []), [models]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveAiAdminSettings({
        azureOpenAiApiKey: form.azureOpenAiApiKey.trim() || undefined,
        openAiApiKey: form.openAiApiKey.trim() || undefined,
        azureOpenAiEndpoint: form.azureOpenAiEndpoint,
        azureOpenAiApiVersion: form.azureOpenAiApiVersion,
        openAiBaseUrl: form.openAiBaseUrl,
        azureDeployments: splitListText(form.azureDeploymentsText),
        openAiModels: splitListText(form.openAiModelsText),
        defaultAnalysisModelId: form.defaultAnalysisModelId || "",
        defaultChatModelId: form.defaultChatModelId || "",
      });
      toast.success("AI settings saved.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout routeName={routeName}>
        <div className="flex min-h-[45vh] items-center justify-center">
          <CircularProgress />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout routeName={routeName}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">AI Model</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure Azure/OpenAI API keys, model lists, and default model selection for AI analysis and chat.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TextField
            label="Azure OpenAI API Key"
            value={form.azureOpenAiApiKey}
            onChange={(e) => setForm((p) => ({ ...p, azureOpenAiApiKey: e.target.value }))}
            fullWidth
            size="small"
            helperText={meta.azureMasked ? `Current: ${meta.azureMasked} (loaded by default)` : "No key saved"}
          />
          <TextField
            label="OpenAI API Key"
            value={form.openAiApiKey}
            onChange={(e) => setForm((p) => ({ ...p, openAiApiKey: e.target.value }))}
            fullWidth
            size="small"
            helperText={meta.openaiMasked ? `Current: ${meta.openaiMasked} (loaded by default)` : "No key saved"}
          />
          <TextField
            label="Azure OpenAI Endpoint"
            value={form.azureOpenAiEndpoint}
            onChange={(e) => setForm((p) => ({ ...p, azureOpenAiEndpoint: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label="OpenAI Base URL"
            value={form.openAiBaseUrl}
            onChange={(e) => setForm((p) => ({ ...p, openAiBaseUrl: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label="Azure OpenAI API Version"
            value={form.azureOpenAiApiVersion}
            onChange={(e) => setForm((p) => ({ ...p, azureOpenAiApiVersion: e.target.value }))}
            fullWidth
            size="small"
          />
          <div />
          <TextField
            label="Azure deployments (sub models)"
            value={form.azureDeploymentsText}
            onChange={(e) => setForm((p) => ({ ...p, azureDeploymentsText: e.target.value }))}
            fullWidth
            multiline
            minRows={5}
            helperText="One per line or comma-separated."
          />
          <TextField
            label="OpenAI models (sub models)"
            value={form.openAiModelsText}
            onChange={(e) => setForm((p) => ({ ...p, openAiModelsText: e.target.value }))}
            fullWidth
            multiline
            minRows={5}
            helperText="One per line or comma-separated (e.g., gpt-4o-mini, gpt-5-mini)."
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
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

        <div className="mt-6 flex gap-2">
          <Button variant="contained" disabled={saving} onClick={onSave}>
            {saving ? <CircularProgress color="inherit" size={18} /> : "Save AI model settings"}
          </Button>
          <Button variant="outlined" onClick={() => load()} disabled={saving}>
            Reload
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default AiModelSettings;
