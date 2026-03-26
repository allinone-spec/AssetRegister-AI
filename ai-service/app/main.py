from __future__ import annotations

from collections import defaultdict
import hashlib
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import pandas as pd
import requests
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.storage import AIStateStore, utc_day_key


class Settings(BaseSettings):
    assetregister_admin_console_base_url: str = "http://20.244.24.90:9088/api/admin"
    assetregister_data_base_url: str = "http://20.244.24.90:9088/api/data"
    assetregister_service_token: Optional[str] = None
    cache_warm_org_id: str = Field(default="default-org", validation_alias="ORG_ID")
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = "https://assetregisteropenai.openai.azure.com/"
    azure_openai_deployment: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-02-15-preview"
    ai_state_db: str = str(Path(__file__).resolve().parent.parent / "data" / "ai_state.db")
    # Optional second Azure OpenAI (e.g. AZURE_OPENAI_2_API_KEY, _2_ENDPOINT, _2_DEPLOYMENT, _2_API_VERSION)
    azure_openai_2_api_key: Optional[str] = None
    azure_openai_2_endpoint: Optional[str] = None
    azure_openai_2_deployment: Optional[str] = None
    azure_openai_2_api_version: Optional[str] = None
    # Optional OpenAI cloud (OPENAI_API_KEY, OPENAI_MODEL)
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    # Comma-separated CORS origins for production (e.g. https://app.example.com)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


@lru_cache()
def get_store() -> AIStateStore:
    return AIStateStore(get_settings().ai_state_db)


class AnalyzeOptions(BaseModel):
    includeTrends: Optional[bool] = True
    includeMaturityScore: Optional[bool] = True
    includeRecommendations: Optional[bool] = True
    includeInternetContext: Optional[bool] = False


class AnalyzeRequest(BaseModel):
    orgId: str
    userId: str
    pageId: str
    category: str
    filters: Dict[str, Any] = {}
    analysisOptions: Optional[AnalyzeOptions] = None
    modelId: Optional[str] = None
    customPrompt: Optional[str] = None
    focusColumns: Optional[List[str]] = None


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    orgId: str
    userId: str
    pageId: str
    category: str
    filters: Dict[str, Any] = {}
    messages: List[ChatMessage]
    modelId: Optional[str] = None


class GlobalChatRequest(BaseModel):
    orgId: str
    userId: str
    consoleType: Literal["data", "admin"] = "data"
    moduleKey: Optional[str] = None
    route: Optional[str] = None
    contextFilters: Dict[str, Any] = {}
    messages: List[ChatMessage]
    modelId: Optional[str] = None


class FeedbackRequest(BaseModel):
    orgId: str
    userId: str
    pageId: str
    kpiId: str
    useful: bool
    comment: Optional[str] = None
    category: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    insightType: Optional[str] = None
    feedbackType: Optional[Literal["helpful", "not_helpful", "irrelevant"]] = None


class ChatSessionRequest(BaseModel):
    orgId: str
    userId: str
    pageId: str
    category: str
    filters: Dict[str, Any] = {}


class GlobalChatSessionRequest(BaseModel):
    orgId: str
    userId: str
    consoleType: Literal["data", "admin"] = "data"
    moduleKey: Optional[str] = None
    route: Optional[str] = None
    contextFilters: Dict[str, Any] = {}


app = FastAPI(title="AssetRegister AI Sidecar", version="1.0.0")


def _cors_origins_list(origins_str: str) -> List[str]:
    return [o.strip() for o in origins_str.split(",") if o.strip()]


def _get_cors_origins() -> List[str]:
    return _cors_origins_list(get_settings().cors_origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "message": exc.detail})


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=500, content={"detail": str(exc), "message": f"AI service error: {exc}"})


def _get_ai_models_list(settings: Settings) -> List[Dict[str, Any]]:
    """Build list of configured AI models from .env (Azure 1, optional Azure 2, optional OpenAI)."""
    models: List[Dict[str, Any]] = []
    if settings.azure_openai_api_key and settings.azure_openai_deployment:
        models.append({
            "id": settings.azure_openai_deployment,
            "provider": "azure_openai",
            "label": f"Azure OpenAI – {settings.azure_openai_deployment}",
        })
    if (
        getattr(settings, "azure_openai_2_api_key", None)
        and getattr(settings, "azure_openai_2_deployment", None)
        and getattr(settings, "azure_openai_2_endpoint", None)
    ):
        dep = settings.azure_openai_2_deployment
        models.append({
            "id": dep,
            "provider": "azure_openai",
            "label": f"Azure OpenAI (2) – {dep}",
        })
    if getattr(settings, "openai_api_key", None) and getattr(settings, "openai_model", None):
        model = settings.openai_model
        models.append({
            "id": model,
            "provider": "openai",
            "label": f"OpenAI – {model}",
        })
    return models


def _get_model_config(settings: Settings, model_id: str) -> Dict[str, Any]:
    """Resolve model_id to config dict (provider, endpoint, deployment, api_key, etc.)."""
    if not model_id:
        model_id = settings.azure_openai_deployment
    if model_id == settings.azure_openai_deployment and settings.azure_openai_api_key:
        return {
            "provider": "azure_openai",
            "endpoint": settings.azure_openai_endpoint.rstrip("/"),
            "deployment": settings.azure_openai_deployment,
            "api_version": settings.azure_openai_api_version,
            "api_key": settings.azure_openai_api_key,
        }
    dep2 = getattr(settings, "azure_openai_2_deployment", None)
    if dep2 and model_id == dep2 and getattr(settings, "azure_openai_2_api_key", None):
        endpoint = (getattr(settings, "azure_openai_2_endpoint") or settings.azure_openai_endpoint or "").rstrip("/")
        return {
            "provider": "azure_openai",
            "endpoint": endpoint,
            "deployment": dep2,
            "api_version": getattr(settings, "azure_openai_2_api_version") or "2024-02-15-preview",
            "api_key": settings.azure_openai_2_api_key,
        }
    if getattr(settings, "openai_model", None) and model_id == settings.openai_model:
        return {
            "provider": "openai",
            "api_key": getattr(settings, "openai_api_key", None),
            "model": settings.openai_model,
        }
    raise HTTPException(
        status_code=400,
        detail=f"Unknown or unconfigured model '{model_id}'. Use /api/ai/models to list available models.",
    )


def _azure_chat_url(settings: Settings, model_id: Optional[str] = None) -> str:
    cfg = _get_model_config(settings, model_id or settings.azure_openai_deployment)
    if cfg.get("provider") != "azure_openai":
        raise HTTPException(status_code=400, detail="Azure URL only for azure_openai provider.")
    endpoint = cfg["endpoint"]
    deployment = cfg["deployment"]
    api_version = cfg["api_version"]
    return (
        f"{endpoint}/openai/deployments/{deployment}/chat/completions"
        f"?api-version={api_version}"
    )


def _extract_retry_after_seconds(resp: requests.Response) -> Optional[int]:
    retry_after = resp.headers.get("Retry-After") or resp.headers.get("retry-after")
    if retry_after:
        try:
            return max(1, int(float(retry_after)))
        except Exception:
            pass
    match = re.search(r"retry after\s+(\d+)\s+seconds", resp.text or "", re.IGNORECASE)
    if match:
        return max(1, int(match.group(1)))
    return None


def _build_backend_headers(settings: Settings, request: Optional[Request] = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    auth = request.headers.get("Authorization") if request is not None else None
    if auth:
        headers["Authorization"] = auth
    elif settings.assetregister_service_token:
        headers["Authorization"] = f"Bearer {settings.assetregister_service_token}"
    return headers


def _is_supported_page_id(page_id: str) -> bool:
    return page_id in {
        "data-console/overview",
        "data-console/reports/original-source",
        "data-console/reports/by-ar-resource",
        "data-console/register/detailed",
        "data-console/security/users",
        "data-console/security/groups",
        "data-console/security/roles",
        "data-console/security/permissions",
        "admin-console/overview",
        "admin-console/overview/import-status",
        "admin-console/overview/saved-jobs",
        "admin-console/overview/ar-mapping",
        "admin-console/overview/ar-rules",
    } or page_id.startswith("data-console/reports/original-source/jobs/") or page_id.startswith(
        "data-console/reports/by-ar-resource/jobs/"
    )


def _ensure_supported_page_id(page_id: str) -> None:
    if not _is_supported_page_id(page_id):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported pageId '{page_id}'. "
                "AI analysis is only available for data-console overview, original-source, original-source job details, "
                "by-ar-resource, by-ar-resource job details, register detailed, security lists, and admin console pages."
            ),
        )


def _global_chat_context_scope(ctx: Dict[str, Any]) -> str:
    keys = (
        "selectedObject",
        "dataModule",
        "adminModule",
        "reportJobName",
        "securitySubModule",
        "userName",
    )
    slim = {
        k: ctx.get(k)
        for k in keys
        if ctx.get(k) is not None and str(ctx.get(k)).strip() != ""
    }
    return json.dumps(slim, sort_keys=True, default=str)


def _global_chat_session_page_id(console_type: str) -> str:
    return f"global-chat/{console_type}"


def _global_chat_pseudo_analyze(
    org_id: str,
    user_id: str,
    console_type: str,
    module_key: Optional[str],
    route: Optional[str],
    context_filters: Dict[str, Any],
    model_id: str,
) -> tuple[str, str]:
    session_page_id = _global_chat_session_page_id(console_type)
    pseudo = AnalyzeRequest(
        orgId=org_id,
        userId=user_id,
        pageId=session_page_id,
        category="global-chat",
        filters={
            "consoleType": console_type,
            "moduleKey": module_key or "",
            "route": route or "",
            "chatScope": _global_chat_context_scope(dict(context_filters or {})),
        },
        modelId=model_id,
    )
    return session_page_id, _session_dataset_key(pseudo)


def _request_json(
    method: str,
    url: str,
    headers: Dict[str, str],
    body: Optional[Dict[str, Any]] = None,
    timeout: int = 120,
    allow_invalid_json: bool = False,
) -> Any:
    resp: Optional[requests.Response] = None
    for attempt in range(2):
        try:
            resp = requests.request(method, url, headers=headers, json=body, timeout=timeout)
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach backend at {url}: {exc}") from exc
        if resp.ok:
            try:
                return resp.json()
            except ValueError as exc:
                if allow_invalid_json:
                    raise
                snippet = resp.text[:500] if resp.text else ""
                raise HTTPException(
                    status_code=502,
                    detail=f"Backend {url} returned invalid JSON: {snippet}",
                ) from exc
        if attempt == 0 and resp.status_code == 429:
            time.sleep(65)
            continue
        snippet = resp.text[:500] if resp.text else ""
        raise HTTPException(status_code=502, detail=f"Backend {url} returned {resp.status_code}: {snippet}")
    raise HTTPException(status_code=502, detail=f"Backend request failed for {url}.")


def _request_json_with_methods(
    methods: List[str],
    url: str,
    headers: Dict[str, str],
    body: Optional[Dict[str, Any]] = None,
    timeout: int = 120,
    allow_invalid_json: bool = False,
) -> Any:
    """
    Some Spring endpoints may be registered as GET-with-body or POST.
    Try multiple methods until one returns valid JSON.
    """
    last_exc: Optional[HTTPException] = None
    for method in methods:
        try:
            return _request_json(
                method,
                url,
                headers,
                body=body,
                timeout=timeout,
                allow_invalid_json=allow_invalid_json,
            )
        except HTTPException as exc:
            last_exc = exc
            continue
    if last_exc:
        raise last_exc
    raise HTTPException(status_code=502, detail=f"Backend request failed for {url}.")


def _extract_rows(data: Any, endpoint_name: str) -> List[Dict[str, Any]]:
    rows = data["data"] if isinstance(data, dict) and "data" in data else data
    if not isinstance(rows, list):
        raise HTTPException(status_code=500, detail=f"Unexpected response structure from {endpoint_name}.")
    return rows


def _load_job_save_filters(
    settings: Settings,
    headers: Dict[str, str],
    type_key: str,
    object_id: Any,
    job_name: str,
    user_id: str,
) -> Dict[str, Any]:
    url = (
        f"{settings.assetregister_admin_console_base_url}/AssetRegister/filterRequest/"
        f"{type_key}_{object_id}_{job_name}_{user_id}/get"
    )
    try:
        data = _request_json("GET", url, headers, timeout=120)
        if not isinstance(data, dict):
            return {}
        x_days = ((data.get("xDaysFilter") or {}) or {}).get("xDays")
        if x_days:
            data.setdefault("xFilter", data.get("xFilter", False))
        else:
            data["xFilter"] = False
            data["xDaysFilter"] = None
        return data
    except Exception:
        return {}


def _load_register_save_filters(
    settings: Settings,
    headers: Dict[str, str],
    object_id: Any,
    user_id: str,
) -> Dict[str, Any]:
    filter_key = f"REGISTER_{object_id}_{user_id}"
    url = (
        f"{settings.assetregister_admin_console_base_url}/AssetRegister/filterRequest/"
        f"{filter_key}/get"
    )
    try:
        data = _request_json("GET", url, headers, timeout=120)
        if not isinstance(data, dict):
            return {}
        return data
    except Exception:
        return {}


def _fetch_paginated_rows(
    headers: Dict[str, str],
    body: Dict[str, Any],
    url_base: str,
    endpoint_name: str,
    page_size: int = 500,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    page = 0
    total_pages: Optional[int] = None

    while True:
        page_url = f"{url_base}?page={page}&size={page_size}"
        data = _request_json("POST", page_url, headers, body)
        page_rows = _extract_rows(data, endpoint_name)
        rows.extend(page_rows)

        if isinstance(data, dict):
            try:
                total_pages = int(data.get("totalPages")) if data.get("totalPages") is not None else total_pages
            except Exception:
                total_pages = total_pages

        page += 1
        if total_pages is not None:
            if page >= total_pages:
                break
        elif not page_rows or len(page_rows) < page_size:
            break

    return rows


def _normalize_filters_for_cache(filters: Dict[str, Any]) -> Dict[str, Any]:
    dashboard = filters.get("dashboardData") or {}
    normalized: Dict[str, Any] = {}

    if filters.get("jobName"):
        normalized["jobName"] = filters.get("jobName")

    # Keep key-stable scope fields for register/report sessions.
    # This helps session memory behave consistently across refreshes and pages.
    for key in ["objectId", "selectedObject", "tableName", "tableId", "viewId"]:
        if filters.get(key) is not None:
            normalized[key] = filters.get(key)

    if dashboard:
        nd: Dict[str, Any] = {
            "tableType": dashboard.get("tableType"),
            "objectId": dashboard.get("objectId"),
            "dataSource": dashboard.get("dataSource"),
            "tableName": dashboard.get("tableName"),
            "selectedJobName": dashboard.get("selectedJobName"),
            "xFilter": bool(dashboard.get("xFilter")),
        }
        xdf = dashboard.get("xDaysFilter")
        if isinstance(xdf, dict):
            nd["importTrendKey"] = json.dumps(
                {"days": xdf.get("xDays"), "cols": xdf.get("columnNames")},
                sort_keys=True,
                default=str,
            )
        elif xdf is not None:
            nd["importTrendKey"] = json.dumps(xdf, sort_keys=True, default=str)
        normalized["dashboardData"] = nd

    return normalized


def _dataset_key(payload: AnalyzeRequest | ChatRequest | ChatSessionRequest) -> str:
    # Bump this to force re-generation when we change prompt structure/context injection.
    analysis_cache_version = "register-tracing-v8-admin-data-home"
    raw = {
        "orgId": payload.orgId,
        "userId": payload.userId,
        "pageId": payload.pageId,
        "category": payload.category,
        "filters": _normalize_filters_for_cache(payload.filters or {}),
        "analysisCacheVersion": analysis_cache_version,
    }
    if hasattr(payload, "customPrompt") and (payload.customPrompt or "").strip():
        raw["customPrompt"] = (payload.customPrompt or "").strip()
    if hasattr(payload, "focusColumns") and payload.focusColumns:
        raw["focusColumns"] = sorted(payload.focusColumns)
    return hashlib.sha256(json.dumps(raw, sort_keys=True, default=str).encode()).hexdigest()


def _session_dataset_key(payload: AnalyzeRequest | ChatRequest | ChatSessionRequest) -> str:
    """
    Key used for feedback + chat session lookup.
    Intentionally ignores `customPrompt` and `focusColumns` so feedback/chat keep applying
    even when the user changes prompts or focus columns and re-runs analysis.
    """
    session_cache_version = "session-v3-user-scoped"
    raw = {
        "orgId": payload.orgId,
        "userId": payload.userId,
        "pageId": payload.pageId,
        "category": payload.category,
        "filters": _normalize_filters_for_cache(payload.filters or {}),
        "sessionCacheVersion": session_cache_version,
    }
    return hashlib.sha256(json.dumps(raw, sort_keys=True, default=str).encode()).hexdigest()


def _model_id_or_default(payload_model: Optional[str], settings: Settings) -> str:
    model_id = (payload_model or "").strip()
    if not model_id:
        models = _get_ai_models_list(settings)
        if not models:
            raise HTTPException(status_code=503, detail="No AI model is configured in .env.")
        return models[0]["id"]
    _get_model_config(settings, model_id)
    return model_id


def fetch_original_source_jobs(settings: Settings, payload: AnalyzeRequest, request: Optional[Request] = None) -> List[Dict[str, Any]]:
    url = f"{settings.assetregister_admin_console_base_url}/table/get/jobNames"
    headers = _build_backend_headers(settings, request)
    data = _request_json("GET", url, headers)
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="Unexpected response structure from jobNames endpoint.")
    return data


def fetch_job_table_all(settings: Settings, payload: AnalyzeRequest, request: Optional[Request] = None) -> List[Dict[str, Any]]:
    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    data_source = dashboard.get("dataSource") or "AC"
    object_id = dashboard.get("objectId")
    job_name = filters.get("jobName") or payload.pageId.rsplit("/", 1)[-1]
    if not job_name or not object_id:
        raise HTTPException(status_code=400, detail="Missing jobName or objectId for job page.")
    type_key = "getAC" if data_source == "AC" else "getDC"
    url_base = f"{settings.assetregister_admin_console_base_url}/table/{type_key}/{job_name}/data"
    url = f"{url_base}?page=-1"
    headers = _build_backend_headers(settings, request)
    saved_filters = filters.get("saveFilters") or {}
    if not saved_filters.get("tableName"):
        loaded = _load_job_save_filters(settings, headers, "AC" if data_source == "AC" else "DC", object_id, job_name, payload.userId)
        if loaded:
            saved_filters = loaded
    body = {
        **saved_filters,
        "filterKey": f"{data_source}_{object_id}_{job_name}_{payload.userId}",
    }
    try:
        data = _request_json("POST", url, headers, body, allow_invalid_json=True)
        return _extract_rows(data, "job data endpoint")
    except ValueError:
        return _fetch_paginated_rows(headers, body, url_base, "job data endpoint")


def fetch_register_detailed_all(settings: Settings, payload: AnalyzeRequest, request: Optional[Request] = None) -> List[Dict[str, Any]]:
    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    object_id = dashboard.get("objectId")
    if not object_id:
        raise HTTPException(status_code=400, detail="Missing objectId for register detailed page.")
    url_base = f"{settings.assetregister_admin_console_base_url}/AssetRegister/{object_id}/get"
    url = f"{url_base}?page=-1"
    headers = _build_backend_headers(settings, request)
    saved_filters = filters.get("saveFilters") or {}
    if not saved_filters.get("tableName"):
        loaded = _load_register_save_filters(settings, headers, object_id, payload.userId)
        if loaded:
            saved_filters = loaded
    filter_key = saved_filters.get("filterKey") or f"REGISTER_{object_id}_{payload.userId}"
    body = {**saved_filters, "filterKey": filter_key}
    try:
        data = _request_json("POST", url, headers, body, allow_invalid_json=True)
        return _extract_rows(data, "register detailed endpoint")
    except ValueError:
        return _fetch_paginated_rows(headers, body, url_base, "register detailed endpoint")


def fetch_security_console_rows(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> List[Dict[str, Any]]:
    page_id = payload.pageId or ""
    sub = page_id.rsplit("/", 1)[-1].strip().lower()
    paths = {
        "users": "/user/readAll",
        "groups": "/groups/readAll",
        "roles": "/roles/readAll",
        "permissions": "/permission/readAll",
    }
    rel = paths.get(sub)
    if not rel:
        raise HTTPException(status_code=400, detail=f"Unknown security sub-page '{sub}' for {page_id}.")
    url = f"{settings.assetregister_data_base_url.rstrip('/')}{rel}"
    headers = _build_backend_headers(settings, request)
    data = _request_json("GET", url, headers)
    rows = _extract_rows(data, f"security/{sub}")
    max_rows = 400
    if isinstance(rows, list) and len(rows) > max_rows:
        return rows[:max_rows]
    return rows


def _pick_first_present(row: Dict[str, Any], keys: List[str]) -> Any:
    for key in keys:
        if key in row and row.get(key) not in (None, ""):
            return row.get(key)
    return None


def _dashboard_data_dict(payload: Optional[AnalyzeRequest]) -> Dict[str, Any]:
    if payload is None:
        return {}
    return (payload.filters or {}).get("dashboardData") or {}


def _scope_object_filter(payload: Optional[AnalyzeRequest]) -> Optional[str]:
    """None = all objects; otherwise filter to this object id string."""
    raw = _dashboard_data_dict(payload).get("objectId")
    if raw is None or str(raw).strip() == "" or str(raw).strip().lower() in ("all", "*", "null", "undefined"):
        return None
    return str(raw).strip()


def _row_matches_scope_object(row: Dict[str, Any], object_id: str) -> bool:
    v = _pick_first_present(row, ["object", "objectId", "objectName"])
    return str(v) == str(object_id)


def _count_by_keys(rows: List[Dict[str, Any]], keys: List[str], top_n: int = 8) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        val = _pick_first_present(row, keys)
        label = str(val if val not in (None, "") else "Unknown")
        counts[label] = counts.get(label, 0) + 1
    ordered = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return {k: int(v) for k, v in ordered}


def _fetch_admin_console_module_rows(
    settings: Settings,
    module_key: str,
    headers: Dict[str, str],
    payload: Optional[AnalyzeRequest] = None,
) -> List[Dict[str, Any]]:
    module = (module_key or "").strip().lower()
    if module == "import-status":
        filters = (payload.filters if payload is not None else {}) or {}
        dashboard = filters.get("dashboardData") or {}
        user_id = str((payload.userId if payload is not None else "") or "").strip()
        user_name = (
            dashboard.get("userName")
            or filters.get("userName")
            or ""
        )
        dd = _dashboard_data_dict(payload)
        obj_for_status = dd.get("objectId")
        if obj_for_status is None or str(obj_for_status).strip().lower() in ("all", "*", ""):
            object_id_field = ""
        else:
            object_id_field = str(obj_for_status).strip()
        import_status_body = {
            "sortColumns": None,
            "viewId": None,
            "filterKey": f"importStatus_{user_id}" if user_id else "importStatus",
            "objectId": object_id_field,
            "primaryKey": None,
            "orderColumnHeaders": [],
            "createdSTP": None,
            "createdBy": None,
            "updatedBy": None,
            "updatedSTP": None,
            "userName": user_name,
            "searchText": None,
            "filterExpression": {"logic": "AND", "conditions": []},
            "selectedKeys": None,
            "tableName": "ImportStatus",
            "xDaysFilter": dd.get("xDaysFilter"),
            "xFilter": bool(dd.get("xFilter", False)),
        }
        if import_status_body["xDaysFilter"] is None:
            import_status_body["xDaysFilter"] = None
            import_status_body["xFilter"] = False
        status_url = f"{settings.assetregister_admin_console_base_url}/Status/get?page=-1&size=1000"
        data = _request_json_with_methods(
            ["POST", "GET"],
            status_url,
            headers,
            body=import_status_body,
            allow_invalid_json=True,
        )
        return _extract_rows(data, "admin import status")

    if module == "saved-jobs":
        filters = (payload.filters if payload is not None else {}) or {}
        dashboard = filters.get("dashboardData") or {}
        user_id = str((payload.userId if payload is not None else "") or "").strip()
        user_name = (
            dashboard.get("userName")
            or filters.get("userName")
            or ""
        )
        scoped_jobs_obj = _scope_object_filter(payload) if payload is not None else None
        saved_jobs_body = {
            "sortColumns": None,
            "viewId": None,
            "filterKey": f"savedJobs_{user_id}" if user_id else "savedJobs",
            "objectId": scoped_jobs_obj,
            "primaryKey": None,
            "orderColumnHeaders": [],
            "createdSTP": None,
            "createdBy": None,
            "updatedBy": None,
            "updatedSTP": None,
            "userName": user_name,
            "searchText": None,
            "filterExpression": None,
            "selectedKeys": None,
            "tableName": "jobSchedule",
            "xDaysFilter": None,
            "xFilter": False,
        }
        jobs_url = f"{settings.assetregister_admin_console_base_url}/jobSchedule/getJobs?page=-1&size=1000"
        data = _request_json_with_methods(
            ["POST", "GET"],
            jobs_url,
            headers,
            body=saved_jobs_body,
            allow_invalid_json=True,
        )
        return _extract_rows(data, "admin saved jobs")

    if module == "ar-mapping":
        mapping_url = f"{settings.assetregister_admin_console_base_url}/filter/mappedColumns"
        data = _request_json_with_methods(["GET", "POST"], mapping_url, headers, body={})
        if isinstance(data, dict) and isinstance(data.get("data"), list):
            return data.get("data") or []
        if isinstance(data, list):
            return data
        return []

    if module == "ar-rules":
        # AR rules are object-scoped; discover objects from saved jobs.
        jobs_rows = _fetch_admin_console_module_rows(settings, "saved-jobs", headers, payload)
        rows: List[Dict[str, Any]] = []
        object_ids: List[Any] = []
        scoped = _scope_object_filter(payload)
        if scoped:
            object_ids = [scoped]
        else:
            for row in jobs_rows:
                obj = _pick_first_present(row, ["object", "objectId"])
                if obj is not None and obj not in object_ids:
                    object_ids.append(obj)
        for obj in object_ids[:30]:
            try:
                rules_url = f"{settings.assetregister_admin_console_base_url}/rules/get?objectId={obj}"
                data = _request_json_with_methods(["GET", "POST"], rules_url, headers, body={})
                if isinstance(data, list):
                    rows.extend(data)
                elif isinstance(data, dict) and isinstance(data.get("data"), list):
                    rows.extend(data.get("data") or [])
            except Exception:
                continue
        return rows
    return []


def fetch_admin_console_module_rows(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> List[Dict[str, Any]]:
    """Return module-specific admin datasets so each module is analyzed independently."""
    page_id = (payload.pageId or "").split("?", 1)[0].rstrip("/")
    module_key = page_id.rsplit("/", 1)[-1]
    headers = _build_backend_headers(settings, request)
    rows = _fetch_admin_console_module_rows(settings, module_key, headers, payload)
    return rows if isinstance(rows, list) else []


def fetch_admin_console_overview_rows(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> List[Dict[str, Any]]:
    """
    Build a compact synthetic dataset for Admin Console landing insights from:
    - Import Status
    - Saved Jobs
    - AR Mapping
    - AR Rules
    """
    headers = _build_backend_headers(settings, request)

    status_rows: List[Dict[str, Any]] = []
    jobs_rows: List[Dict[str, Any]] = []
    mapped_rows: List[Dict[str, Any]] = []
    rules_rows: List[Dict[str, Any]] = []

    # Import Status
    try:
        status_rows = _fetch_admin_console_module_rows(settings, "import-status", headers, payload)
    except Exception:
        status_rows = []

    # Saved Jobs
    try:
        jobs_rows = _fetch_admin_console_module_rows(settings, "saved-jobs", headers, payload)
    except Exception:
        jobs_rows = []

    # AR Mapping
    try:
        mapped_rows = _fetch_admin_console_module_rows(settings, "ar-mapping", headers, payload)
    except Exception:
        mapped_rows = []

    # AR Rules (derive by object id from jobs if possible)
    try:
        rules_rows = _fetch_admin_console_module_rows(settings, "ar-rules", headers, payload)
    except Exception:
        rules_rows = []

    obj_scope = _scope_object_filter(payload)
    if obj_scope:
        jobs_rows = [r for r in jobs_rows if _row_matches_scope_object(r, obj_scope)]
        mapped_rows = [r for r in mapped_rows if _row_matches_scope_object(r, obj_scope)]
        rules_rows = [r for r in rules_rows if _row_matches_scope_object(r, obj_scope)]

    # Compact synthetic records for AI analysis quality and token efficiency.
    rows: List[Dict[str, Any]] = []

    import_status_counts = _count_by_keys(status_rows, ["status", "Status", "importStatus", "jobStatus"])
    rows.append(
        {
            "module": "Import Status",
            "metric": "overview",
            "totalRecords": int(len(status_rows)),
            "statusCounts": import_status_counts,
        }
    )

    job_source_counts = _count_by_keys(jobs_rows, ["dataSource", "source", "sourceType", "type"])
    job_active_counts = _count_by_keys(jobs_rows, ["isActive", "active", "status"], top_n=5)
    rows.append(
        {
            "module": "Saved Jobs",
            "metric": "overview",
            "totalJobs": int(len(jobs_rows)),
            "sourceCounts": job_source_counts,
            "activeStateCounts": job_active_counts,
        }
    )

    mapping_object_counts = _count_by_keys(mapped_rows, ["object", "objectId", "objectName"])
    rows.append(
        {
            "module": "AR Mapping",
            "metric": "overview",
            "totalMappings": int(len(mapped_rows)),
            "objectCounts": mapping_object_counts,
        }
    )

    rule_name_counts = _count_by_keys(rules_rows, ["ruleName", "RuleName", "name"])
    rows.append(
        {
            "module": "AR Rules",
            "metric": "overview",
            "totalRules": int(len(rules_rows)),
            "ruleTypeCounts": rule_name_counts,
        }
    )

    # Add compact module examples to help LLM produce richer highlights.
    for item in (status_rows[:8] if status_rows else []):
        rows.append(
            {
                "module": "Import Status",
                "metric": "example",
                "jobName": _pick_first_present(item, ["jobName", "JobName", "name"]),
                "status": _pick_first_present(item, ["status", "Status", "importStatus", "jobStatus"]),
                "updatedAt": _pick_first_present(item, ["updatedAt", "modifiedAt", "createDate", "updatedDate"]),
            }
        )
    for item in (jobs_rows[:8] if jobs_rows else []):
        rows.append(
            {
                "module": "Saved Jobs",
                "metric": "example",
                "jobName": _pick_first_present(item, ["jobName", "JobName", "name"]),
                "dataSource": _pick_first_present(item, ["dataSource", "source", "sourceType", "type"]),
                "objectId": _pick_first_present(item, ["object", "objectId"]),
            }
        )
    for item in (mapped_rows[:8] if mapped_rows else []):
        rows.append(
            {
                "module": "AR Mapping",
                "metric": "example",
                "objectId": _pick_first_present(item, ["object", "objectId", "objectName"]),
                "acTable": _pick_first_present(item, ["ACTableName", "acTable", "tableName"]),
                "dcTable": _pick_first_present(item, ["DCTableName", "dcTable", "targetTable"]),
            }
        )
    for item in (rules_rows[:8] if rules_rows else []):
        rows.append(
            {
                "module": "AR Rules",
                "metric": "example",
                "objectId": _pick_first_present(item, ["object", "objectId"]),
                "ruleName": _pick_first_present(item, ["ruleName", "RuleName", "name"]),
                "jobName": _pick_first_present(item, ["jobName", "JobName"]),
            }
        )

    return rows


def _parse_event_timestamp(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        s = str(value).strip()
        if not s:
            return None
        try:
            if s.endswith("Z") and "+" not in s:
                s = s[:-1] + "+00:00"
            dt = datetime.fromisoformat(s.replace(" ", "T")[:32])
        except Exception:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _dict_rows_only(rows: Any) -> List[Dict[str, Any]]:
    """Backend list endpoints sometimes mix dict rows with stray strings; metrics must skip non-dicts."""
    if not isinstance(rows, list):
        return []
    return [r for r in rows if isinstance(r, dict)]


def _compute_admin_console_dashboard_metrics(
    status_rows: List[Dict[str, Any]],
    jobs_rows: List[Dict[str, Any]],
    mapped_rows: List[Dict[str, Any]],
    rules_rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    status_rows = _dict_rows_only(status_rows)
    jobs_rows = _dict_rows_only(jobs_rows)
    mapped_rows = _dict_rows_only(mapped_rows)
    rules_rows = _dict_rows_only(rules_rows)

    def norm(s: Any) -> str:
        return str(s or "").strip().lower()

    disabled = 0
    for row in jobs_rows:
        d = row.get("disable")
        if d is True or norm(d) == "yes":
            disabled += 1
    active_jobs = max(0, len(jobs_rows) - disabled)

    job_names: List[str] = []
    for row in jobs_rows:
        jn = _pick_first_present(row, ["jobName", "JobName", "name"])
        if jn:
            job_names.append(str(jn))

    mapped_jobs: set[str] = set()
    for row in mapped_rows:
        mj = _pick_first_present(row, ["jobName", "JobName", "name", "job"])
        if mj:
            mapped_jobs.add(str(mj))

    jobs_no_mapping = [jn for jn in job_names if jn not in mapped_jobs]

    rules_by_object: Dict[str, int] = {}
    for row in rules_rows:
        o = _pick_first_present(row, ["object", "objectId"])
        if o is None:
            continue
        k = str(o)
        rules_by_object[k] = rules_by_object.get(k, 0) + 1

    jobs_no_rules: List[str] = []
    seen_jnr: set[str] = set()
    for row in jobs_rows:
        oid = str(_pick_first_present(row, ["object", "objectId"]) or "")
        jn = str(_pick_first_present(row, ["jobName", "JobName"]) or "")
        if oid and rules_by_object.get(oid, 0) == 0 and jn and jn not in seen_jnr:
            seen_jnr.add(jn)
            jobs_no_rules.append(jn)

    activity_by_job: Dict[str, int] = defaultdict(int)
    for row in status_rows:
        jn = _pick_first_present(row, ["jobName", "JobName", "name"])
        if jn:
            activity_by_job[str(jn)] += 1

    now = datetime.now(timezone.utc)
    cut = now - timedelta(hours=24)
    failed_recent: List[str] = []
    for row in status_rows:
        st = norm(_pick_first_present(row, ["status", "Status", "importStatus", "jobStatus", "state"]))
        if not any(x in st for x in ("fail", "error", "cancel", "abort")):
            continue
        ts = _parse_event_timestamp(
            _pick_first_present(row, ["updatedAt", "endTime", "completedAt", "createDate", "updatedDate", "startTime"])
        )
        if ts is None or ts < cut:
            continue
        jn = _pick_first_present(row, ["jobName", "JobName"])
        if jn:
            failed_recent.append(str(jn))

    success_kw = ("success", "complete", "completed", "ok", "done")
    fail_kw = ("fail", "error", "cancel", "abort")
    succ = fail = 0
    for row in status_rows:
        st = norm(_pick_first_present(row, ["status", "Status", "importStatus"]))
        if any(k in st for k in success_kw):
            succ += 1
        elif any(k in st for k in fail_kw):
            fail += 1
    total_sf = succ + fail
    health_pct = round(100 * succ / total_sf, 1) if total_sf else None

    pk_by_object: Dict[str, set] = defaultdict(set)
    mk_by_object: Dict[str, set] = defaultdict(set)
    for row in mapped_rows:
        oid = str(_pick_first_present(row, ["object", "objectId", "objectName"]) or "")
        if row.get("isPrimaryKey") is True:
            pk = row.get("acColumnName") or row.get("dcColumnName") or _pick_first_present(
                row, ["primaryKey", "acPrimaryKey"]
            )
        else:
            pk = _pick_first_present(row, ["primaryKey", "acPrimaryKey", "pkColumn"])
        if pk:
            pk_by_object[oid].add(str(pk))
        if row.get("isMatchingKey") is True:
            mk = row.get("acColumnName") or row.get("dcColumnName") or _pick_first_present(row, ["matchingKey"])
        else:
            mk = _pick_first_present(row, ["matchingKey", "matchingKeys"])
        if mk:
            mk_by_object[oid].add(str(mk))

    pk_mismatch_objects = [o for o, s in pk_by_object.items() if o and len(s) > 1]
    mk_mismatch_objects = [o for o, s in mk_by_object.items() if o and len(s) > 1]

    return {
        "activeJobsCount": active_jobs,
        "totalJobs": len(job_names),
        "jobsWithoutMapping": jobs_no_mapping[:50],
        "jobsWithoutMappingCount": len(jobs_no_mapping),
        "jobsWithoutRules": jobs_no_rules[:50],
        "jobsWithoutRulesCount": len(jobs_no_rules),
        "importActivityByJob": dict(sorted(activity_by_job.items(), key=lambda kv: kv[1], reverse=True)[:30]),
        "jobsFailedLast24Hours": sorted(set(failed_recent))[:40],
        "jobsFailedLast24HoursCount": len(set(failed_recent)),
        "integrationHealthPercent": health_pct,
        "integrationSuccessCount": succ,
        "integrationFailureCount": fail,
        "objectsWithConflictingPrimaryKeyMappings": pk_mismatch_objects[:30],
        "objectsWithConflictingMatchingKeys": mk_mismatch_objects[:30],
        "importStatusRecordCount": len(status_rows),
        "mappingRecordCount": len(mapped_rows),
        "rulesRecordCount": len(rules_rows),
    }


def _llm_admin_console_highlights(
    settings: Settings,
    model_id: str,
    metrics: Dict[str, Any],
    extra_context: str,
) -> Dict[str, Any]:
    system = (
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
    user = "METRICS (authoritative numbers):\n" + json.dumps(metrics, indent=2, default=str)
    if (extra_context or "").strip():
        user += "\n\nSESSION / USER CONTEXT:\n" + (extra_context or "").strip()[:8000]
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    raw = _llm_chat(settings, model_id, messages, max_tokens=1600, json_mode=True)
    try:
        return _parse_ai_json_with_repair(settings, raw, model_id)
    except Exception:
        return {
            "executiveSummary": "Admin Console metrics were computed; narrative JSON could not be parsed.",
            "moduleStories": [],
            "watchlist": [],
            "operationalNotes": [],
        }


def _build_admin_console_overview_response(
    settings: Settings,
    model_id: str,
    payload: AnalyzeRequest,
    request: Request,
    feedback_list: List[Dict[str, Any]],
    chat_messages: List[Dict[str, str]],
) -> Dict[str, Any]:
    headers = _build_backend_headers(settings, request)
    status_rows = _fetch_admin_console_module_rows(settings, "import-status", headers, payload)
    jobs_rows = _fetch_admin_console_module_rows(settings, "saved-jobs", headers, payload)
    mapped_rows = _fetch_admin_console_module_rows(settings, "ar-mapping", headers, payload)
    rules_rows = _fetch_admin_console_module_rows(settings, "ar-rules", headers, payload)

    obj = _scope_object_filter(payload)
    if obj:
        jobs_rows = [r for r in jobs_rows if _row_matches_scope_object(r, obj)]
        mapped_rows = [r for r in mapped_rows if _row_matches_scope_object(r, obj)]
        rules_rows = [r for r in rules_rows if _row_matches_scope_object(r, obj)]

    metrics = _compute_admin_console_dashboard_metrics(status_rows, jobs_rows, mapped_rows, rules_rows)
    metrics["objectScope"] = obj or "ALL"

    custom = (payload.customPrompt or "").strip()
    fb_context = _build_preprocessing_context(custom, feedback_list, chat_messages)
    highlights = _llm_admin_console_highlights(settings, model_id, metrics, fb_context)

    total_insights: List[Dict[str, Any]] = []
    es = (highlights.get("executiveSummary") or "").strip()
    if es:
        total_insights.append({"title": "Admin Console", "text": es, "severity": "info"})
    for story in highlights.get("moduleStories") or []:
        title = (story.get("title") or story.get("module") or "Module").strip()
        bullets = story.get("bullets") or []
        text = " ".join(str(b) for b in bullets[:6])
        if text.strip():
            total_insights.append({"title": title, "text": text, "severity": "info"})

    day_key = utc_day_key()
    notes = highlights.get("operationalNotes") or []
    trends = [{"text": str(t)} for t in notes if str(t).strip()][:8]
    watch = highlights.get("watchlist") or []

    return {
        "totalInsights": total_insights[:14],
        "kpis": [],
        "charts": [],
        "trends": trends,
        "risks": [{"text": str(w)} for w in watch if str(w).strip()][:8],
        "positives": [],
        "recommendations": [],
        "maturityScore": {
            "score": metrics.get("integrationHealthPercent"),
            "comment": (es[:500] if es else "Integration health from import status success vs failure counts."),
        },
        "columnInsights": [],
        "rowInsights": [],
        "analysisSummary": {
            "system_health": es[:400] if es else "",
            "key_risks": [str(x) for x in watch[:6]],
            "root_causes": [],
            "recommendations": [],
        },
        "adminDashboard": {"metrics": metrics, "highlights": highlights},
        "analysisMeta": {
            "dayKey": day_key,
            "rowsAnalyzed": int(len(status_rows) + len(jobs_rows)),
            "anomalyRows": 0,
            "chunkCount": 0,
            "model": model_id,
            "provider": "azure_openai",
            "consoleKind": "admin-home",
        },
    }


def _count_job_table_rows(
    settings: Settings,
    headers: Dict[str, str],
    object_id: str,
    user_id: str,
    job_name: str,
    data_source: str,
) -> int:
    type_label = "AC" if data_source == "AC" else "DC"
    type_key = "getAC" if data_source == "AC" else "getDC"
    saved = _load_job_save_filters(settings, headers, type_label, object_id, job_name, user_id)
    if not saved.get("tableName"):
        return -1
    url_base = f"{settings.assetregister_admin_console_base_url}/table/{type_key}/{job_name}/data"
    body = {**saved, "filterKey": f"{type_label}_{object_id}_{job_name}_{user_id}"}
    try:
        data = _request_json("POST", f"{url_base}?page=-1", headers, body, allow_invalid_json=True)
        return len(_extract_rows(data, "job rows"))
    except Exception:
        try:
            return len(_fetch_paginated_rows(headers, body, url_base, "job rows", page_size=400))
        except Exception:
            return -1


def _fetch_job_rows_capped(
    settings: Settings,
    headers: Dict[str, str],
    object_id: str,
    user_id: str,
    job_name: str,
    data_source: str,
    cap: int,
) -> List[Dict[str, Any]]:
    type_label = "AC" if data_source == "AC" else "DC"
    type_key = "getAC" if data_source == "AC" else "getDC"
    saved = _load_job_save_filters(settings, headers, type_label, object_id, job_name, user_id)
    if not saved.get("tableName"):
        return []
    url_base = f"{settings.assetregister_admin_console_base_url}/table/{type_key}/{job_name}/data"
    body = {**saved, "filterKey": f"{type_label}_{object_id}_{job_name}_{user_id}"}
    try:
        data = _request_json("POST", f"{url_base}?page=-1", headers, body, allow_invalid_json=True)
        rows = _extract_rows(data, "job rows")
        return rows[:cap] if rows else []
    except Exception:
        try:
            rows = _fetch_paginated_rows(headers, body, url_base, "job rows", page_size=min(400, cap))
            return rows[:cap]
        except Exception:
            return []


def _fetch_register_rows_capped(
    settings: Settings,
    headers: Dict[str, str],
    object_id: str,
    user_id: str,
    cap: int,
) -> List[Dict[str, Any]]:
    saved = _load_register_save_filters(settings, headers, object_id, user_id)
    if not saved.get("tableName"):
        return []
    url_base = f"{settings.assetregister_admin_console_base_url}/AssetRegister/{object_id}/get"
    body = {**saved, "filterKey": saved.get("filterKey") or f"REGISTER_{object_id}_{user_id}"}
    try:
        data = _request_json("POST", f"{url_base}?page=-1", headers, body, allow_invalid_json=True)
        rows = _extract_rows(data, "register overview")
        return rows[:cap] if rows else []
    except Exception:
        try:
            rows = _fetch_paginated_rows(headers, body, url_base, "register overview", page_size=min(400, cap))
            return rows[:cap]
        except Exception:
            return []


def _maturity_from_sample_rows(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not rows:
        return {
            "overall": None,
            "dataCompleteness": None,
            "dataConsistency": None,
            "dataChanges": None,
            "dataTimeliness": None,
        }
    df = pd.DataFrame(rows)
    if df.empty:
        return {
            "overall": None,
            "dataCompleteness": None,
            "dataConsistency": None,
            "dataChanges": None,
            "dataTimeliness": None,
        }
    null_ratio = float(df.isna().mean().mean()) if len(df.columns) else 0.0
    completeness = max(0.0, min(100.0, round(100 * (1 - null_ratio), 1)))
    dup_ratio = float(df.duplicated().mean()) if len(df) > 1 else 0.0
    consistency = max(0.0, min(100.0, round(100 * (1 - dup_ratio), 1)))
    changes = 72.0
    timeliness = 74.0
    overall = round((completeness + consistency + changes + timeliness) / 4, 1)
    return {
        "overall": overall,
        "dataCompleteness": completeness,
        "dataConsistency": consistency,
        "dataChanges": changes,
        "dataTimeliness": timeliness,
    }


def fetch_data_console_overview_rows(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> List[Dict[str, Any]]:
    jobs_raw = fetch_original_source_jobs(settings, payload, request)
    obj = _scope_object_filter(payload)
    if obj:
        jobs_raw = [j for j in jobs_raw if str(_pick_first_present(j, ["object", "objectId"])) == obj]
    rows: List[Dict[str, Any]] = [
        {"_kind": "data_console_home", "totalJobs": len(jobs_raw), "objectScope": obj or "ALL"},
    ]
    for j in jobs_raw[:400]:
        rows.append(
            {
                "_kind": "job_ref",
                "jobName": _pick_first_present(j, ["jobName", "name"]),
                "objectId": _pick_first_present(j, ["object", "objectId"]),
            }
        )
    return rows


def _build_data_console_home_response(
    settings: Settings,
    model_id: str,
    payload: AnalyzeRequest,
    request: Request,
    feedback_list: List[Dict[str, Any]],
    chat_messages: List[Dict[str, str]],
) -> Dict[str, Any]:
    headers = _build_backend_headers(settings, request)
    dd = _dashboard_data_dict(payload)
    user_id = str(payload.userId or "")
    obj = _scope_object_filter(payload)
    jobs_raw = fetch_original_source_jobs(settings, payload, request)
    if obj:
        jobs_raw = [j for j in jobs_raw if str(_pick_first_present(j, ["object", "objectId"])) == obj]

    selected_job = (dd.get("selectedJobName") or "").strip()
    job_entries: List[Dict[str, Any]] = []
    ac_total = 0
    dc_total = 0
    sample_for_maturity: List[Dict[str, Any]] = []

    for j in jobs_raw[:18]:
        jn = _pick_first_present(j, ["jobName", "name"])
        oid = _pick_first_present(j, ["object", "objectId"])
        if not jn or not oid:
            continue
        oid_s = str(oid)
        jn_s = str(jn)
        ac = _count_job_table_rows(settings, headers, oid_s, user_id, jn_s, "AC")
        dc = _count_job_table_rows(settings, headers, oid_s, user_id, jn_s, "DC")
        if ac < 0 and dc < 0:
            job_entries.append({"jobName": jn_s, "objectId": oid_s, "acRecords": None, "dcRecords": None, "totalRecords": None})
            continue
        ac_n = max(0, ac)
        dc_n = max(0, dc)
        ac_total += ac_n
        dc_total += dc_n
        job_entries.append(
            {"jobName": jn_s, "objectId": oid_s, "acRecords": ac_n, "dcRecords": dc_n, "totalRecords": ac_n + dc_n}
        )

    target_jobs = [selected_job] if selected_job else [str(_pick_first_present(j, ["jobName", "name"]) or "") for j in jobs_raw[:1]]
    tj = target_jobs[0] if target_jobs else ""
    if tj:
        for j in jobs_raw:
            jn = str(_pick_first_present(j, ["jobName", "name"]) or "")
            if jn != tj:
                continue
            oid_s = str(_pick_first_present(j, ["object", "objectId"]) or "")
            if not oid_s:
                break
            sample_for_maturity.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "AC", 180))
            sample_for_maturity.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "DC", 180))
            break
    if not sample_for_maturity and jobs_raw:
        j = jobs_raw[0]
        jn = str(_pick_first_present(j, ["jobName", "name"]) or "")
        oid_s = str(_pick_first_present(j, ["object", "objectId"]) or "")
        if jn and oid_s:
            sample_for_maturity.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "AC", 120))
            sample_for_maturity.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "DC", 120))

    overall_maturity = _maturity_from_sample_rows(sample_for_maturity[:420])

    per_job_maturity: Optional[Dict[str, Any]] = None
    if selected_job:
        sj_sample: List[Dict[str, Any]] = []
        for j in jobs_raw:
            jn = str(_pick_first_present(j, ["jobName", "name"]) or "")
            if jn != selected_job:
                continue
            oid_s = str(_pick_first_present(j, ["object", "objectId"]) or "")
            if oid_s:
                sj_sample.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "AC", 220))
                sj_sample.extend(_fetch_job_rows_capped(settings, headers, oid_s, user_id, jn, "DC", 220))
            break
        per_job_maturity = _maturity_from_sample_rows(sj_sample[:450])

    register_summary: Dict[str, Any] = {"recordCount": 0, "byDataSource": {}}
    if obj:
        reg_rows = _fetch_register_rows_capped(settings, headers, obj, user_id, 500)
        register_summary["recordCount"] = len(reg_rows)
        register_summary["byDataSource"] = _count_by_keys(reg_rows, ["dataSource", "DataSource", "source"], top_n=12)

    metrics: Dict[str, Any] = {
        "totalJobs": len(jobs_raw),
        "jobTableSummaries": job_entries,
        "acRecordsTotal": ac_total,
        "dcRecordsTotal": dc_total,
        "overallMaturity": overall_maturity,
        "selectedJobName": selected_job or None,
        "perJobMaturity": per_job_maturity,
        "registerSummary": register_summary,
        "objectScope": obj or "ALL",
    }

    custom = (payload.customPrompt or "").strip()
    fb_context = _build_preprocessing_context(custom, feedback_list, chat_messages)
    system = (
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
    user = "METRICS:\n" + json.dumps(metrics, indent=2, default=str)
    if fb_context.strip():
        user += "\n\nCONTEXT:\n" + fb_context[:8000]
    raw = _llm_chat(
        settings,
        model_id,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=1600,
        json_mode=True,
    )
    try:
        highlights = _parse_ai_json_with_repair(settings, raw, model_id)
    except Exception:
        highlights = {
            "executiveSummary": "Data Console metrics computed; narrative unavailable.",
            "maturityNarrative": "",
            "jobHighlights": [],
            "registerNarrative": "",
            "notes": [],
        }

    es = (highlights.get("executiveSummary") or "").strip()
    total_insights: List[Dict[str, Any]] = []
    if es:
        total_insights.append({"title": "Data Console", "text": es, "severity": "info"})
    mh = highlights.get("maturityNarrative") or ""
    if mh.strip():
        total_insights.append({"title": "Maturity", "text": mh.strip()[:1200], "severity": "info"})

    day_key = utc_day_key()

    return {
        "totalInsights": total_insights[:10],
        "kpis": [],
        "charts": [],
        "trends": [{"text": str(n)} for n in (highlights.get("notes") or []) if str(n).strip()][:6],
        "risks": [],
        "positives": [],
        "recommendations": [],
        "maturityScore": {
            "score": overall_maturity.get("overall"),
            "comment": (mh or es)[:500] if (mh or es) else "",
        },
        "columnInsights": [],
        "rowInsights": [],
        "analysisSummary": {
            "system_health": es[:400] if es else "",
            "key_risks": [],
            "root_causes": [],
            "recommendations": [],
        },
        "dataConsoleHome": {"metrics": metrics, "highlights": highlights},
        "analysisMeta": {
            "dayKey": day_key,
            "rowsAnalyzed": int(len(sample_for_maturity)),
            "anomalyRows": 0,
            "chunkCount": 0,
            "model": model_id,
            "provider": "azure_openai",
            "consoleKind": "data-home",
        },
    }


def _to_df(rows: List[Dict[str, Any]]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows).copy()
    df.columns = [str(col) for col in df.columns]
    return df


def _safe_int(value: Any) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def _normalize_hashable_value(value: Any) -> Any:
    """Convert complex objects to stable strings for uniqueness/counting."""
    if isinstance(value, (dict, list, tuple, set)):
        try:
            return json.dumps(value, sort_keys=True, ensure_ascii=False, default=str)
        except Exception:
            return str(value)
    return value


def _safe_nunique(series: pd.Series, dropna: bool = True) -> int:
    prepared = series.map(_normalize_hashable_value)
    return int(prepared.nunique(dropna=dropna))


def _chart_from_value_counts(series: pd.Series, title: str, chart_id: str, top_n: int = 8) -> Optional[Dict[str, Any]]:
    clean = series.fillna("NULL").astype(str)
    counts = clean.value_counts().head(top_n)
    if counts.empty:
        return None
    return {
        "id": chart_id,
        "type": "bar",
        "title": title,
        "xAxis": list(counts.index.astype(str)),
        "series": [{"name": "Count", "values": [int(v) for v in counts.values.tolist()]}],
    }


def _sample_values(series: pd.Series, limit: int = 5) -> List[Any]:
    values = []
    for value in series.dropna().tolist():
        normalized = value.item() if hasattr(value, "item") else value
        if normalized not in values:
            values.append(normalized)
        if len(values) >= limit:
            break
    return values


def _build_column_profiles(
    df: pd.DataFrame,
    max_columns: int = 12,
    focus_columns: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    # Order columns: focus first (that exist in df), then the rest
    cols_order: List[str] = []
    if focus_columns:
        for c in focus_columns:
            if c in df.columns and c not in cols_order:
                cols_order.append(str(c))
    for c in df.columns:
        if str(c) not in cols_order:
            cols_order.append(str(c))
    profiles: List[Dict[str, Any]] = []
    total_rows = max(len(df), 1)
    for col in cols_order:
        if col not in df.columns:
            continue
        series = df[col]
        missing_count = int(series.isna().sum())
        distinct_count = _safe_nunique(series, dropna=True)
        profile: Dict[str, Any] = {
            "column": str(col),
            "dtype": str(series.dtype),
            "missing_count": missing_count,
            "missing_ratio": round(missing_count / total_rows, 4),
            "distinct_count": distinct_count,
            "non_null_count": int(series.notna().sum()),
            "sample_values": _sample_values(series),
        }
        if pd.api.types.is_numeric_dtype(series):
            # Bool is treated as numeric by pandas, but quantile on bool can fail.
            if pd.api.types.is_bool_dtype(series):
                true_count = int(series.fillna(False).astype(bool).sum())
                profile["numeric_stats"] = {
                    "min": 0.0,
                    "max": 1.0,
                    "mean": float(round((true_count / max(int(series.notna().sum()), 1)), 4)),
                    "median": float(1.0 if true_count >= max(1, int(series.notna().sum() / 2)) else 0.0),
                    "p95": float(1.0 if true_count > 0 else 0.0),
                }
                profiles.append(profile)
                continue
            numeric = pd.to_numeric(series, errors="coerce").dropna()
            if not numeric.empty:
                profile["numeric_stats"] = {
                    "min": float(numeric.min()),
                    "max": float(numeric.max()),
                    "mean": float(round(numeric.mean(), 2)),
                    "median": float(round(numeric.median(), 2)),
                    "p95": float(round(numeric.quantile(0.95), 2)),
                }
        else:
            value_counts = series.fillna("NULL").astype(str).value_counts().head(5)
            profile["top_values"] = [
                {"value": str(k), "count": int(v)} for k, v in value_counts.to_dict().items()
            ]
        profiles.append(profile)
    profiles.sort(key=lambda item: (item["missing_ratio"], item["distinct_count"]), reverse=True)
    return profiles[:max_columns]


def _build_row_level_summary(anomalies: List[Dict[str, Any]], max_examples_per_issue: int = 3) -> Dict[str, Any]:
    by_issue: Dict[str, List[Dict[str, Any]]] = {}
    for item in anomalies:
        by_issue.setdefault(item["issue"], []).append(item)
    issue_counts = {issue: len(items) for issue, items in by_issue.items()}
    examples = {
        issue: items[:max_examples_per_issue]
        for issue, items in by_issue.items()
    }
    return {
        "total_anomaly_rows": len(anomalies),
        "issue_counts": issue_counts,
        "examples_by_issue": examples,
    }


def _build_row_health_summary(df: pd.DataFrame, anomalies: List[Dict[str, Any]]) -> Dict[str, Any]:
    if df.empty:
        return {
            "complete_rows": 0,
            "rows_with_missing_values": 0,
            "sparse_rows": 0,
            "duplicate_rows": 0,
            "healthy_rows": 0,
        }
    total_rows = len(df)
    non_null_counts = df.notna().sum(axis=1)
    sparse_threshold = max(1, len(df.columns) // 3)
    sparse_rows = int((non_null_counts < sparse_threshold).sum())
    rows_with_missing_values = int((df.isna().sum(axis=1) > 0).sum())
    complete_rows = int((df.isna().sum(axis=1) == 0).sum())
    duplicate_rows = int(df.astype(str).duplicated().sum())
    anomaly_row_ids = {str(item.get("row_id")) for item in anomalies}
    healthy_rows = max(total_rows - len(anomaly_row_ids), 0)
    return {
        "complete_rows": complete_rows,
        "rows_with_missing_values": rows_with_missing_values,
        "sparse_rows": sparse_rows,
        "duplicate_rows": duplicate_rows,
        "healthy_rows": healthy_rows,
    }


def _severity_from_missing_ratio(missing_ratio: float) -> str:
    if missing_ratio >= 0.5:
        return "high"
    if missing_ratio >= 0.2:
        return "medium"
    return "low"


def _default_total_insights(summary: Dict[str, Any], row_health: Dict[str, Any]) -> List[Dict[str, Any]]:
    stats = summary.get("statistics", {})
    total_rows = int(stats.get("total_rows", 0))
    total_columns = int(stats.get("total_columns", 0))
    missing_rate = float(stats.get("missing_cell_rate", 0))
    duplicate_rows = int(stats.get("duplicate_rows", 0))
    healthy_rows = int(row_health.get("healthy_rows", 0))
    return [
        {
            "title": "Dataset coverage",
            "text": f"The dataset contains {total_rows} rows across {total_columns} columns, giving a broad view of the current data state.",
            "severity": "low",
        },
        {
            "title": "Overall quality",
            "text": f"Approximately {round(missing_rate * 100, 2)}% of all cells are missing and {duplicate_rows} duplicate rows were detected.",
            "severity": "high" if missing_rate >= 0.2 or duplicate_rows > 0 else "low",
        },
        {
            "title": "Operational stability",
            "text": f"{healthy_rows} rows are currently free from detected issues, while the remainder need closer review.",
            "severity": "medium" if healthy_rows < total_rows else "low",
        },
    ]


def _default_column_insights(summary: Dict[str, Any]) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []
    for profile in summary.get("column_profiles", []):
        column = profile.get("column", "Unknown")
        missing_ratio = float(profile.get("missing_ratio", 0))
        distinct_count = int(profile.get("distinct_count", 0))
        dtype = profile.get("dtype", "unknown")
        top_values = profile.get("top_values", [])
        top_value_text = ""
        if top_values:
            first = top_values[0]
            top_value_text = f" Top value is {first.get('value')} ({first.get('count')} rows)."
        insight = (
            f"Column '{column}' is typed as {dtype}, has {round(missing_ratio * 100, 2)}% missing values, "
            f"and {distinct_count} distinct values.{top_value_text}"
        )
        recommendation = (
            "Review source mapping and required-field rules."
            if missing_ratio >= 0.2
            else "Monitor this column for distribution drift."
        )
        insights.append(
            {
                "column": column,
                "insight": insight,
                "severity": _severity_from_missing_ratio(missing_ratio),
                "recommendation": recommendation,
            }
        )
    return insights


def _default_row_insights(row_summary: Dict[str, Any], anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []
    issue_counts = row_summary.get("issue_counts", {})
    for issue, count in issue_counts.items():
        insights.append(
            {
                "issue": issue,
                "insight": f"{count} rows are affected by '{issue}' based on preprocessing checks.",
                "operational_risk": "Rows in this group may cause incomplete reporting or operational blind spots.",
                "recommendation": f"Prioritize validating the source fields that create '{issue}' and correct them in bulk where possible.",
            }
        )
    if not insights:
        insights.append(
            {
                "issue": "healthy_rows",
                "insight": "No anomaly groups were detected across the current rows.",
                "operational_risk": "Low immediate operational risk from row-level rule checks.",
                "recommendation": "Continue monitoring for daily drift and emerging anomalies.",
            }
        )
    return insights


def _build_chart_data(df: pd.DataFrame, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    charts: List[Dict[str, Any]] = []
    if df.empty:
        return charts
    issue_counts: Dict[str, int] = {}
    for item in anomalies:
        issue_counts[item["issue"]] = issue_counts.get(item["issue"], 0) + 1
    if issue_counts:
        charts.append(
            {
                "id": "anomaly_issues",
                "type": "pie",
                "title": "Anomalies by Issue",
                "scope": "row",
                "xAxis": list(issue_counts.keys()),
                "series": [{"name": "Rows", "values": list(issue_counts.values())}],
            }
        )
    categorical_cols = [col for col in df.columns if _safe_nunique(df[col], dropna=True) <= 12]
    for col in categorical_cols[:2]:
        chart = _chart_from_value_counts(df[col], f"{col} distribution", f"dist_{col}")
        if chart:
            charts.append(chart)
    numeric_cols = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
    if numeric_cols:
        null_rates = [round(float(df[col].isna().mean()) * 100, 2) for col in numeric_cols[:8]]
        charts.append(
            {
                "id": "numeric_null_rates",
                "type": "area",
                "title": "Numeric Column Null Rates (%)",
                "scope": "column",
                "xAxis": numeric_cols[:8],
                "series": [{"name": "Null %", "values": null_rates}],
            }
        )
    missing_by_col = df.isnull().sum().sort_values(ascending=False)
    if not missing_by_col.empty and int(missing_by_col.iloc[0]) > 0:
        top_missing = missing_by_col.head(8)
        charts.append(
            {
                "id": "missing_by_column",
                "type": "bar",
                "title": "Missing Values by Column",
                "scope": "column",
                "xAxis": [str(col) for col in top_missing.index.tolist()],
                "series": [{"name": "Missing Rows", "values": [int(v) for v in top_missing.values.tolist()]}],
            }
        )
    row_health = _build_row_health_summary(df, anomalies)
    charts.append(
        {
            "id": "row_health_split",
            "type": "donut",
            "title": "Row Health Split",
            "scope": "row",
            "xAxis": ["Healthy", "Rows with issues", "Sparse", "Duplicates"],
            "series": [
                {
                    "name": "Rows",
                    "values": [
                        int(row_health.get("healthy_rows", 0)),
                        int(len(anomalies)),
                        int(row_health.get("sparse_rows", 0)),
                        int(row_health.get("duplicate_rows", 0)),
                    ],
                }
            ],
        }
    )
    completeness_bands = {
        "No missing": int((df.isna().sum(axis=1) == 0).sum()),
        "1-2 missing": int(((df.isna().sum(axis=1) >= 1) & (df.isna().sum(axis=1) <= 2)).sum()),
        "3+ missing": int((df.isna().sum(axis=1) >= 3).sum()),
    }
    charts.append(
        {
            "id": "row_completeness",
            "type": "bar",
            "title": "Row Completeness Distribution",
            "scope": "row",
            "xAxis": list(completeness_bands.keys()),
            "series": [{"name": "Rows", "values": list(completeness_bands.values())}],
        }
    )
    return charts


def _summarize_df(
    df: pd.DataFrame,
    focus_columns: Optional[List[str]] = None,
) -> Dict[str, Any]:
    if df.empty:
        return {
            "total_rows": 0,
            "columns": [],
            "missing_values": {},
            "distributions": {},
            "column_profiles": [],
            "row_level_summary": {"total_anomaly_rows": 0, "issue_counts": {}, "examples_by_issue": {}},
            "sample_rows": [],
            "user_focus_columns": [],
        }
    duplicate_rows = int(df.astype(str).duplicated().sum())
    missing_cells = int(df.isnull().sum().sum())
    # Column order: focus first when provided
    cols_ordered = list(df.columns)
    if focus_columns:
        focus_in_df = [c for c in focus_columns if c in df.columns]
        if focus_in_df:
            rest = [c for c in df.columns if c not in focus_in_df]
            cols_ordered = focus_in_df + rest
    stats = {
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "columns": [str(c) for c in cols_ordered],
        "missing_values": {str(k): int(v) for k, v in df.isnull().sum().to_dict().items()},
        "missing_cells": missing_cells,
        "missing_cell_rate": round(missing_cells / max(int(len(df) * max(len(df.columns), 1)), 1), 4),
        "duplicate_rows": duplicate_rows,
    }
    distributions: Dict[str, Dict[str, int]] = {}
    for col in df.columns:
        if _safe_nunique(df[col], dropna=True) <= 20:
            vc = df[col].fillna("NULL").astype(str).value_counts().head(20)
            distributions[str(col)] = {str(k): int(v) for k, v in vc.to_dict().items()}
    numeric_summary: Dict[str, Dict[str, float]] = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            series = pd.to_numeric(df[col], errors="coerce").dropna()
            if not series.empty:
                numeric_summary[str(col)] = {
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "mean": float(round(series.mean(), 2)),
                }
    result: Dict[str, Any] = {
        "statistics": stats,
        "numeric_summary": numeric_summary,
        "distributions": distributions,
        "column_profiles": _build_column_profiles(df, focus_columns=focus_columns),
        "sample_rows": df.head(12).where(pd.notnull(df), None).to_dict(orient="records"),
    }
    if focus_columns:
        result["user_focus_columns"] = [c for c in focus_columns if c in df.columns]
    return result


def _detect_anomalies(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    anomalies: List[Dict[str, Any]] = []
    cols = list(df.columns)
    def find_col(pattern: str) -> Optional[str]:
        regex = re.compile(pattern, re.I)
        for col in cols:
            if regex.search(str(col)):
                return str(col)
        return None

    id_col = find_col(r"\b(id|device_id|asset_id|record_id|key)\b") or cols[0]
    purchase_col = find_col(r"\b(purchase|order|invoice|cost)\b")
    status_col = find_col(r"\b(status|state|active)\b")
    last_seen_col = find_col(r"\b(last_seen|last activity|last_activity|updated|modified|last_used)\b")
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    for idx, row in df.iterrows():
        row_id = str(row.get(id_col) if pd.notna(row.get(id_col)) else idx)
        issue = None
        issue_column = None
        issue_detail = None
        if purchase_col and pd.isna(row.get(purchase_col)):
            issue = "missing_purchase"
            issue_column = purchase_col
            issue_detail = f"Missing value in purchase-related column '{purchase_col}'."
        elif status_col and last_seen_col:
            status = str(row.get(status_col) or "").strip().lower()
            if status in {"active", "true", "1", "yes"}:
                dt = pd.to_datetime(row.get(last_seen_col), errors="coerce", utc=True)
                if pd.notna(dt) and dt.to_pydatetime() < cutoff:
                    issue = "inactive_device"
                    issue_column = last_seen_col
                    issue_detail = (
                        f"Status is active but '{last_seen_col}' is older than 30 days."
                    )
        elif pd.isna(row.get(id_col)):
            issue = "missing_id"
            issue_column = id_col
            issue_detail = f"Primary identifier column '{id_col}' is empty."
        else:
            non_null_count = int(pd.notna(row).sum())
            if non_null_count < max(1, len(cols) // 3):
                issue = "sparse_row"
                issue_detail = f"Only {non_null_count} populated fields out of {len(cols)} columns."
        if issue:
            anomaly = {"row_id": row_id, "issue": issue}
            if issue_column:
                anomaly["column"] = issue_column
            if issue_detail:
                anomaly["detail"] = issue_detail
            anomalies.append(anomaly)
    return anomalies


def _build_kpis(df: pd.DataFrame, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    total_rows = int(len(df))
    anomaly_count = len(anomalies)
    kpis = [
        {"title": "Total Records", "value": total_rows, "description": "Rows analyzed from backend response data."},
        {"title": "Detected Anomalies", "value": anomaly_count, "description": "Anomaly rows identified before AI reasoning."},
    ]
    if total_rows:
        kpis.append(
            {
                "title": "Anomaly Rate",
                "value": f"{round((anomaly_count / total_rows) * 100, 2)}%",
                "description": "Share of rows flagged by deterministic anomaly rules.",
            }
        )
    null_counts = df.isnull().sum().sort_values(ascending=False) if not df.empty else pd.Series(dtype="int64")
    if not null_counts.empty:
        top_col = str(null_counts.index[0])
        kpis.append(
            {
                "title": "Most Incomplete Column",
                "value": top_col,
                "description": f"{int(null_counts.iloc[0])} missing values in the most incomplete column.",
            }
        )
    return kpis


def _base_analysis(df: pd.DataFrame, anomalies: List[Dict[str, Any]], charts: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_rows = int(len(df))
    issue_counts: Dict[str, int] = {}
    for item in anomalies:
        issue_counts[item["issue"]] = issue_counts.get(item["issue"], 0) + 1
    row_level_summary = _build_row_level_summary(anomalies)
    row_health = _build_row_health_summary(df, anomalies)
    summary = _summarize_df(df)
    risks = [{"text": f"{issue}: {count} rows"} for issue, count in issue_counts.items()]
    positives = []
    if total_rows and not anomalies:
        positives.append({"text": "No anomaly rows were detected in the current daily snapshot."})
    elif total_rows:
        positives.append({"text": f"{total_rows} rows were preprocessed successfully without sending raw tables to the model."})
    recommendations = [{"text": "Review the highest-frequency anomaly group first and validate source-system mappings."}]
    maturity_score = {
        "score": max(0, min(100, 100 - int((len(anomalies) / max(total_rows, 1)) * 100))),
        "comment": "Higher score means fewer detected anomalies relative to total rows.",
    }
    trends = [{"text": "Daily cache is used for first analysis of the day; compare tomorrow's run to spot drift."}]
    return {
        "totalInsights": _default_total_insights(summary, row_health),
        "kpis": _build_kpis(df, anomalies),
        "charts": charts,
        "trends": trends,
        "maturityScore": maturity_score,
        "risks": risks,
        "positives": positives,
        "recommendations": recommendations,
        "columnInsights": _default_column_insights(summary),
        "rowInsights": _default_row_insights(row_level_summary, anomalies),
    }


def _chunk_list(items: List[Dict[str, Any]], chunk_size: int = 50) -> List[List[Dict[str, Any]]]:
    if not items:
        return [[]]
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def _extract_json_block(content: str) -> Dict[str, Any]:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
        if "\n" in text:
            text = text.split("\n", 1)[1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _llm_chat(
    settings: Settings,
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 2000,
    json_mode: bool = False,
) -> str:
    cfg = _get_model_config(settings, model_id)
    provider = cfg.get("provider", "azure_openai")
    payload = {"messages": messages, "temperature": 0.2, "max_tokens": max_tokens}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    if provider == "azure_openai":
        api_key = cfg["api_key"]
        if not api_key:
            raise HTTPException(status_code=503, detail="Azure OpenAI API key is not configured.")
        headers = {"Content-Type": "application/json", "api-key": api_key}
        url = _azure_chat_url(settings, model_id)
    for attempt in range(2):
        try:
                resp = requests.post(url, headers=headers, json=payload, timeout=180)
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach Azure OpenAI: {exc}") from exc
        if resp.ok:
            data = resp.json()
            return (data.get("choices", [{}])[0].get("message", {}) or {}).get("content", "")
        if resp.status_code == 429:
            retry_after = _extract_retry_after_seconds(resp) or 60
            if attempt == 0 and retry_after <= 10:
                time.sleep(retry_after)
                continue
            raise HTTPException(
                status_code=429,
                    detail=f"Azure OpenAI is temporarily rate-limited. Wait about {retry_after} seconds.",
            )
        raise HTTPException(status_code=502, detail=f"Azure OpenAI returned {resp.status_code}: {resp.text[:500]}")
        raise HTTPException(status_code=429, detail="Azure OpenAI is temporarily rate-limited.")

    if provider == "openai":
        api_key = cfg.get("api_key")
        if not api_key:
            raise HTTPException(status_code=503, detail="OpenAI API key is not configured.")
        payload["model"] = cfg.get("model", "gpt-4o")
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        url = "https://api.openai.com/v1/chat/completions"
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=180)
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach OpenAI: {exc}") from exc
        if not resp.ok:
            raise HTTPException(status_code=502, detail=f"OpenAI returned {resp.status_code}: {resp.text[:500]}")
        data = resp.json()
        return (data.get("choices", [{}])[0].get("message", {}) or {}).get("content", "")

    raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")


def _parse_ai_json_with_repair(settings: Settings, content: str, model_id: str) -> Dict[str, Any]:
    try:
        return _extract_json_block(content)
    except json.JSONDecodeError:
        repair_messages = [
            {
                "role": "system",
                "content": (
                    "You repair malformed JSON. Return only valid JSON with the same structure and intent. "
                    "Do not add markdown, explanations, or comments."
                ),
            },
            {
                "role": "user",
                "content": f"Repair this malformed JSON and return valid JSON only:\n\n{content}",
            },
        ]
        repaired = _llm_chat(settings, model_id, repair_messages, max_tokens=1500, json_mode=True)
        try:
            return _extract_json_block(repaired)
        except json.JSONDecodeError as exc:
            snippet = (content or "")[:1000]
            raise HTTPException(
                status_code=502,
                detail=f"AI returned invalid JSON after repair attempt. Response snippet: {snippet}",
            ) from exc


def _format_session_feedback_for_prompt(feedback: List[Dict[str, Any]]) -> str:
    if not feedback:
        return "(none yet)"
    lines: List[str] = []
    for f in feedback[-30:]:
        ft = f.get("feedbackType")
        if not ft and f.get("useful") is True:
            ft = "helpful"
        lines.append(
            f"- [{ft or 'unknown'}] insightId={f.get('kpiId')} type={f.get('insightType')} "
            f"comment={f.get('comment') or '—'}"
        )
    return "\n".join(lines)


def _build_compact_data_summary_for_chat(analysis: Dict[str, Any]) -> str:
    """Single readable block so chat models anchor on real numbers (not generic advice)."""
    lines: List[str] = []
    meta = analysis.get("analysisMeta") or {}
    if meta:
        lines.append(f"Rows analyzed (this run): {meta.get('rowsAnalyzed', 'unknown')}")
        lines.append(f"Anomaly rows (sample basis): {meta.get('anomalyRows', 'unknown')}")
    ms = analysis.get("maturityScore") or {}
    if ms:
        comment = str(ms.get("comment") or "")[:500]
        lines.append(f"Maturity: score={ms.get('score')} — {comment}")
    summ = analysis.get("analysisSummary") or {}
    if summ:
        lines.append(f"System health: {summ.get('system_health', '')}")
        kr = summ.get("key_risks") or []
        if kr:
            lines.append("Key risks: " + "; ".join(str(x)[:160] for x in kr[:6]))
    for kpi in (analysis.get("kpis") or [])[:14]:
        lines.append(
            f"KPI: {kpi.get('title')} = {kpi.get('value')} — {str(kpi.get('description') or '')[:220]}"
        )
    for ti in (analysis.get("totalInsights") or [])[:8]:
        blob = str(ti.get("title") or ti.get("text") or "")[:260]
        if blob.strip():
            lines.append(f"Total insight: {blob}")
    imp = analysis.get("importTracing") if isinstance(analysis.get("importTracing"), dict) else {}
    if imp:
        lines.append(
            f"Import tracing: totalRows={imp.get('totalRows')} "
            f"statusCounts={json.dumps(imp.get('statusCounts') or {}, default=str)[:400]}"
        )
    reg = analysis.get("registerTracing") if isinstance(analysis.get("registerTracing"), dict) else {}
    if reg:
        m = reg.get("multiTableConnection") or {}
        lines.append(
            f"Register compare: multiTable={m.get('multiTableRegisterIds')}/{m.get('totalRegisterIds')} "
            f"totalRows={reg.get('totalRows')}"
        )
    text = "\n".join(lines)
    return text[:14000] if len(text) > 14000 else text


def _chat_system_prompt(
    analysis_summary: Dict[str, Any],
    charts: List[Dict[str, Any]],
    analysis_context: Dict[str, Any],
    feedback: List[Dict[str, Any]],
) -> str:
    compact = (analysis_context or {}).get("compactSummaryText") or ""
    ctx_for_dump = {k: v for k, v in (analysis_context or {}).items() if k != "compactSummaryText"}
    fb_text = _format_session_feedback_for_prompt(feedback)
    return (
        "You are a senior Data Analyst and Data Quality Expert.\n"
        "Use the cached daily analysis as the authoritative understanding of today's dataset.\n"
        "Continue the conversation consistently across this user's same-day session.\n\n"
        "SESSION FEEDBACK (remember for this user+page+dataset until they clear the session):\n"
        "- HELPFUL: user wants more in this vein — prefer deeper, advanced follow-ups tied to the same KPIs/themes.\n"
        "- NOT_HELPFUL: user wants a similar insight but revised — their comment is the spec; do not dismiss the topic.\n"
        "- IRRELEVANT: user hid that insight — do not echo that angle or recommendation.\n\n"
        "DATA GROUNDING (mandatory):\n"
        "- STRUCTURED DATA SUMMARY + analysisSummary + expanded context are derived from today's dataset.\n"
        "- Quote KPI names, values, maturity, tracing counts, and risks from these blocks only.\n"
        "- If the answer is not supported by the summary, say the snapshot does not contain that detail—do not invent.\n\n"
        "Answer in plain text, not JSON. Do not use markdown tables.\n"
        "Match your answer to the question:\n"
        "- Broad questions: Summary, Findings, Recommended actions (short bullets).\n"
        "- Narrow factual questions: direct concise answers citing KPIs/insights above.\n"
        "- Casual chat: brief and still tied to dataset when relevant.\n\n"
        f"STRUCTURED DATA SUMMARY (primary grounding — cite from here):\n{compact or '(empty)'}\n\n"
        f"analysisSummary JSON:\n{json.dumps(analysis_summary, indent=2, default=str)}\n\n"
        f"Dashboard charts:\n{json.dumps(charts, indent=2, default=str)}\n\n"
        f"Expanded analysis context:\n{json.dumps(ctx_for_dump, indent=2, default=str)}\n\n"
        f"Session feedback log (chronological):\n{fb_text}"
    )


def _analysis_system_prompt(analysis_profile: Optional[str] = None) -> str:
    profile = (analysis_profile or "").strip().lower()
    profile_guidance = ""
    if profile.startswith("admin-console/overview/"):
        module = profile.rsplit("/", 1)[-1]
        module_guidance_map = {
            "import-status": (
                "This dataset is from Admin Console Import Status.\n"
                "Prioritize pipeline execution health, status distribution, failure/stuck signals, and recency.\n"
                "KPIs should focus on run success/failure/pending counts, status drift, and operational risk."
            ),
            "saved-jobs": (
                "This dataset is from Admin Console Saved Jobs.\n"
                "Prioritize scheduling coverage, source diversity, active/inactive job hygiene, and object ownership gaps.\n"
                "KPIs should focus on total jobs, active ratio, source mix, and stale configuration indicators."
            ),
            "ar-mapping": (
                "This dataset is from Admin Console AR Mapping.\n"
                "Prioritize mapping completeness, object/table coverage, and mapping consistency risks.\n"
                "KPIs should focus on mapped entities, concentration risks, and likely unmapped hotspots."
            ),
            "ar-rules": (
                "This dataset is from Admin Console AR Rules.\n"
                "Prioritize rule coverage, rule type concentration, and governance/maintainability risks.\n"
                "KPIs should focus on total rules, object spread, and potential rule duplication or blind spots."
            ),
        }
        profile_guidance = module_guidance_map.get(module, "")
    elif profile == "admin-console/overview":
        profile_guidance = (
            "This dataset is an Admin Console cross-module overview.\n"
            "Balance findings across Import Status, Saved Jobs, AR Mapping, and AR Rules without over-indexing one module."
        )
    elif "data-console/reports/original-source/jobs/" in profile or "data-console/reports/by-ar-resource/jobs/" in profile:
        profile_guidance = (
            "This is a report job detail page with Import Data Tracing (AC = Original Source, DC = By AR Resource).\n"
            "The model may receive importTracing JSON including deepAnalysis (field-level old→new JSON diffs, "
            "AC_new vs DC_new misalignment, inventory/status transitions).\n"
            "Prioritize extensive, specific insights grounded in that tracing: cite fields, row identifiers (numberID), "
            "and tracing status. Add multiple totalInsights and rowInsights that interpret import drift, not only KPIs from the grid."
        )
    elif (profile or "").split("?", 1)[0].rstrip("/") == "data-console/register/detailed":
        profile_guidance = (
            "This page is Asset Register detailed. Authoritative tracing is ONLY from registerTracing built from "
            "AssetRegister/getTracingComapreTable (NOT ImportDataTracing / getImportDataTracing).\n"
            "Do NOT analyze register rows like report import tracing (old vs new JSON value diffs on AC/DC inventory fields).\n"
            "PRIMARY quality signal: each registerId's connected report tables (AR_* job/table keys). "
            "If a registerId is connected to MORE THAN ONE tableName (>1), that is a high-risk ambiguity — prioritize counting, "
            "explaining, and recommending remediation for those rows.\n"
            "Use multiTableConnection counts and multiTableExamples; cite registerId and connectedTables lists.\n"
            "RegisterTracingStatus and table-level status breakdowns are supporting context; multi-table connectivity dominates risk scoring."
        )

    return (
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
        "If USER CUSTOM PROMPT explicitly requests additional KPIs/metrics or changes to the KPI list, reflect it in the returned `kpis` array (and adjust `charts` when appropriate).\n\n"
        f"ANALYSIS PROFILE GUIDANCE:\n{profile_guidance if profile_guidance else 'Use default cross-domain analysis behavior.'}"
    )


def _build_chat_analysis_context(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Compact but rich context for chat quality (grounded answers, low token overhead)."""
    def _texts(items: Any, limit: int = 6) -> List[str]:
        out: List[str] = []
        for x in (items or [])[:limit]:
            if isinstance(x, str):
                out.append(x)
            elif isinstance(x, dict):
                out.append(
                    str(
                        x.get("text")
                        or x.get("insight")
                        or x.get("title")
                        or x.get("issue")
                        or x.get("column")
                        or ""
                    )
                )
        return [t for t in out if t]

    def _brief_import_tracing(t: Any) -> Dict[str, Any]:
        if not isinstance(t, dict) or not t:
            return {}
        return {
            "totalRows": t.get("totalRows"),
            "statusCounts": t.get("statusCounts"),
            "dataSource": t.get("dataSource"),
        }

    def _brief_register_tracing(t: Any) -> Dict[str, Any]:
        if not isinstance(t, dict) or not t:
            return {}
        m = t.get("multiTableConnection") or {}
        return {
            "compareTableApi": t.get("compareTableApi"),
            "totalRows": t.get("totalRows"),
            "multiTableConnection": {
                "multiTableRegisterIds": m.get("multiTableRegisterIds"),
                "totalRegisterIds": m.get("totalRegisterIds"),
            },
        }

    return {
        "compactSummaryText": _build_compact_data_summary_for_chat(analysis),
        "kpis": (analysis.get("kpis") or [])[:10],
        "totalInsights": (analysis.get("totalInsights") or [])[:8],
        "trends": _texts(analysis.get("trends"), limit=8),
        "risks": _texts(analysis.get("risks"), limit=8),
        "positives": _texts(analysis.get("positives"), limit=8),
        "recommendations": _texts(analysis.get("recommendations"), limit=8),
        "columnInsightsSample": (analysis.get("columnInsights") or [])[:12],
        "rowInsightsSample": (analysis.get("rowInsights") or [])[:12],
        "importTracing": _brief_import_tracing(analysis.get("importTracing")),
        "registerTracing": _brief_register_tracing(analysis.get("registerTracing")),
        "analysisMeta": analysis.get("analysisMeta") or {},
    }


def _build_chat_turn_prompt(
    latest_user_question: str,
    analysis_context: Dict[str, Any],
) -> str:
    """
    Build a focused per-turn instruction so chat replies stay holistic AND grounded
    in the current question + most relevant dataset context.
    """
    q = (latest_user_question or "").strip()
    q_tokens = {t for t in re.findall(r"[a-z0-9_]+", q.lower()) if len(t) >= 3}

    def _score_text(text: str) -> int:
        txt = (text or "").lower()
        if not txt:
            return 0
        score = 0
        for t in q_tokens:
            if t in txt:
                score += 1
        return score

    # Flatten a few candidate lines and rank by overlap with the question.
    candidates: List[str] = []
    for kpi in (analysis_context.get("kpis") or []):
        title = str(kpi.get("title") or "")
        value = str(kpi.get("value") or "")
        desc = str(kpi.get("description") or "")
        if title or value or desc:
            candidates.append(f"KPI: {title} = {value}. {desc}".strip())
    for section in ["trends", "risks", "positives", "recommendations"]:
        for line in (analysis_context.get(section) or []):
            candidates.append(f"{section[:-1].title()}: {str(line)}")
    for row in (analysis_context.get("columnInsightsSample") or [])[:8]:
        candidates.append(f"Column: {row.get('column')}. {row.get('insight')}. {row.get('recommendation') or ''}")
    for row in (analysis_context.get("rowInsightsSample") or [])[:8]:
        candidates.append(f"Row issue: {row.get('issue')}. {row.get('insight')}. {row.get('recommendation') or ''}")

    ranked = sorted(candidates, key=_score_text, reverse=True)
    top_relevant = [c for c in ranked[:10] if c and len(c.strip()) > 0]
    if not top_relevant:
        top_relevant = [c for c in candidates[:6] if c]

    return (
        "CURRENT USER QUESTION:\n"
        f"{q}\n\n"
        "MOST RELEVANT DATA CONTEXT FOR THIS QUESTION:\n"
        f"{json.dumps(top_relevant[:10], indent=2, default=str)}\n\n"
        "ANSWER QUALITY RULES:\n"
        "- Give a holistic answer directly tied to the question and dataset context above.\n"
        "- Explain: what it means, why it matters, and what to do next.\n"
        "- Cite concrete data points when available (KPI names/values, trends, statuses, counts).\n"
        "- If exact data is unavailable for a part of the question, state that clearly and use closest available evidence.\n"
        "- Avoid generic textbook advice that is not tied to this dataset."
    )


def _resolve_global_analysis_scope(payload: GlobalChatRequest) -> tuple[str, str, Dict[str, Any]]:
    route = str(payload.route or "").strip().lstrip("/")
    module_key = str(payload.moduleKey or "").strip()
    ctx: Dict[str, Any] = dict(payload.contextFilters or {})
    selected_raw = ctx.get("selectedObject")
    if selected_raw is None or str(selected_raw).strip() == "":
        selected_raw = ctx.get("objectId")
    selected_object = (
        None if selected_raw is None or str(selected_raw).strip() == "" else str(selected_raw).strip()
    )

    admin_page_map: Dict[str, str] = {
        "dashboards": "admin-console/overview",
        "overview": "admin-console/overview",
        "general": "admin-console/overview",
        "import-status": "admin-console/overview/import-status",
        "saved-jobs": "admin-console/overview/saved-jobs",
        "ar-mapping": "admin-console/overview/ar-mapping",
        "ar-rules": "admin-console/overview/ar-rules",
    }

    if payload.consoleType == "admin":
        admin_mod = str(ctx.get("adminModule") or "").strip().lower()
        if not admin_mod:
            admin_mod = module_key or "overview"
        page_id = admin_page_map.get(admin_mod, "admin-console/overview")
        admin_dd: Dict[str, Any] = {
            "tableType": "admin-console",
            "moduleKey": admin_mod,
        }
        if selected_object is not None:
            admin_dd["objectId"] = selected_object
        un = ctx.get("userName")
        if un is not None and str(un).strip() != "":
            admin_dd["userName"] = str(un).strip()
        filters_admin: Dict[str, Any] = {**ctx, "dashboardData": admin_dd}
        if selected_object is not None:
            filters_admin["objectId"] = selected_object
        return page_id, "admin-console", filters_admin

    data_module = str(ctx.get("dataModule") or "").strip().lower()
    if data_module == "dashboards":
        dd_dash: Dict[str, Any] = {"tableType": "data-console-home"}
        if selected_object is not None:
            dd_dash["objectId"] = selected_object
        flt_dash: Dict[str, Any] = {**ctx, "dashboardData": dd_dash}
        if selected_object is not None:
            flt_dash["objectId"] = selected_object
        return "data-console/overview", "data-console-home", flt_dash

    if data_module == "register":
        dd_reg: Dict[str, Any] = {"tableType": "register"}
        if selected_object is not None:
            dd_reg["objectId"] = selected_object
        flt_reg: Dict[str, Any] = {**ctx, "dashboardData": dd_reg}
        if selected_object is not None:
            flt_reg["objectId"] = selected_object
        if selected_object is None:
            dd_fb: Dict[str, Any] = {"tableType": "data-console-home"}
            return "data-console/overview", "data-console-home", {**ctx, "dashboardData": dd_fb}
        return "data-console/register/detailed", "register", flt_reg

    if data_module == "reports":
        job = str(ctx.get("reportJobName") or "").strip()
        dd_rep: Dict[str, Any] = {"tableType": "original-source", "dataSource": "AC"}
        if selected_object is not None:
            dd_rep["objectId"] = selected_object
        flt_rep: Dict[str, Any] = {**ctx, "dashboardData": dd_rep}
        if selected_object is not None:
            flt_rep["objectId"] = selected_object
        if job and selected_object is not None:
            flt_rep["jobName"] = job
            return f"data-console/reports/original-source/jobs/{job}", "generic", flt_rep
        return "data-console/reports/original-source", "jobs", flt_rep

    if data_module == "security":
        sub = str(ctx.get("securitySubModule") or "users").strip().lower()
        if sub == "permission":
            sub = "permissions"
        if sub not in ("users", "groups", "roles", "permissions"):
            sub = "users"
        dd_sec: Dict[str, Any] = {"tableType": "security", "securitySubModule": sub}
        if selected_object is not None:
            dd_sec["objectId"] = selected_object
        flt_sec: Dict[str, Any] = {**ctx, "dashboardData": dd_sec}
        if selected_object is not None:
            flt_sec["objectId"] = selected_object
        return f"data-console/security/{sub}", "generic", flt_sec

    if route in ("", "data-console", "data-console/"):
        return (
            "data-console/overview",
            "data-console-home",
            {
                "dashboardData": {
                    "tableType": "data-console-home",
                    **({"objectId": selected_object} if selected_object is not None else {}),
                },
                **ctx,
            },
        )

    # Data console: prefer actual supported page if route matches.
    if _is_supported_page_id(route):
        category = "register" if route == "data-console/register/detailed" else "generic"
        filters: Dict[str, Any] = {**ctx}
        dashboard: Dict[str, Any] = dict(filters.get("dashboardData") or {})

        if selected_object is not None:
            dashboard["objectId"] = selected_object
        if route == "data-console/register/detailed":
            dashboard["tableType"] = "register"
        elif route.startswith("data-console/reports/original-source"):
            dashboard["tableType"] = "original-source"
            dashboard["dataSource"] = "AC"
        elif route.startswith("data-console/reports/by-ar-resource"):
            dashboard["tableType"] = "by-ar-resource"
            dashboard["dataSource"] = "DC"

        job_segment = route.rsplit("/", 1)[-1] if "/jobs/" in route else ""
        if job_segment and job_segment not in ("jobs", "original-source", "by-ar-resource"):
            filters["jobName"] = job_segment

        # Fetchers read filters.dashboardData.objectId and filters.objectId — set both.
        if dashboard:
            filters["dashboardData"] = dashboard
            if selected_object is not None:
                filters["objectId"] = selected_object

        # Job detail + register detailed require objectId to call Spring. Without it, use jobs list so chat still works.
        needs_object = (
            ("/jobs/" in route and job_segment and job_segment not in ("jobs",))
            or route == "data-console/register/detailed"
        )
        if needs_object and selected_object is None:
            if route.startswith("data-console/reports/by-ar-resource"):
                route = "data-console/reports/by-ar-resource"
            else:
                route = "data-console/reports/original-source"
            category = "jobs"
            filters.pop("jobName", None)
            nd = dict(filters.get("dashboardData") or {})
            nd.pop("objectId", None)
            if route == "data-console/reports/by-ar-resource":
                nd["tableType"] = "by-ar-resource"
                nd["dataSource"] = "DC"
            else:
                nd["tableType"] = "original-source"
                nd["dataSource"] = "AC"
            filters["dashboardData"] = nd
            filters.pop("objectId", None)

        return route, category, filters

    # Fallback to original-source list (requires no objectId).
    out = {**ctx}
    if selected_object is not None:
        out["objectId"] = selected_object
        out["dashboardData"] = {**(out.get("dashboardData") or {}), "objectId": selected_object}
    return "data-console/reports/original-source", "jobs", out


def _question_requests_insight(question: str) -> bool:
    q = (question or "").lower()
    return bool(
        re.search(
            r"\b(insight|summary|highlight|highlights|risk|risks|recommendation|recommendations|kpi|status|health|overview|trend|trends|chart|charts|graph|visual|visualize|dashboard)\b",
            q,
        )
    )


def _build_analysis_user_prompt(
    summary: Dict[str, Any],
    anomaly_chunk: List[Dict[str, Any]],
    chunk_index: int,
    chunk_total: int,
    feedback_instructions: Optional[str] = None,
    import_tracing_context: Optional[str] = None,
    register_tracing_context: Optional[str] = None,
) -> str:
    base = (
        "DATASET SUMMARY:\n"
        f"{json.dumps(summary, indent=2, default=str)}\n\n"
        f"ANOMALY CHUNK {chunk_index}/{chunk_total}:\n"
        f"{json.dumps(anomaly_chunk, indent=2)}\n\n"
        "Perform deep analysis at three levels:\n"
        "1. Total insights: overall dataset health, KPI patterns, maturity, operational themes, risk concentration.\n"
        "2. Column-level insights: cover every provided column profile with data quality, distribution, and operational meaning.\n"
        "3. Row-level insights: cover the full row summary plus the anomaly rows in this chunk, explaining operational meaning and next actions.\n"
        "Also provide charts that help frontend pages show the most useful visual summaries instantly.\n"
        "Provide structured outputs suitable for dashboards."
    )
    if feedback_instructions:
        base += f"\n\n{feedback_instructions}"
    if import_tracing_context:
        base += (
            "\n\n"
            "IMPORT DATA TRACING (ImportDataTracing API — authoritative):\n"
            f"{import_tracing_context}\n\n"
            "Incorporate this into maturityScore, risks, positives, recommendations, totalInsights, and rowInsights.\n"
            "When `deepAnalysis` is present: treat it as mandatory evidence. Reference concrete fields, counts, "
            "highImpactExamples (numberID / TracingStatus), inventoryStatusTransitions, and acDcNewMisalignedFields.\n"
            "Explain business meaning of old→new JSON deltas (e.g. model/manufacturer swaps, inventory status moves). "
            "Tie Partially Matched / null statuses to field-level drift where counts support it.\n"
            "Produce several distinct insights specifically about import tracing (not generic table stats only)."
        )
    if register_tracing_context:
        base += (
            "\n\n"
            "ASSET REGISTER — getTracingComapreTable CONTEXT (NOT ImportDataTracing):\n"
            f"{register_tracing_context}\n\n"
            "This JSON comes from getTracingComapreTable only. Ignore any importTracing / ImportDataTracing mental model.\n"
            "Primary task: identify registerIds with MORE THAN ONE connected report table (AR_*). Those are the main risks.\n"
            "Do NOT prioritize RegisterTracingOld_Json vs registerTracingNew_Json like AC/DC import field diffs on report pages.\n"
            "Use narrativeBullets and multiTableRowDetails when present. "
            "Quantify multiTableRegisterIds vs totalRegisterIds; cite multiTableExamples (registerId + connectedTables).\n"
            "Recommend how to resolve ambiguous multi-table links (single source of truth per registerId)."
        )
    return base


def _merge_llm_chunks(base: Dict[str, Any], llm_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    merged = dict(base)
    for key in ["totalInsights", "kpis", "charts", "trends", "risks", "positives", "recommendations", "columnInsights", "rowInsights"]:
        combined = list(base.get(key, []))
        seen = {json.dumps(item, sort_keys=True, default=str) for item in combined}
        for chunk in llm_chunks:
            for item in chunk.get(key, []) or []:
                marker = json.dumps(item, sort_keys=True, default=str)
                if marker not in seen:
                    seen.add(marker)
                    combined.append(item)
        merged[key] = combined
    if llm_chunks:
        last = llm_chunks[-1]
        merged["maturityScore"] = last.get("maturityScore") or merged.get("maturityScore")
        merged["analysisSummary"] = last.get("analysisSummary") or merged.get("analysisSummary", {})
    return merged


def _build_preprocessing_context(
    custom_prompt: Optional[str],
    feedback_list: List[Dict[str, Any]],
    chat_messages: List[Dict[str, str]],
) -> str:
    """Build a single context string from custom prompt, feedback, and chat for preprocessing and prompts."""
    parts: List[str] = []
    if (custom_prompt or "").strip():
        parts.append(f"USER CUSTOM PROMPT / FOCUS:\n{(custom_prompt or '').strip()}")
    if feedback_list:
        helpful = [
            f
            for f in feedback_list
            if f.get("feedbackType") == "helpful"
            or (
                f.get("useful") is True
                and f.get("feedbackType") not in ("not_helpful", "irrelevant")
            )
        ]
        not_helpful = [f for f in feedback_list if f.get("feedbackType") == "not_helpful"]
        irrelevant = [f for f in feedback_list if f.get("feedbackType") == "irrelevant"]
        if helpful:
            parts.append(
                "USER FEEDBACK - HELPFUL: strong positive signal for this session. Generate deeper, more advanced "
                "follow-on insights in the same thematic areas (drivers, segments, correlations, next-level metrics). "
                "Do not merely repeat prior wording—add net-new analytical depth where data supports it.\n"
                + json.dumps([{"insightId": f.get("kpiId"), "type": f.get("insightType")} for f in helpful[-10:]], default=str)
            )
        if not_helpful:
            parts.append(
                "USER FEEDBACK - NOT_HELPFUL: user wants these topics kept but improved on the next analysis. "
                "Rewrite with a clearer, more actionable insight; follow the comment. Do not omit the subject entirely "
                "unless the comment says to drop it.\n"
                + json.dumps(
                    [
                        {
                            "insightId": f.get("kpiId"),
                            "type": f.get("insightType"),
                            "comment": f.get("comment") or "please improve wording and usefulness",
                        }
                        for f in not_helpful[-12:]
                    ],
                    default=str,
                )
            )
        if irrelevant:
            parts.append(
                "USER FEEDBACK - IRRELEVANT: user chose to hide these; do not surface the same angle or near-duplicate "
                "insights again this session.\n"
                + json.dumps([{"insightId": f.get("kpiId"), "type": f.get("insightType")} for f in irrelevant[-20:]], default=str)
            )
    if chat_messages:
        recent = chat_messages[-14:]
        transcript = [
            {"role": m.get("role", "user"), "text": (m.get("content") or "")[:800]}
            for m in recent
        ]
        parts.append(
            "RECENT CHAT TRANSCRIPT (same session — infer recurring questions, priorities, and vocabulary; "
            "reflect these in new insights and KPI emphasis):\n"
            + json.dumps(transcript, default=str)
        )
    return "\n\n".join(parts) if parts else ""


def _get_focus_columns_heuristic(context: str, columns: List[str]) -> List[str]:
    """From preprocessing context, infer which columns to prioritize (mentioned by name)."""
    if not context or not columns:
        return []
    col_set = {str(c).lower() for c in columns}
    # Normalize: allow match by full name or by token (e.g. "purchase date" -> purchase, date)
    found: List[str] = []
    for col in columns:
        col_lower = str(col).lower()
        if col_lower in context.lower():
            found.append(str(col))
    # Preserve order of columns that appear in context; avoid duplicates
    seen = set()
    ordered: List[str] = []
    for c in found:
        if c not in seen:
            seen.add(c)
            ordered.append(c)
    return ordered


def _build_feedback_instructions(
    custom_prompt: Optional[str],
    feedback_list: List[Dict[str, Any]],
    chat_messages: List[Dict[str, str]],
) -> str:
    """Build prompt instructions from custom prompt, user feedback, and recent chat so the model can tailor insights."""
    context = _build_preprocessing_context(custom_prompt, feedback_list, chat_messages)
    if not context.strip():
        return ""
    return (
        "IMPORTANT - Use the following user focus, feedback, and chat to tailor insights and preprocessing emphasis.\n"
        "Session semantics (persist until session clear / new day):\n"
        "- HELPFUL: user wants more in this vein — prioritize advanced follow-on insights on those themes.\n"
        "- NOT_HELPFUL: user wants a similar insight but revised — follow each comment; keep the topic unless the comment says to drop it.\n"
        "- IRRELEVANT: user hid that insight — omit that angle entirely.\n"
        "- CHAT: treat recurring user questions and stated goals as signals for what to emphasize next.\n\n"
        + context
    )


def _status_counts_to_register_categories(status_counts: Dict[str, Any]) -> Dict[str, int]:
    """Map heterogeneous tracing statusCounts into stable categories for trend deltas."""
    def to_num(v: Any) -> int:
        if isinstance(v, (int, float)):
            return int(v)
        try:
            return int(str(v or "0").strip())
        except Exception:
            return 0

    matched = to_num(status_counts.get("Matched")) + to_num(status_counts.get("matched"))
    partially = to_num(status_counts.get("Partially Matched")) + to_num(
        status_counts.get("partially matched")
    )
    deleted = to_num(status_counts.get("Deleted")) + to_num(status_counts.get("deleted")) + to_num(
        status_counts.get("DELETED")
    )
    pending = (
        to_num(status_counts.get("Pending"))
        + to_num(status_counts.get("pending"))
        + to_num(status_counts.get("null"))
        + to_num(status_counts.get("Null"))
        + to_num(status_counts.get(""))
    )

    return {
        "Matched": matched,
        "Partially Matched": partially,
        "Deleted": deleted,
        "Pending": pending,
    }


def _status_counts_to_import_categories(status_counts: Dict[str, Any]) -> Dict[str, int]:
    """Map import-tracing statusCounts into stable categories for trend deltas."""

    def to_num(v: Any) -> int:
        if isinstance(v, (int, float)):
            return int(v)
        try:
            return int(str(v or "0").strip())
        except Exception:
            return 0

    matched = to_num(status_counts.get("Matched")) + to_num(status_counts.get("matched")) + to_num(
        status_counts.get("FULLY MATCHED")
    ) + to_num(status_counts.get("fully matched"))

    partially = to_num(status_counts.get("Partially Matched")) + to_num(
        status_counts.get("partially matched")
    )

    deleted = to_num(status_counts.get("Deleted")) + to_num(status_counts.get("deleted")) + to_num(
        status_counts.get("DELETED")
    )

    pending = (
        to_num(status_counts.get("null"))
        + to_num(status_counts.get("Null"))
        + to_num(status_counts.get(None))
        + to_num(status_counts.get(""))
        + to_num(status_counts.get("pending"))
        + to_num(status_counts.get("Pending"))
    )

    return {
        "Matched": matched,
        "Partially Matched": partially,
        "Deleted": deleted,
        "Pending": pending,
    }


def _build_trends_from_trace_deltas(
    prev_import: Dict[str, Any],
    new_import: Dict[str, Any],
    prev_register: Dict[str, Any],
    new_register: Dict[str, Any],
) -> List[Dict[str, str]]:
    """
    Build deterministic "what changed" trend lines by comparing the
    last cached tracing context vs the newly fetched one.
    """

    trends: List[Dict[str, str]] = []

    # Import tracing delta
    if new_import and isinstance(new_import, dict) and new_import.get("statusCounts"):
        prev_status = prev_import.get("statusCounts") if isinstance(prev_import, dict) else None
        new_counts = _status_counts_to_import_categories(new_import.get("statusCounts") or {})

        if prev_status:
            prev_counts = _status_counts_to_import_categories(prev_status or {})
            deltas = {
                k: int(new_counts.get(k, 0)) - int(prev_counts.get(k, 0))
                for k in ["Matched", "Partially Matched", "Deleted", "Pending"]
            }
            changed = {k: v for k, v in deltas.items() if v != 0}
            if changed:
                parts = [f"{k} {v:+d}" for k, v in changed.items()]
                trends.append({"text": "Import changes since last run: " + ", ".join(parts) + "."})
            else:
                trends.append({"text": "Import tracing status distribution is unchanged since last run."})
        else:
            trends.append(
                {
                    "text": "Import tracing status: "
                    f"Matched {new_counts.get('Matched', 0)}, "
                    f"Partially Matched {new_counts.get('Partially Matched', 0)}, "
                    f"Deleted {new_counts.get('Deleted', 0)}, "
                    f"Pending {new_counts.get('Pending', 0)}."
                }
            )

        # Time window hint
        new_range = new_import.get("updatedTimeRange") or {}
        oldest = new_range.get("oldest") or ""
        newest = new_range.get("newest") or ""
        if oldest or newest:
            trends.append(
                {
                    "text": f"Latest import tracing updated window: {oldest} -> {newest}.",
                }
            )

    # Register tracing delta
    if new_register and isinstance(new_register, dict) and new_register.get("statusCounts"):
        prev_multi = prev_register.get("multiTableConnection") or {}
        new_multi = new_register.get("multiTableConnection") or {}
        if prev_multi and new_multi:
            prev_total = int(prev_multi.get("totalRegisterIds") or 0)
            new_total = int(new_multi.get("totalRegisterIds") or 0)
            prev_multi_cnt = int(prev_multi.get("multiTableRegisterIds") or 0)
            new_multi_cnt = int(new_multi.get("multiTableRegisterIds") or 0)
            if prev_multi_cnt != new_multi_cnt or prev_total != new_total:
                trends.append(
                    {
                        "text": f"Register multi-table connectivity changed: multi-table registers {prev_multi_cnt} -> {new_multi_cnt} (total {prev_total} -> {new_total})."
                    }
                )
        else:
            new_total = int(new_multi.get("totalRegisterIds") or 0)
            new_multi_cnt = int(new_multi.get("multiTableRegisterIds") or 0)
            if new_total > 0:
                trends.append(
                    {
                        "text": f"Register connection quality: {new_multi_cnt}/{new_total} rows are connected to >1 tableName."
                    }
                )

    return trends[:4]


def _augment_register_multitable_insights(response: Dict[str, Any], register_tracing: Dict[str, Any]) -> None:
    """
    If one register row is connected to more than one tableName (>1), treat it as not-good quality risk.
    Mutates response in-place; idempotent across cached responses.
    """
    if not isinstance(response, dict) or not isinstance(register_tracing, dict):
        return
    multi = register_tracing.get("multiTableConnection") or {}
    total_ids = _safe_int(multi.get("totalRegisterIds"))
    bad_rows = _safe_int(multi.get("multiTableRegisterIds"))
    if total_ids <= 0 or bad_rows <= 0:
        return

    bad_rate = round((bad_rows / max(total_ids, 1)) * 100, 2)
    risk_text = (
        f"{bad_rows} register row(s) are connected to more than one tableName "
        f"({bad_rate}% of traced register rows). These rows are not-good quality."
    )
    rec_text = (
        "Treat multi-table connected rows as failed quality checks: enforce one row -> one tableName, "
        "validate join keys, and fix ambiguous links before reporting."
    )
    trend_text = (
        f"Multi-table connection quality signal: {bad_rows}/{total_ids} rows "
        f"({bad_rate}%) are connected to >1 tableName."
    )

    kpis = response.get("kpis") if isinstance(response.get("kpis"), list) else []
    if not any(str(k.get("title") or "").strip().lower() == "multi-table connected rows" for k in kpis):
        kpis.append(
            {
                "title": "Multi-table Connected Rows",
                "value": f"{bad_rows}/{total_ids} ({bad_rate}%)",
                "description": "Rows connected to more than one tableName are considered not-good.",
            }
        )
        response["kpis"] = kpis

    risks = response.get("risks") if isinstance(response.get("risks"), list) else []
    if not any(str(r.get("text") or "") == risk_text for r in risks):
        risks.append({"text": risk_text})
        response["risks"] = risks

    recommendations = response.get("recommendations") if isinstance(response.get("recommendations"), list) else []
    if not any(str(r.get("text") or "") == rec_text for r in recommendations):
        recommendations.append({"text": rec_text})
        response["recommendations"] = recommendations

    trends = response.get("trends") if isinstance(response.get("trends"), list) else []
    if not any(str(t.get("text") or "") == trend_text for t in trends):
        trends.append({"text": trend_text})
        response["trends"] = trends

    examples = multi.get("multiTableExamples") or []
    row_insights = response.get("rowInsights") if isinstance(response.get("rowInsights"), list) else []
    if examples and not any(str(x.get("issue") or "") == "multi_table_connection" for x in row_insights):
        ex_lines = []
        for ex in examples[:3]:
            reg_id = ex.get("registerId")
            tables = ex.get("connectedTables") or []
            ex_lines.append(f"registerId={reg_id}: {', '.join([str(t) for t in tables[:4]])}")
        row_insights.append(
            {
                "issue": "multi_table_connection",
                "insight": "Rows connected to >1 tableName detected. " + ("Examples: " + "; ".join(ex_lines) if ex_lines else ""),
                "operational_risk": "Ambiguous table connections can create conflicting status outcomes and duplicate interpretation.",
                "recommendation": "Resolve each row to one authoritative tableName and re-run tracing validation.",
            }
        )
        response["rowInsights"] = row_insights

    maturity = response.get("maturityScore")
    if isinstance(maturity, dict):
        score = _safe_int(maturity.get("score"))
        penalty = min(20, max(5, int(round(bad_rate / 5))))
        maturity["score"] = max(0, score - penalty)
        note = " Multi-table tableName connections reduce quality confidence."
        current_comment = str(maturity.get("comment") or "")
        if note.strip() not in current_comment:
            maturity["comment"] = (current_comment + note).strip()

    analysis_summary = response.get("analysisSummary")
    if isinstance(analysis_summary, dict):
        key_risks = analysis_summary.get("key_risks") if isinstance(analysis_summary.get("key_risks"), list) else []
        if risk_text not in key_risks:
            key_risks.insert(0, risk_text)
            analysis_summary["key_risks"] = key_risks[:6]


def _backend_trace_request_body_repr(body: Any) -> str:
    """Log-friendly JSON object for backend proxy request bodies (key/value pairs)."""
    if not isinstance(body, dict):
        return "n/a"
    try:
        return json.dumps(body, ensure_ascii=False, sort_keys=True, default=str)
    except (TypeError, ValueError):
        return repr(body)


def _fetch_import_data_tracing(
    settings: Settings,
    object_id: Any,
    request: Optional[Request] = None,
    api_filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Fetch authoritative import tracing / status for an object (AC/DC source mapping)."""
    if object_id is None or object_id == "":
        print("[BACKEND-TRACE] getImportDataTracing: skipped (no objectId)")
        return []
    url = f"{settings.assetregister_admin_console_base_url}/AssetRegister/getImportDataTracing/{object_id}"
    headers = _build_backend_headers(settings, request)
    # Some endpoints expect a request body (even if mounted under GET in swagger tooling).
    body = api_filters or {}
    body_repr = _backend_trace_request_body_repr(body)
    print(
        "[BACKEND-TRACE] getImportDataTracing: requesting "
        f"objectId={object_id} url={url} bodyKeys={list(body.keys()) if isinstance(body, dict) else 'n/a'} "
        f"body={body_repr}"
    )
    try:
        data = _request_json_with_methods(["GET", "POST"], url, headers, body=body, timeout=120)
    except Exception as exc:
        print(f"[BACKEND-TRACE] getImportDataTracing: ERROR objectId={object_id} err={repr(exc)}")
        raise
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if not isinstance(data, list):
        print(
            "[BACKEND-TRACE] getImportDataTracing: unexpected response shape "
            f"objectId={object_id} type={type(data).__name__} -> treating as 0 rows"
        )
        return []
    print(f"[BACKEND-TRACE] getImportDataTracing: loaded {len(data)} row(s) objectId={object_id}")
    return data


def _parse_iso_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, str):
            # Handle "Z" and timezone offsets safely
            v = value.replace("Z", "+00:00")
            return datetime.fromisoformat(v)
        return None
    except Exception:
        return None


def _parse_tracing_json_object(value: Any) -> Dict[str, Any]:
    """Parse old/new JSON blobs from ImportDataTracing rows (best-effort)."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    raw = str(value).strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        try:
            import ast

            parsed = ast.literal_eval(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}


def _field_diff_list(old: Dict[str, Any], new: Dict[str, Any]) -> List[Dict[str, Any]]:
    keys = set(old.keys()) | set(new.keys())
    out: List[Dict[str, Any]] = []
    for k in sorted(keys):
        ov, nv = old.get(k), new.get(k)
        s_ov, s_nv = json.dumps(ov, sort_keys=True, default=str), json.dumps(nv, sort_keys=True, default=str)
        if s_ov != s_nv:
            out.append({"field": k, "old": ov, "new": nv})
    return out


def _build_import_tracing_deep_analysis(
    rows: List[Dict[str, Any]],
    data_source: str,
) -> Dict[str, Any]:
    """
    Deterministic field-level analysis: AC/DC old vs new JSON and AC_new vs DC_new alignment.
    AC = Original Source, DC = By AR Resource in product terms.
    """
    from collections import Counter

    if not rows:
        return {}

    max_rows = min(len(rows), 5000)
    work = rows[:max_rows]

    ac_field_freq: Counter = Counter()
    dc_field_freq: Counter = Counter()
    rows_ac = 0
    rows_dc = 0
    status_to_diffcount: Dict[str, List[int]] = {}
    inv_transitions: Counter = Counter()
    ac_dc_field_mis: Counter = Counter()
    examples: List[Dict[str, Any]] = []

    def _is_inventory_status_field(name: str) -> bool:
        fn = str(name or "").replace(" ", "").lower()
        return fn == "inventorystatus" or ("inventory" in fn and "status" in fn)

    for r in work:
        ac_old = _parse_tracing_json_object(r.get("AColdValueJson"))
        ac_new = _parse_tracing_json_object(r.get("ACnewValueJson"))
        dc_old = _parse_tracing_json_object(r.get("DColdValueJson"))
        dc_new = _parse_tracing_json_object(r.get("DCnewValueJson"))

        ac_diffs = _field_diff_list(ac_old, ac_new)
        dc_diffs = _field_diff_list(dc_old, dc_new)
        if ac_diffs:
            rows_ac += 1
            for d in ac_diffs:
                ac_field_freq[str(d["field"])] += 1
        if dc_diffs:
            rows_dc += 1
            for d in dc_diffs:
                dc_field_freq[str(d["field"])] += 1

        st_raw = r.get("TracingStatus")
        st_key = "null" if st_raw is None else str(st_raw)
        total_d = len(ac_diffs) + len(dc_diffs)
        status_to_diffcount.setdefault(st_key, []).append(total_d)

        for tag, diffs in (("AC", ac_diffs), ("DC", dc_diffs)):
            for d in diffs:
                if _is_inventory_status_field(str(d.get("field"))):
                    inv_transitions[f'{tag}:{d.get("old")}→{d.get("new")}'] += 1

        common_keys = set(ac_new.keys()) & set(dc_new.keys())
        for ck in common_keys:
            if json.dumps(ac_new.get(ck), sort_keys=True, default=str) != json.dumps(
                dc_new.get(ck), sort_keys=True, default=str
            ):
                ac_dc_field_mis[str(ck)] += 1

        if total_d > 0:
            examples.append(
                {
                    "numberID": r.get("numberID"),
                    "objectId": r.get("objectId"),
                    "TracingStatus": r.get("TracingStatus"),
                    "acDiffCount": len(ac_diffs),
                    "dcDiffCount": len(dc_diffs),
                    "acChanges": ac_diffs[:10],
                    "dcChanges": dc_diffs[:10],
                    "updatedTime": r.get("updatedTime"),
                }
            )

    examples.sort(key=lambda x: (x["acDiffCount"] + x["dcDiffCount"]), reverse=True)
    top_examples = examples[:30]

    ac_top = ac_field_freq.most_common(30)
    dc_top = dc_field_freq.most_common(30)
    ac_dc_mis_top = ac_dc_field_mis.most_common(20)

    narrative: List[str] = []
    narrative.append(
        f"ImportDataTracing deep scan: {max_rows} rows (UI dataSource={data_source}). "
        f"AC (Original Source) json drift in {rows_ac} rows; DC (By AR Resource) json drift in {rows_dc} rows."
    )
    if ac_top:
        narrative.append("Top AC old→new fields: " + ", ".join(f"{f} ({c})" for f, c in ac_top[:6]))
    if dc_top:
        narrative.append("Top DC old→new fields: " + ", ".join(f"{f} ({c})" for f, c in dc_top[:6]))
    if inv_transitions:
        narrative.append(
            "Inventory / status transitions: "
            + ", ".join(f"{k} ({v})" for k, v in inv_transitions.most_common(8))
        )
    if ac_dc_mis_top:
        narrative.append(
            "AC_new vs DC_new mismatches (same row): "
            + ", ".join(f"{f} ({c} rows)" for f, c in ac_dc_mis_top[:10])
        )

    status_summary: Dict[str, Any] = {}
    for sk, counts in status_to_diffcount.items():
        if not counts:
            continue
        status_summary[sk] = {
            "rows": len(counts),
            "avgFieldChanges": round(sum(counts) / len(counts), 2),
            "maxFieldChanges": max(counts),
        }

    return {
        "rowsAnalyzed": max_rows,
        "dataSourceEmphasis": data_source,
        "rowsWithAcJsonDrift": rows_ac,
        "rowsWithDcJsonDrift": rows_dc,
        "acFieldChangeFrequency": {k: v for k, v in ac_top},
        "dcFieldChangeFrequency": {k: v for k, v in dc_top},
        "acDcNewMisalignedFields": {k: v for k, v in ac_dc_mis_top},
        "inventoryStatusTransitions": [{"pattern": k, "count": v} for k, v in inv_transitions.most_common(25)],
        "tracingStatusVsDrift": status_summary,
        "narrativeBullets": narrative,
        "highImpactExamples": top_examples,
    }


def _trim_import_tracing_for_llm(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Shrink deepAnalysis examples before sending to the LLM."""
    try:
        raw = json.dumps(obj, default=str)
        out = json.loads(raw)
    except Exception:
        return obj
    da = out.get("deepAnalysis")
    if isinstance(da, dict):
        ex = da.get("highImpactExamples")
        if isinstance(ex, list) and len(ex) > 8:
            da["highImpactExamples"] = ex[:8]
            da["_llmNote"] = f"Examples capped for model context (full set in API response)."
    return out


def _build_import_tracing_context(
    tracing_rows: List[Dict[str, Any]],
    data_source: str,
    table_name: Optional[str] = None,
    job_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a compact import-tracing context string to help the model explain
    "import update status" (matched / partially matched / deleted / pending).
    """
    if not tracing_rows:
        return {}

    filtered = list(tracing_rows)
    table_name = (table_name or "").strip()
    job_name = (job_name or "").strip()

    if data_source == "AC" and table_name:
        filtered = [r for r in filtered if str(r.get("ACtableName") or "").strip() == table_name]
    elif data_source == "DC" and table_name:
        filtered = [r for r in filtered if str(r.get("DCtableName") or "").strip() == table_name]

    # Optional extra narrowing: sometimes jobName appears in table naming
    if job_name:
        if data_source == "AC":
            filtered = [
                r
                for r in filtered
                if job_name.lower() in str(r.get("ACtableName") or "").lower()
            ] or filtered
        else:
            filtered = [
                r
                for r in filtered
                if job_name.lower() in str(r.get("DCtableName") or "").lower()
            ] or filtered

    if not filtered:
        # If narrowing removed everything, still return an empty context (skip prompt injection)
        return {}

    status_counts: Dict[str, int] = {}
    updated_dates: List[datetime] = []
    example_rows: List[Dict[str, Any]] = []

    for r in filtered:
        status = r.get("TracingStatus")
        status_key = "null" if status is None else str(status)
        status_counts[status_key] = status_counts.get(status_key, 0) + 1

        dt = _parse_iso_datetime(r.get("updatedTime"))
        if dt:
            updated_dates.append(dt)

    # Pick most recently updated rows as examples
    def sort_key(r: Dict[str, Any]) -> float:
        dt = _parse_iso_datetime(r.get("updatedTime"))
        return dt.timestamp() if dt else 0.0

    example_rows = sorted(filtered, key=sort_key, reverse=True)[:10]
    trimmed_examples: List[Dict[str, Any]] = []
    for r in example_rows:
        trimmed_examples.append(
            {
                "objectId": r.get("objectId"),
                "numberID": r.get("numberID"),
                "ACtableName": r.get("ACtableName"),
                "DCtableName": r.get("DCtableName"),
                "ACmatchedKey": r.get("ACmatchedKey"),
                "DCmatchedKey": r.get("DCmatchedKey"),
                "TracingStatus": r.get("TracingStatus"),
                "updatedTime": r.get("updatedTime"),
            }
        )

    oldest = min(updated_dates).isoformat() if updated_dates else None
    newest = max(updated_dates).isoformat() if updated_dates else None

    context_obj: Dict[str, Any] = {
        "dataSource": data_source,
        "filter": {
            "objectId": (filtered[0].get("objectId") if filtered else None),
            "tableName": table_name or None,
            "jobName": job_name or None,
        },
        "totalRows": len(filtered),
        "statusCounts": status_counts,
        "updatedTimeRange": {"oldest": oldest, "newest": newest},
        "examples": trimmed_examples,
    }
    try:
        deep = _build_import_tracing_deep_analysis(filtered, data_source)
        if deep:
            context_obj["deepAnalysis"] = deep
    except Exception:
        pass
    return context_obj


def _maybe_build_import_tracing_context(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> Dict[str, Any]:
    """
    Build import-tracing context only for AC/DC job detail pages where
    objectId + tableName are available.
    """
    page_id = payload.pageId
    if not (
        page_id.startswith("data-console/reports/original-source/jobs/")
        or page_id.startswith("data-console/reports/by-ar-resource/jobs/")
    ):
        return {}

    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    object_id = dashboard.get("objectId") or dashboard.get("objectId".strip()) or filters.get("objectId")
    # Analyze request: prefer top-level filters.tableName (matches /api/ai/analyze body), then dashboardData.tableName
    table_raw = filters.get("tableName") or dashboard.get("tableName")
    table_name = str(table_raw).strip() if table_raw is not None and str(table_raw).strip() != "" else None
    job_name = filters.get("jobName") or payload.pageId.rsplit("/", 1)[-1]
    data_source = (dashboard.get("dataSource") or "").strip() or ("AC" if "original-source" in page_id else "DC")

    # Spring ImportDataTracing accepts only table columns (e.g. ACtableName / DCtableName), not jobName — that caused 400.
    api_filters: Dict[str, Any] = {}
    if data_source == "AC" and table_name:
        api_filters["ACtableName"] = table_name
    elif data_source == "DC" and table_name:
        api_filters["DCtableName"] = table_name
    tracing_rows = _fetch_import_data_tracing(settings, object_id, request, api_filters=api_filters)
    return _build_import_tracing_context(tracing_rows, data_source, table_name=table_name, job_name=job_name)


def _is_report_job_detail_page_id(page_id: str) -> bool:
    p = (page_id or "").split("?", 1)[0].rstrip("/")
    return p.startswith("data-console/reports/original-source/jobs/") or p.startswith(
        "data-console/reports/by-ar-resource/jobs/"
    )


def _import_tracing_panel_stub(
    payload: AnalyzeRequest,
    empty_reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Ensure the UI always receives importTracing on report job pages so section 9 can render."""
    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    page_id = payload.pageId or ""
    data_source = (dashboard.get("dataSource") or "").strip() or (
        "AC" if "original-source" in page_id else "DC"
    )
    job_name = filters.get("jobName") or page_id.rsplit("/", 1)[-1]
    tbl = filters.get("tableName") or dashboard.get("tableName")
    return {
        "panelEligible": True,
        "dataSource": data_source,
        "filter": {
            "objectId": dashboard.get("objectId") or filters.get("objectId"),
            "tableName": tbl,
            "jobName": job_name,
        },
        "totalRows": 0,
        "statusCounts": {},
        "updatedTimeRange": {"oldest": None, "newest": None},
        "examples": [],
        "emptyReason": empty_reason
        or "No import tracing rows returned for this object/table, or filters excluded all rows.",
    }


def _fetch_register_tracing_compare_table(
    settings: Settings,
    object_id: Any,
    request: Optional[Request] = None,
    api_filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Fetch authoritative register tracing compare data."""
    if object_id is None or object_id == "":
        print("[BACKEND-TRACE] getTracingComapreTable: skipped (no objectId)")
        return []
    url = f"{settings.assetregister_admin_console_base_url}/AssetRegister/getTracingComapreTable/{object_id}"
    headers = _build_backend_headers(settings, request)
    body = api_filters or {}
    body_repr = _backend_trace_request_body_repr(body)
    print(
        "[BACKEND-TRACE] getTracingComapreTable: requesting "
        f"objectId={object_id} url={url} bodyKeys={list(body.keys()) if isinstance(body, dict) else 'n/a'} "
        f"body={body_repr}"
    )
    try:
        data = _request_json_with_methods(["GET", "POST"], url, headers, body=body, timeout=120)
    except HTTPException as exc:
        detail_text = str(getattr(exc, "detail", "") or "")
        if re.search(r"does\s+not\s+exist\s+in\s+the\s+database", detail_text, re.IGNORECASE):
            # Expected bootstrap case: tracing table not created yet for this object.
            print(
                "[BACKEND-TRACE] getTracingComapreTable: empty (physical table missing?) "
                f"objectId={object_id} detail={detail_text[:200]}"
            )
            return []
        print(f"[BACKEND-TRACE] getTracingComapreTable: HTTPException objectId={object_id} detail={detail_text[:300]}")
        raise
    except Exception as exc:
        print(f"[BACKEND-TRACE] getTracingComapreTable: ERROR objectId={object_id} err={repr(exc)}")
        raise
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if not isinstance(data, list):
        print(
            "[BACKEND-TRACE] getTracingComapreTable: unexpected response shape "
            f"objectId={object_id} type={type(data).__name__} -> treating as 0 rows"
        )
        return []
    print(f"[BACKEND-TRACE] getTracingComapreTable: loaded {len(data)} row(s) objectId={object_id}")
    return data


def _fetch_register_tracing_table(
    settings: Settings,
    object_id: Any,
    request: Optional[Request] = None,
    api_filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Fetch old/new register PK tracing data (lighter than compare table)."""
    if object_id is None or object_id == "":
        return []
    url = f"{settings.assetregister_admin_console_base_url}/AssetRegister/getTracingTable/{object_id}"
    headers = _build_backend_headers(settings, request)
    body = api_filters or {}
    try:
        data = _request_json_with_methods(["GET", "POST"], url, headers, body=body, timeout=120)
    except HTTPException as exc:
        detail_text = str(getattr(exc, "detail", "") or "")
        if re.search(r"does\s+not\s+exist\s+in\s+the\s+database", detail_text, re.IGNORECASE):
            # Expected bootstrap case: tracing table not created yet for this object.
            return []
        raise
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if not isinstance(data, list):
        return []
    return data


def _fetch_asset_register_rows(
    settings: Settings,
    object_id: Any,
    request: Optional[Request] = None,
    api_filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Fetch register rows including `import_status_update` fields."""
    if object_id is None or object_id == "":
        return []
    url = f"{settings.assetregister_admin_console_base_url}/AssetRegister/getAssetRegister/{object_id}"
    headers = _build_backend_headers(settings, request)
    body = api_filters or {}
    data = _request_json_with_methods(["GET", "POST"], url, headers, body=body, timeout=120)
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if not isinstance(data, list):
        return []
    return data


def _build_admin_tracing_request_body(filters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a lightweight request body from front-end filters.
    The Spring endpoints expect simple scalar fields like `DCtableName` or `fieldName`.
    """
    if not isinstance(filters, dict):
        return {}
    excluded = {"dashboardData", "advancedFilters", "saveFilters"}
    body: Dict[str, Any] = {}
    for k, v in filters.items():
        if k in excluded:
            continue
        if isinstance(v, (str, int, float, bool)) and v is not None and str(v).strip() != "":
            body[k] = v
    return body


def _trim_register_tracing_context_for_prompt(registerTracingObj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reduce token usage for LLM context.
    Frontend doesn't need registerTracingObj.registerIdToTableNames, and it can be large.
    """
    if not isinstance(registerTracingObj, dict):
        return {}

    # Keep only compact, high-signal pieces.
    keys_to_keep = [
        "totalRows",
        "statusCounts",
        "updatedTimeRange",
        "multiTableConnection",
        "tableNameToStatusCounts",
        "importStatusCounts",
        "importStatusMappedCounts",
        "assetExamples",
        "compareTableApi",
        "analysisEmphasis",
        "narrativeBullets",
    ]
    trimmed: Dict[str, Any] = {}
    for k in keys_to_keep:
        if k in registerTracingObj:
            trimmed[k] = registerTracingObj[k]

    multi = trimmed.get("multiTableConnection")
    if isinstance(multi, dict):
        multi = dict(multi)
        ex = multi.get("multiTableExamples")
        if isinstance(ex, list) and len(ex) > 8:
            multi["multiTableExamples"] = ex[:8]
            multi["_llmNote"] = "Examples capped for model context."
        trimmed["multiTableConnection"] = multi

    return trimmed


def _map_register_tracing_status(status: Any) -> str:
    if status is None:
        return "Pending"
    s = str(status).strip().lower()
    if "delete" in s or "removed" in s:
        return "Deleted"
    if "partial" in s:
        return "Partially Matched"
    # "match" and "fully" are common patterns; keep order so fully matched isn't counted as partial.
    if "match" in s:
        return "Matched"
    if "new" in s or "pending" in s or "untraced" in s:
        return "Pending"
    return "Pending"


def _parse_iso_datetime_ts(value: Any) -> Optional[float]:
    dt = _parse_iso_datetime(value)
    return dt.timestamp() if dt else None


def _register_json_application_hint(raw: Any) -> Optional[str]:
    """Best-effort Application Name from register_json on compare-table rows."""
    if raw is None:
        return None
    try:
        obj = json.loads(raw) if isinstance(raw, str) else raw
        if not isinstance(obj, dict):
            return None
        return (
            obj.get("Application Name")
            or obj.get("ApplicationName")
            or obj.get("application name")
        )
    except Exception:
        return None


def _build_register_tracing_context(
    compare_rows: List[Dict[str, Any]],
    object_id: Any,
    tracing_rows: Optional[List[Dict[str, Any]]] = None,
    asset_register_rows: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    # Even when compare_rows is empty, we still return a registerTracing object
    # so the frontend can render a "no tracing rows" block.
    if not compare_rows:
        return {
            "dataSource": "Register",
            "filter": {"objectId": object_id},
            "compareTableApi": "AssetRegister/getTracingComapreTable",
            "analysisEmphasis": "multi_table_gt_1",
            "narrativeBullets": [
                f"No rows returned from getTracingComapreTable for objectId={object_id} (empty list or table missing).",
                "Multi-table risk analysis requires compare rows; verify object and tracing table setup.",
            ],
            "totalRows": 0,
            "statusCounts": {},
            "registerIdToTableNames": {},
            "tableNameToStatusCounts": {},
            "multiTableConnection": {
                "totalRegisterIds": 0,
                "multiTableRegisterIds": 0,
                "singleTableRegisterIds": 0,
                "unconnectedRegisterIds": 0,
                "multiTableExamples": [],
                "multiTableStatusCounts": {},
            },
            "importStatusCounts": {},
            "importStatusMappedCounts": {},
            "assetExamples": [],
            "updatedTimeRange": {"oldest": None, "newest": None},
            "examples": [],
            "pkExamples": [],
        }

    status_counts: Dict[str, int] = {}
    updated_times: List[float] = []
    register_id_to_table_names: Dict[str, set[str]] = {}
    table_name_to_status_counts: Dict[str, Dict[str, int]] = {}

    def _extract_connected_table_names(r: Dict[str, Any]) -> List[str]:
        """
        Derive report-table connectivity from:
        - `registerTracingNew_Json` (contains keys like `AR_IntuneApps`: "yes"/"no"/etc)
        - `*_{jobName}_json` fields (e.g. `AR_IntuneApps_json`) where non-null indicates connection
        """

        connected: List[str] = []
        seen: set[str] = set()

        def add(name: Any) -> None:
            if name is None:
                return
            s = str(name).strip()
            if not s:
                return
            if s in seen:
                return
            seen.add(s)
            connected.append(s)

        # 1) Parse registerTracingNew_Json for `jobName` keys that are "yes"/truthy.
        raw = r.get("registerTracingNew_Json")
        parsed: Dict[str, Any] = {}
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {}
        elif isinstance(raw, dict):
            parsed = raw

        if isinstance(parsed, dict):
            for k, v in parsed.items():
                if k == "count":
                    continue
                if v is None:
                    continue
                if isinstance(v, bool):
                    if v:
                        add(k)
                    continue
                if isinstance(v, (int, float)):
                    if v:
                        add(k)
                    continue
                s = str(v).strip().lower()
                if s in {"yes", "y", "true", "1", "matched", "new", "partial", "partially matched"}:
                    add(k)
                elif s not in {"no", "n", "false", "0", "null", "none", ""}:
                    # If backend uses other truthy tokens (e.g. "OK"), count it as connected.
                    add(k)

        # 2) Add any non-null `*_{jobName}_json` fields (excluding known structural json blobs).
        excluded_lower = {"pk_json", "priority_json", "register_json"}
        for key, value in (r or {}).items():
            if not isinstance(key, str):
                continue
            if not key.lower().endswith("_json"):
                continue
            if key.lower() in excluded_lower:
                continue
            if value is None:
                continue
            # Strip suffix `_json` to get `jobName` (e.g. `AR_IntuneApps_json` -> `AR_IntuneApps`)
            add(key[: -len("_json")])

        return connected

    for r in compare_rows:
        mapped = _map_register_tracing_status(r.get("RegisterTracingStatus"))
        status_counts[mapped] = status_counts.get(mapped, 0) + 1
        ts = _parse_iso_datetime_ts(r.get("updatedTime"))
        if ts is not None:
            updated_times.append(ts)

        reg_id = r.get("registerId")
        table_names = _extract_connected_table_names(r)
        if reg_id is not None and table_names:
            reg_key = str(reg_id)
            if reg_key not in register_id_to_table_names:
                register_id_to_table_names[reg_key] = set()
            register_id_to_table_names[reg_key].update(table_names)

        # Also keep per-table breakdown when tableName/jobName is provided.
        for tn in table_names:
            if tn not in table_name_to_status_counts:
                table_name_to_status_counts[tn] = {}
            table_name_to_status_counts[tn][mapped] = table_name_to_status_counts[tn].get(mapped, 0) + 1

    newest = max(updated_times) if updated_times else None
    oldest = min(updated_times) if updated_times else None

    # Latest examples for quick human readability
    sorted_rows = sorted(
        compare_rows,
        key=lambda r: _parse_iso_datetime_ts(r.get("updatedTime")) or 0.0,
        reverse=True,
    )
    examples: List[Dict[str, Any]] = []
    for r in sorted_rows[:10]:
        examples.append(
            {
                "objectId": r.get("objectId"),
                "registerId": r.get("registerId"),
                "RegisterTracingStatus": r.get("RegisterTracingStatus"),
                "updatedTime": r.get("updatedTime"),
                "pk_json": r.get("pk_json"),
                "priority_json": r.get("priority_json"),
            }
        )

    # Optional: include register tracing PK differences if available
    pk_examples: List[Dict[str, Any]] = []
    if tracing_rows:
        for r in sorted(tracing_rows, key=lambda x: _parse_iso_datetime_ts(x.get("updatedTime")) or 0.0, reverse=True)[:5]:
            pk_examples.append(
                {
                    "registerId": r.get("registerId"),
                    "RegisterPK_old_Json": r.get("RegisterPK_old_Json"),
                    "RegisterPK_new_Json": r.get("RegisterPK_new_Json"),
                    "updatedTime": r.get("updatedTime"),
                }
            )

    # Make the context compact enough for LLM ingestion.
    register_connections_compact: Dict[str, List[str]] = {}
    for reg_key, tn_set in register_id_to_table_names.items():
        # Keep at most 12 connected tables per register row.
        register_connections_compact[reg_key] = sorted(list(tn_set))[:12]

    total_register_ids = len(register_id_to_table_names)
    multi_table_register_ids = [
        reg_id
        for reg_id, tn_list in register_connections_compact.items()
        if isinstance(tn_list, list) and len(tn_list) > 1
    ]
    single_table_register_ids = [
        reg_id
        for reg_id, tn_list in register_connections_compact.items()
        if isinstance(tn_list, list) and len(tn_list) == 1
    ]
    unconnected_register_ids = [
        reg_id
        for reg_id, tn_list in register_connections_compact.items()
        if isinstance(tn_list, list) and len(tn_list) == 0
    ]

    multi_table_examples: List[Dict[str, Any]] = []
    if multi_table_register_ids:
        # Choose the latest rows that are multi-connected for readability.
        multi_set = set(multi_table_register_ids)
        sorted_rows_for_examples = sorted(
            compare_rows,
            key=lambda r: _parse_iso_datetime_ts(r.get("updatedTime")) or 0.0,
            reverse=True,
        )
        seen_regids: set[str] = set()
        for r in sorted_rows_for_examples:
            reg_id = r.get("registerId")
            if reg_id is None:
                continue
            reg_key = str(reg_id)
            if reg_key not in multi_set or reg_key in seen_regids:
                continue
            seen_regids.add(reg_key)
            multi_table_examples.append(
                {
                    "registerId": reg_key,
                    "connectedTables": register_connections_compact.get(reg_key, []),
                    "connectedTableCount": len(register_connections_compact.get(reg_key, []) or []),
                    "RegisterTracingStatus": r.get("RegisterTracingStatus"),
                    "updatedTime": r.get("updatedTime"),
                    "pk_json": r.get("pk_json"),
                    "priority_json": r.get("priority_json"),
                    "applicationHint": _register_json_application_hint(r.get("register_json")),
                }
            )
            if len(multi_table_examples) >= 15:
                break

    multi_table_status_counts: Dict[str, int] = {}
    if multi_table_register_ids:
        for r in compare_rows:
            reg_id = r.get("registerId")
            if reg_id is None:
                continue
            reg_key = str(reg_id)
            if reg_key not in set(multi_table_register_ids):
                continue
            mapped = _map_register_tracing_status(r.get("RegisterTracingStatus"))
            multi_table_status_counts[mapped] = multi_table_status_counts.get(mapped, 0) + 1

    table_breakdown_compact: Dict[str, Dict[str, int]] = {}
    if table_name_to_status_counts:
        # Keep top 8 tables by total rows.
        table_totals = [
            (tn, sum(sc.values())) for tn, sc in table_name_to_status_counts.items()
        ]
        table_totals.sort(key=lambda x: x[1], reverse=True)
        for tn, _total in table_totals[:8]:
            table_breakdown_compact[tn] = table_name_to_status_counts.get(tn, {})

    import_status_counts: Dict[str, int] = {}
    import_status_mapped_counts: Dict[str, int] = {}
    asset_examples: List[Dict[str, Any]] = []
    if asset_register_rows:
        for r in asset_register_rows:
            raw = r.get("import_status_update")
            key = "null" if raw is None else str(raw)
            import_status_counts[key] = import_status_counts.get(key, 0) + 1
            mapped = _map_register_tracing_status(raw)
            import_status_mapped_counts[mapped] = import_status_mapped_counts.get(mapped, 0) + 1

        # Small examples for readability
        for r in asset_register_rows[:10]:
            asset_examples.append(
                {
                    "Application Name": r.get("Application Name"),
                    "Status": r.get("Status"),
                    "import_status_update": r.get("import_status_update"),
                    "AR_IntuneApps": r.get("AR_IntuneApps"),
                    "numberID": r.get("numberID"),
                    "registerId": r.get("registerId"),
                }
            )

    narrative_bullets: List[str] = [
        f"Source API: AssetRegister/getTracingComapreTable — {len(compare_rows)} row(s), objectId={object_id}.",
        f"Distinct registerIds with ≥1 connected report table (AR_*): {total_register_ids}.",
        f"PRIORITY — registerIds connected to >1 tableName: {len(multi_table_register_ids)} (treat as quality/risk).",
        f"Exactly one connected table: {len(single_table_register_ids)}; no connection detected: {len(unconnected_register_ids)}.",
    ]
    if multi_table_register_ids:
        narrative_bullets.append(
            "Remediation: resolve ambiguous multi-table links so each registerId has one authoritative primary report source where possible."
        )
    else:
        narrative_bullets.append(
            "No multi-table registerIds in this snapshot; continue monitoring connection rules and priority_json ordering."
        )

    return {
        "dataSource": "Register",
        "filter": {"objectId": object_id},
        "compareTableApi": "AssetRegister/getTracingComapreTable",
        "analysisEmphasis": "multi_table_gt_1",
        "narrativeBullets": narrative_bullets,
        "totalRows": len(compare_rows),
        "statusCounts": status_counts,
        "registerIdToTableNames": register_connections_compact,
        "tableNameToStatusCounts": table_breakdown_compact,
        "multiTableConnection": {
            "totalRegisterIds": total_register_ids,
            "multiTableRegisterIds": len(multi_table_register_ids),
            "singleTableRegisterIds": len(single_table_register_ids),
            "unconnectedRegisterIds": len(unconnected_register_ids),
            "multiTableExamples": multi_table_examples,
            "multiTableStatusCounts": multi_table_status_counts,
        },
        "importStatusCounts": import_status_counts,
        "importStatusMappedCounts": import_status_mapped_counts,
        "assetExamples": asset_examples,
        "updatedTimeRange": {
            "oldest": datetime.fromtimestamp(oldest).isoformat() if oldest else None,
            "newest": datetime.fromtimestamp(newest).isoformat() if newest else None,
        },
        "examples": examples,
        "pkExamples": pk_examples,
    }


def _is_register_detailed_page_id(page_id: Optional[str]) -> bool:
    p = (page_id or "").split("?", 1)[0].rstrip("/")
    return p == "data-console/register/detailed"


def _register_detailed_object_id_from_payload(payload: AnalyzeRequest) -> Any:
    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    return dashboard.get("objectId") or filters.get("objectId")


def _ensure_register_tracing_panel_payload(
    payload: AnalyzeRequest, register_tracing: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Register /detailed UI always shows the getTracingComapreTable panel + filter chip.
    If the builder returned {} (no objectId, fetch error) or the response would be omitted,
    still return a full 0-row-shaped payload from _build_register_tracing_context.
    """
    if not _is_register_detailed_page_id(payload.pageId):
        return register_tracing
    if isinstance(register_tracing, dict) and len(register_tracing) > 0:
        return register_tracing
    oid = _register_detailed_object_id_from_payload(payload)
    return _build_register_tracing_context([], oid if oid is not None else "")


def _maybe_build_register_tracing_context(
    settings: Settings,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> Dict[str, Any]:
    """
    Build register tracing context for register detailed pages.
    Uses compare table as the authoritative source for mapped statuses.
    """
    page_id = (payload.pageId or "").split("?", 1)[0].rstrip("/")
    if page_id != "data-console/register/detailed":
        return {}

    filters = payload.filters or {}
    dashboard = filters.get("dashboardData") or {}
    object_id = (
        dashboard.get("objectId")
        or dashboard.get("objectId".strip())
        or filters.get("objectId")
    )
    if "data-console/register/detailed" in str(payload.pageId):
        print(
            f"[AI-DEBUG] registerTracing payload objectId={object_id} tableType={dashboard.get('tableType')} filtersObjectId={filters.get('objectId')}"
        )
    if object_id is None or object_id == "":
        return {}

    # These admin endpoints accept a request body; for register-tracing compare/PK/context
    # we send an empty object unless we explicitly add filter fields later.
    api_filters: Dict[str, Any] = {}
    if "data-console/register/detailed" in str(payload.pageId):
        print(f"[AI-DEBUG] registerTracing apiFilters={api_filters}")
    try:
        compare_rows = _fetch_register_tracing_compare_table(
            settings, object_id, request, api_filters=api_filters
        )
    except Exception as e:
        print(f"[AI-DEBUG] register compare fetch failed objectId={object_id} err={repr(e)}")
        compare_rows = []
    try:
        tracing_rows = _fetch_register_tracing_table(
            settings, object_id, request, api_filters=api_filters
        )
    except Exception as e:
        print(f"[AI-DEBUG] register tracing PK fetch failed objectId={object_id} err={repr(e)}")
        tracing_rows = []
    try:
        asset_register_rows = _fetch_asset_register_rows(
            settings, object_id, request, api_filters=api_filters
        )
    except Exception as e:
        print(f"[AI-DEBUG] asset register fetch failed objectId={object_id} err={repr(e)}")
        asset_register_rows = []

    if "data-console/register/detailed" in str(payload.pageId):
        print(
            f"[AI-DEBUG] registerTracing fetched compareRows={len(compare_rows)} tracingRows={len(tracing_rows)} assetRows={len(asset_register_rows)}"
        )
    return _build_register_tracing_context(
        compare_rows,
        object_id,
        tracing_rows=tracing_rows,
        asset_register_rows=asset_register_rows,
    )


def _filter_irrelevant_insights(merged: Dict[str, Any], feedback_list: List[Dict[str, Any]]) -> None:
    """Remove only IRRELEVANT insights from the payload (mutates merged in place).

    NOT_HELPFUL is not filtered here: those entries stay visible until refresh, and the next LLM run
    uses feedback instructions to improve them. Stripping by insightId (e.g. kpi-0) after a refresh
    would remove the wrong row or leave an empty slot.
    """
    hidden_ids = {
        str(f.get("kpiId"))
        for f in feedback_list
        if f.get("feedbackType") == "irrelevant"
    }
    chart_avoid_ids = {
        str(f.get("kpiId"))
        for f in feedback_list
        if f.get("insightType") == "chart" and f.get("feedbackType") == "irrelevant"
    }

    if not hidden_ids and not chart_avoid_ids:
        return

    # Charts: drop only when marked irrelevant (not_helpful → improve on next analyze, do not delete here).
    if chart_avoid_ids and isinstance(merged.get("charts"), list):
        filtered_charts: List[Dict[str, Any]] = []
        charts = merged.get("charts") or []
        for i, ch in enumerate(charts):
            chart_id = str((ch or {}).get("id") or "")
            legacy_marker = f"chart-{i}"
            if chart_id in chart_avoid_ids or legacy_marker in chart_avoid_ids:
                continue
            filtered_charts.append(ch)
        merged["charts"] = filtered_charts

    for key, prefix in [
        ("totalInsights", "totalInsight"),
        ("columnInsights", "columnInsight"),
        ("rowInsights", "rowInsight"),
    ]:
        items = merged.get(key)
        if isinstance(items, list):
            merged[key] = [x for i, x in enumerate(items) if f"{prefix}-{i}" not in hidden_ids]

    for key, prefix in [
        ("kpis", "kpi"),
        ("risks", "risk"),
        ("positives", "positive"),
        ("recommendations", "recommendation"),
    ]:
        items = merged.get(key)
        if isinstance(items, list):
            merged[key] = [x for i, x in enumerate(items) if f"{prefix}-{i}" not in hidden_ids]


def _analysis_from_rows(
    rows: List[Dict[str, Any]],
    settings: Settings,
    model_id: str,
    feedback_list: Optional[List[Dict[str, Any]]] = None,
    chat_messages: Optional[List[Dict[str, str]]] = None,
    custom_prompt: Optional[str] = None,
    focus_columns_override: Optional[List[str]] = None,
    import_tracing_context: Optional[str] = None,
    register_tracing_context: Optional[str] = None,
    analysis_profile: Optional[str] = None,
) -> Dict[str, Any]:
    df = _to_df(rows)
    df_cols = list(df.columns)
    # Focus columns: explicit list from client, or heuristic from prompt/feedback/chat
    if focus_columns_override:
        focus_columns = [c for c in focus_columns_override if str(c) in df_cols]
    else:
        preprocessing_context = _build_preprocessing_context(
            custom_prompt, feedback_list or [], chat_messages or []
        )
        focus_columns = _get_focus_columns_heuristic(preprocessing_context, df_cols)
    anomalies = _detect_anomalies(df)
    # Token guardrail: for large datasets, anomalies can be huge and blow the context window.
    # We still compute charts/summary from full anomalies, but only send a capped subset to the LLM.
    max_anomalies_for_llm = 250
    anomalies_for_llm: List[Dict[str, Any]] = anomalies
    if len(anomalies) > max_anomalies_for_llm:
        by_issue: Dict[str, List[Dict[str, Any]]] = {}
        for a in anomalies:
            by_issue.setdefault(a.get("issue") or "unknown", []).append(a)
        issues = list(by_issue.keys())
        per_issue = max(10, int(max_anomalies_for_llm / max(len(issues), 1)))
        picked: List[Dict[str, Any]] = []
        for issue in issues:
            picked.extend(by_issue.get(issue, [])[:per_issue])
            if len(picked) >= max_anomalies_for_llm:
                break
        anomalies_for_llm = picked[:max_anomalies_for_llm]
    charts = _build_chart_data(df, anomalies)
    summary = _summarize_df(df, focus_columns=focus_columns if focus_columns else None)
    summary["row_level_summary"] = _build_row_level_summary(anomalies)
    summary["row_health_summary"] = _build_row_health_summary(df, anomalies)
    base = _base_analysis(df, anomalies, charts)
    feedback_instructions = _build_feedback_instructions(
        custom_prompt, feedback_list or [], chat_messages or []
    )
    llm_chunks: List[Dict[str, Any]] = []
    chunks = _chunk_list(
        anomalies_for_llm,
        50 if len(json.dumps(summary)) < 25000 else 20,
    )
    for index, chunk in enumerate(chunks, start=1):
        messages = [
            {"role": "system", "content": _analysis_system_prompt(analysis_profile)},
            {
                "role": "user",
                "content": _build_analysis_user_prompt(
                    summary,
                    chunk,
                    index,
                    len(chunks),
                    feedback_instructions,
                    import_tracing_context=import_tracing_context,
                    register_tracing_context=register_tracing_context,
                ),
            },
        ]
        chunk_result = _parse_ai_json_with_repair(
            settings,
            _llm_chat(settings, model_id, messages, max_tokens=1200, json_mode=True),
            model_id,
        )
        llm_chunks.append(chunk_result)
    merged = _merge_llm_chunks(base, llm_chunks)
    _filter_irrelevant_insights(merged, feedback_list or [])
    merged["analysisMeta"] = {
        "dayKey": utc_day_key(),
        "rowsAnalyzed": int(len(df)),
        "anomalyRows": len(anomalies),
        "chunkCount": len(chunks),
        "model": model_id,
        "provider": "azure_openai",
    }
    if "analysisSummary" not in merged:
        merged["analysisSummary"] = {
            "system_health": "Stable" if len(anomalies) < max(10, len(df) * 0.05) else "Needs attention",
            "key_risks": [item["text"] for item in merged.get("risks", [])[:5]],
            "root_causes": [item["text"] for item in merged.get("trends", [])[:3]],
            "recommendations": [item["text"] for item in merged.get("recommendations", [])[:5]],
        }
    return merged


def _get_rows_for_payload(settings: Settings, payload: AnalyzeRequest, request: Optional[Request] = None) -> List[Dict[str, Any]]:
    _ensure_supported_page_id(payload.pageId)
    if payload.pageId == "admin-console/overview":
        return fetch_admin_console_overview_rows(settings, payload, request)
    if payload.pageId == "data-console/overview":
        return fetch_data_console_overview_rows(settings, payload, request)
    if payload.pageId in {
        "admin-console/overview/import-status",
        "admin-console/overview/saved-jobs",
        "admin-console/overview/ar-mapping",
        "admin-console/overview/ar-rules",
    }:
        return fetch_admin_console_module_rows(settings, payload, request)
    if payload.pageId in {
        "data-console/reports/original-source",
        "data-console/reports/by-ar-resource",
    }:
        return fetch_original_source_jobs(settings, payload, request)
    if payload.pageId.startswith("data-console/reports/original-source/jobs/") or payload.pageId.startswith(
        "data-console/reports/by-ar-resource/jobs/"
    ):
        return fetch_job_table_all(settings, payload, request)
    if payload.pageId in {
        "data-console/security/users",
        "data-console/security/groups",
        "data-console/security/roles",
        "data-console/security/permissions",
    }:
        return fetch_security_console_rows(settings, payload, request)
    if payload.pageId == "data-console/register/detailed":
        rows = fetch_register_detailed_all(settings, payload, request)
        # Token guardrail: registering detailed can be very large; sample for analysis.
        max_rows = 300
        if isinstance(rows, list) and len(rows) > max_rows:
            # Prefer deterministic sampling when `numberID` exists.
            def sort_key(r: Dict[str, Any]) -> Any:
                try:
                    return int(r.get("numberID") or 0)
                except Exception:
                    return 0

            rows_sorted = sorted(rows, key=sort_key)
            step = max(1, int(len(rows_sorted) / max_rows))
            sampled = rows_sorted[::step][:max_rows]
            # If we still undershot, fill with the last items.
            if len(sampled) < max_rows:
                sampled = (sampled + rows_sorted[-(max_rows - len(sampled)) :])[:max_rows]
            return sampled
        return rows
    raise HTTPException(status_code=400, detail=f"Unsupported pageId '{payload.pageId}'.")


def _run_dataset_snapshot_job(
    settings: Settings,
    store: AIStateStore,
    payload: AnalyzeRequest,
    request: Optional[Request] = None,
) -> tuple[List[Dict[str, Any]], bool]:
    day_key = utc_day_key()
    dataset_key = _dataset_key(payload)
    cached_rows = store.get_dataset_snapshot(day_key, dataset_key)
    if cached_rows is not None:
        return cached_rows, True
    rows = _get_rows_for_payload(settings, payload, request)
    store.save_dataset_snapshot(day_key, dataset_key, payload.pageId, rows)
    return rows, False


def _ensure_daily_analysis(
    settings: Settings,
    store: AIStateStore,
    payload: AnalyzeRequest,
    request: Request,
) -> Dict[str, Any]:
    model_id = _model_id_or_default(payload.modelId, settings)
    day_key = utc_day_key()
    analysis_dataset_key = _dataset_key(payload)
    session_key = _session_dataset_key(payload)

    # Debug: trace what the sidecar is building for Insights.
    dbg_page_id = (payload.pageId or "").split("?", 1)[0].rstrip("/")
    try:
        dbg_dashboard = (payload.filters or {}).get("dashboardData") or {}
        dbg_object_id = dbg_dashboard.get("objectId") or (payload.filters or {}).get("objectId")
        dbg_table_type = dbg_dashboard.get("tableType")
        if "data-console/register/detailed" in str(dbg_page_id):
            print(
                f"[AI-DEBUG] analyze start pageId={payload.pageId} category={payload.category} tableType={dbg_table_type} objectId={dbg_object_id}"
            )
    except Exception:
        pass
    feedback_list = store.get_feedback(
        day_key, payload.orgId, payload.userId, payload.pageId, session_key
    )
    chat_messages = store.get_chat_messages(
        day_key, payload.orgId, payload.userId, payload.pageId, session_key
    )
    cached = store.get_cached_analysis(day_key, analysis_dataset_key)
    if cached:
        if dbg_page_id in ("admin-console/overview", "data-console/overview"):
            _filter_irrelevant_insights(cached, feedback_list)
            return cached
        _filter_irrelevant_insights(cached, feedback_list)
        prev_import = cached.get("importTracing") or {}
        prev_register = cached.get("registerTracing") or {}
        importTracingObj = {}
        registerTracingObj = {}
        try:
            importTracingObj = _maybe_build_import_tracing_context(settings, payload, request) or {}
            if importTracingObj:
                cached["importTracing"] = importTracingObj
        except Exception:
            importTracingObj = {}
        importTracingObj = cached.get("importTracing") or prev_import or {}
        if _is_report_job_detail_page_id(payload.pageId) and not importTracingObj:
            importTracingObj = _import_tracing_panel_stub(payload)
            cached["importTracing"] = importTracingObj
        registerTracingObj = cached.get("registerTracing") or prev_register
        try:
            registerTracingObj = _maybe_build_register_tracing_context(settings, payload, request) or {}
        except Exception as e:
            if "data-console/register/detailed" in str(dbg_page_id):
                print(f"[AI-DEBUG] registerTracing build failed (cached) with exception: {repr(e)}")
            # Keep previous cached registerTracing on failure (registerTracingObj unchanged).
        registerTracingObj = _ensure_register_tracing_panel_payload(payload, registerTracingObj)
        if registerTracingObj:
            cached["registerTracing"] = registerTracingObj
        try:
            _augment_register_multitable_insights(cached, cached.get("registerTracing") or {})
        except Exception:
            pass
        # Update trends deterministically from tracing deltas.
        try:
            existing_trends = cached.get("trends") or []
            delta_trends = _build_trends_from_trace_deltas(
                prev_import,
                cached.get("importTracing") or prev_import,
                prev_register,
                cached.get("registerTracing") or prev_register,
            )
            if existing_trends and isinstance(delta_trends, list):
                cached["trends"] = delta_trends + existing_trends
            else:
                cached["trends"] = delta_trends
        except Exception:
            pass
        try:
            rt = cached.get("registerTracing") or {}
            if "data-console/register/detailed" in str(dbg_page_id):
                print(
                    f"[AI-DEBUG] analyze cached used pageId={payload.pageId} registerTracing.totalRows={rt.get('totalRows')} statusKeys={list((rt.get('statusCounts') or {}).keys())}"
                )
        except Exception:
            pass
        return cached
    rows, _ = _run_dataset_snapshot_job(settings, store, payload, request)
    if dbg_page_id == "admin-console/overview":
        response = _build_admin_console_overview_response(
            settings, model_id, payload, request, feedback_list, chat_messages
        )
        _filter_irrelevant_insights(response, feedback_list)
        store.save_cached_analysis(day_key, analysis_dataset_key, response, response.get("analysisSummary"))
        return response
    if dbg_page_id == "data-console/overview":
        response = _build_data_console_home_response(
            settings, model_id, payload, request, feedback_list, chat_messages
        )
        _filter_irrelevant_insights(response, feedback_list)
        store.save_cached_analysis(day_key, analysis_dataset_key, response, response.get("analysisSummary"))
        return response
    importTracingObj: Dict[str, Any] = {}
    try:
        importTracingObj = _maybe_build_import_tracing_context(settings, payload, request) or {}
    except Exception:
        # Do not fail analysis if import-tracing cannot be retrieved.
        importTracingObj = {}
    registerTracingObj: Dict[str, Any] = {}
    try:
        registerTracingObj = _maybe_build_register_tracing_context(settings, payload, request) or {}
    except Exception as e:
        if "data-console/register/detailed" in str(dbg_page_id):
            print(
                "[AI-DEBUG] registerTracing build failed with exception. "
                f"pageId={payload.pageId} err={repr(e)}"
            )
        registerTracingObj = {}

    registerTracingObj = _ensure_register_tracing_panel_payload(payload, registerTracingObj)
    try:
        if "data-console/register/detailed" in str(dbg_page_id):
            print(
                "[AI-DEBUG] registerTracing built "
                f"pageId={payload.pageId} "
                f"totalRows={registerTracingObj.get('totalRows')} "
                f"statusKeys={list((registerTracingObj.get('statusCounts') or {}).keys())} "
                f"multiTable={bool(registerTracingObj.get('multiTableConnection'))}"
            )
    except Exception:
        pass
    import_tracing_context = (
        json.dumps(_trim_import_tracing_for_llm(importTracingObj), indent=2, default=str)
        if importTracingObj
        else None
    )
    register_tracing_context = (
        json.dumps(
            _trim_register_tracing_context_for_prompt(registerTracingObj),
            indent=2,
            default=str,
        )
        if registerTracingObj
        else None
    )
    response = _analysis_from_rows(
        rows,
        settings,
        model_id,
        feedback_list=feedback_list,
        chat_messages=chat_messages,
        custom_prompt=payload.customPrompt,
        focus_columns_override=payload.focusColumns if payload.focusColumns else None,
        import_tracing_context=import_tracing_context or None,
        register_tracing_context=register_tracing_context or None,
        analysis_profile=payload.pageId,
    )
    if _is_report_job_detail_page_id(payload.pageId):
        if not importTracingObj:
            importTracingObj = _import_tracing_panel_stub(payload)
        response["importTracing"] = importTracingObj
    elif importTracingObj:
        response["importTracing"] = importTracingObj
    if _is_register_detailed_page_id(payload.pageId):
        response["registerTracing"] = registerTracingObj
    elif registerTracingObj:
        response["registerTracing"] = registerTracingObj
    try:
        _augment_register_multitable_insights(response, response.get("registerTracing") or {})
    except Exception:
        pass

    # Deterministic trends: show what the current tracing context says.
    # (When analysis is cached, we override trends in the cached branch using deltas.)
    try:
        response_trends = response.get("trends") or []
        trace_trends = _build_trends_from_trace_deltas(
            {},
            importTracingObj if isinstance(importTracingObj, dict) else {},
            {},
            registerTracingObj if isinstance(registerTracingObj, dict) else {},
        )
        if trace_trends:
            response["trends"] = trace_trends + response_trends[:3]
    except Exception:
        pass

    try:
        rt = response.get("registerTracing") or {}
        if "data-console/register/detailed" in str(dbg_page_id):
            print(
                f"[AI-DEBUG] analyze done pageId={payload.pageId} "
                f"response.registerTracing.present={bool(rt)} "
                f"totalRows={rt.get('totalRows')} "
                f"statusKeys={list((rt.get('statusCounts') or {}).keys())}"
            )
    except Exception:
        pass
    store.save_cached_analysis(day_key, analysis_dataset_key, response, response.get("analysisSummary"))
    return response


@app.get("/api/ai/models")
def list_models(settings: Settings = Depends(get_settings)) -> Dict[str, Any]:
    models = _get_ai_models_list(settings)
    if not models:
        return {"provider": "azure_openai", "models": []}
    return {"provider": models[0].get("provider", "azure_openai"), "models": models}


@app.post("/api/ai/analyze")
def analyze(payload: AnalyzeRequest, request: Request, settings: Settings = Depends(get_settings)):
    store = get_store()
    return _ensure_daily_analysis(settings, store, payload, request)


@app.post("/api/ai/chat")
def chat(payload: ChatRequest, request: Request, settings: Settings = Depends(get_settings)):
    store = get_store()
    model_id = _model_id_or_default(payload.modelId, settings)
    day_key = utc_day_key()
    session_key = _session_dataset_key(payload)
    analysis_payload = AnalyzeRequest(
        orgId=payload.orgId,
        userId=payload.userId,
        pageId=payload.pageId,
        category=payload.category,
        filters=payload.filters,
        modelId=model_id,
    )
    analysis = _ensure_daily_analysis(settings, store, analysis_payload, request)
    analysis_summary = analysis.get("analysisSummary", {})
    analysis_context = _build_chat_analysis_context(analysis)
    session_messages = store.get_chat_messages(day_key, payload.orgId, payload.userId, payload.pageId, session_key)
    feedback = store.get_feedback(day_key, payload.orgId, payload.userId, payload.pageId, session_key)
    latest_messages = [{"role": m.role, "content": m.content} for m in payload.messages][-10:]
    combined_history = (session_messages + latest_messages)[-20:]
    latest_user_question = ""
    for m in reversed(latest_messages):
        if m.get("role") == "user":
            latest_user_question = str(m.get("content") or "")
            break
    messages = [
        {
            "role": "system",
            "content": _chat_system_prompt(
                analysis_summary,
                analysis.get("charts", []),
                analysis_context,
                feedback,
            ),
        },
        {
            "role": "system",
            "content": _build_chat_turn_prompt(latest_user_question, analysis_context),
        },
    ]
    messages.extend(combined_history)
    answer = _llm_chat(settings, model_id, messages, max_tokens=1600)
    stored_history = (combined_history + [{"role": "assistant", "content": answer}])[-24:]
    store.save_chat_messages(day_key, payload.orgId, payload.userId, payload.pageId, session_key, stored_history, analysis_summary)
    return {"answer": answer, "charts": analysis.get("charts", []), "analysisMeta": analysis.get("analysisMeta", {})}


@app.post("/api/ai/global-chat")
def global_chat(payload: GlobalChatRequest, request: Request, settings: Settings = Depends(get_settings)):
    store = get_store()
    model_id = _model_id_or_default(payload.modelId, settings)
    day_key = utc_day_key()

    resolved_page_id, resolved_category, resolved_filters = _resolve_global_analysis_scope(payload)
    analysis_payload = AnalyzeRequest(
        orgId=payload.orgId,
        userId=payload.userId,
        pageId=resolved_page_id,
        category=resolved_category,
        filters=resolved_filters,
        modelId=model_id,
    )
    analysis = _ensure_daily_analysis(settings, store, analysis_payload, request)
    analysis_summary = analysis.get("analysisSummary", {})
    analysis_context = _build_chat_analysis_context(analysis)

    session_page_id, session_key = _global_chat_pseudo_analyze(
        payload.orgId,
        payload.userId,
        payload.consoleType,
        payload.moduleKey,
        payload.route,
        dict(payload.contextFilters or {}),
        model_id,
    )

    session_messages = store.get_chat_messages(day_key, payload.orgId, payload.userId, session_page_id, session_key)
    feedback = store.get_feedback(day_key, payload.orgId, payload.userId, resolved_page_id, _session_dataset_key(analysis_payload))
    latest_messages = [{"role": m.role, "content": m.content} for m in payload.messages][-10:]
    combined_history = (session_messages + latest_messages)[-24:]

    latest_user_question = ""
    for m in reversed(latest_messages):
        if m.get("role") == "user":
            latest_user_question = str(m.get("content") or "")
            break

    system_prefix = (
        "You are a global assistant for AssetRegister consoles.\n"
        "Be highly conversational and helpful like modern GPT assistants.\n"
        "Ground responses in available analysis context for the selected module."
    )
    messages = [
        {"role": "system", "content": system_prefix},
        {
            "role": "system",
            "content": _chat_system_prompt(
                analysis_summary,
                analysis.get("charts", []),
                analysis_context,
                feedback,
            ),
        },
        {
            "role": "system",
            "content": _build_chat_turn_prompt(latest_user_question, analysis_context),
        },
    ]
    messages.extend(combined_history)
    answer = _llm_chat(settings, model_id, messages, max_tokens=1700)
    stored_history = (combined_history + [{"role": "assistant", "content": answer}])[-28:]
    store.save_chat_messages(
        day_key,
        payload.orgId,
        payload.userId,
        session_page_id,
        session_key,
        stored_history,
        analysis_summary,
    )

    include_insight = _question_requests_insight(latest_user_question)
    insight = None
    if include_insight:
        insight = {
            "kpis": (analysis.get("kpis") or [])[:6],
            "trends": (analysis.get("trends") or [])[:5],
            "risks": (analysis.get("risks") or [])[:5],
            "recommendations": (analysis.get("recommendations") or [])[:5],
        }
    charts_out = (analysis.get("charts") or [])[:3]

    return {
        "answer": answer,
        "insight": insight,
        "charts": charts_out,
        "adminDashboard": analysis.get("adminDashboard"),
        "dataConsoleHome": analysis.get("dataConsoleHome"),
        "scope": {
            "resolvedPageId": resolved_page_id,
            "resolvedCategory": resolved_category,
            "consoleType": payload.consoleType,
            "moduleKey": payload.moduleKey or "",
        },
        "analysisMeta": analysis.get("analysisMeta", {}),
    }


@app.post("/api/ai/global-chat/clear")
def clear_global_chat_session(payload: GlobalChatSessionRequest, settings: Settings = Depends(get_settings)):
    store = get_store()
    day_key = utc_day_key()
    model_id = _model_id_or_default(None, settings)
    session_page_id, session_key = _global_chat_pseudo_analyze(
        payload.orgId,
        payload.userId,
        payload.consoleType,
        payload.moduleKey,
        payload.route,
        dict(payload.contextFilters or {}),
        model_id,
    )
    store.clear_chat_messages(day_key, payload.orgId, payload.userId, session_page_id, session_key)
    return {"ok": True, "message": "Global chat session cleared for this scope."}


@app.post("/api/ai/chat/clear")
def clear_chat_session(payload: ChatSessionRequest):
    _ensure_supported_page_id(payload.pageId)
    store = get_store()
    day_key = utc_day_key()
    session_key = _session_dataset_key(payload)
    analysis_dataset_key = _dataset_key(payload)
    store.clear_chat_messages(day_key, payload.orgId, payload.userId, payload.pageId, session_key)
    store.clear_cached_analysis(day_key, analysis_dataset_key)
    store.clear_dataset_snapshot(day_key, analysis_dataset_key)
    store.clear_feedback(day_key, payload.orgId, payload.userId, payload.pageId, session_key)
    return {
        "ok": True,
        "message": "AI session, feedback history, cached insight, and warmed dataset snapshot were cleared.",
    }


@app.post("/api/ai/kpis")
def ai_kpis(payload: AnalyzeRequest, request: Request, settings: Settings = Depends(get_settings)):
    result = _ensure_daily_analysis(settings, get_store(), payload, request)
    return {"kpis": result.get("kpis", []), "charts": result.get("charts", [])}


@app.post("/api/ai/trends")
def ai_trends(payload: AnalyzeRequest, request: Request, settings: Settings = Depends(get_settings)):
    result = _ensure_daily_analysis(settings, get_store(), payload, request)
    return {"trends": result.get("trends", []), "analysisMeta": result.get("analysisMeta", {})}


@app.post("/api/ai/anomalies")
def ai_anomalies(payload: AnalyzeRequest, request: Request, settings: Settings = Depends(get_settings)):
    result = _ensure_daily_analysis(settings, get_store(), payload, request)
    return {"risks": result.get("risks", []), "charts": [c for c in result.get("charts", []) if c.get("id") == "anomaly_issues"]}


@app.post("/api/ai/recommendations")
def ai_recommendations(payload: AnalyzeRequest, request: Request, settings: Settings = Depends(get_settings)):
    result = _ensure_daily_analysis(settings, get_store(), payload, request)
    return {"recommendations": result.get("recommendations", [])}


@app.post("/api/ai/feedback")
def ai_feedback(payload: FeedbackRequest, settings: Settings = Depends(get_settings)):
    _ensure_supported_page_id(payload.pageId)
    store = get_store()
    day_key = utc_day_key()
    pseudo = AnalyzeRequest(
        orgId=payload.orgId,
        userId=payload.userId,
        pageId=payload.pageId,
        category=payload.category or "feedback",
        filters=payload.filters or {},
        modelId=settings.azure_openai_deployment,
    )
    session_key = _session_dataset_key(pseudo)
    store.add_feedback(
        day_key,
        payload.orgId,
        payload.userId,
        payload.pageId,
        session_key,
        payload.model_dump(),
    )
    return {"ok": True, "message": "Feedback recorded."}


@app.post("/api/ai/analysis/invalidate")
def invalidate_analysis_cache(payload: AnalyzeRequest, settings: Settings = Depends(get_settings)):
    """Invalidate cached analysis for this dataset so the next analyze re-runs with same data."""
    _ensure_supported_page_id(payload.pageId)
    store = get_store()
    day_key = utc_day_key()
    dataset_key = _dataset_key(payload)
    store.clear_cached_analysis(day_key, dataset_key)
    return {"ok": True, "message": "Analysis cache invalidated. Next analyze will re-run."}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    response = await call_next(request)
    return response
