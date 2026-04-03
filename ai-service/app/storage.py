from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def utc_day_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# Stable SQLite partition for per-user, per-dataset AI state (chat, feedback, analysis cache, snapshots).
# Using a single bucket replaces daily rotation so history and insights survive until explicit clear/refresh.
PERSISTENT_AI_DAY_KEY = "persist"


class AIStateStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS analysis_cache (
                    day_key TEXT NOT NULL,
                    dataset_key TEXT NOT NULL,
                    response_json TEXT NOT NULL,
                    analysis_summary_json TEXT,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (day_key, dataset_key)
                );

                CREATE TABLE IF NOT EXISTS chat_sessions (
                    day_key TEXT NOT NULL,
                    org_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    page_id TEXT NOT NULL,
                    dataset_key TEXT NOT NULL,
                    messages_json TEXT NOT NULL,
                    last_analysis_summary_json TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (day_key, org_id, user_id, page_id, dataset_key)
                );

                CREATE TABLE IF NOT EXISTS feedback (
                    day_key TEXT NOT NULL,
                    org_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    page_id TEXT NOT NULL,
                    dataset_key TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS dataset_snapshots (
                    day_key TEXT NOT NULL,
                    dataset_key TEXT NOT NULL,
                    page_id TEXT NOT NULL,
                    rows_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (day_key, dataset_key)
                );

                CREATE TABLE IF NOT EXISTS app_prompts (
                    prompt_key TEXT PRIMARY KEY,
                    body TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS app_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS import_scoped_data (
                    org_id TEXT NOT NULL,
                    scope_kind TEXT NOT NULL,
                    scope_key TEXT NOT NULL,
                    imported_at TEXT NOT NULL,
                    rows_json TEXT NOT NULL,
                    meta_json TEXT,
                    page_id TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (org_id, scope_kind, scope_key)
                );

                CREATE TABLE IF NOT EXISTS import_scoped_insight (
                    org_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    insight_base_key TEXT NOT NULL,
                    imported_at TEXT NOT NULL,
                    response_json TEXT NOT NULL,
                    analysis_summary_json TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (org_id, user_id, insight_base_key)
                );
                """
            )
            cols = [r[1] for r in conn.execute("PRAGMA table_info(dataset_snapshots)").fetchall()]
            if "meta_json" not in cols:
                conn.execute("ALTER TABLE dataset_snapshots ADD COLUMN meta_json TEXT")

    def get_cached_analysis(self, day_key: str, dataset_key: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT response_json FROM analysis_cache WHERE day_key = ? AND dataset_key = ?",
                (day_key, dataset_key),
            ).fetchone()
        return json.loads(row["response_json"]) if row else None

    def get_cached_analysis_summary(self, day_key: str, dataset_key: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT analysis_summary_json FROM analysis_cache WHERE day_key = ? AND dataset_key = ?",
                (day_key, dataset_key),
            ).fetchone()
        if not row or not row["analysis_summary_json"]:
            return None
        return json.loads(row["analysis_summary_json"])

    def save_cached_analysis(
        self,
        day_key: str,
        dataset_key: str,
        response: Dict[str, Any],
        analysis_summary: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO analysis_cache (day_key, dataset_key, response_json, analysis_summary_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(day_key, dataset_key) DO UPDATE SET
                    response_json = excluded.response_json,
                    analysis_summary_json = excluded.analysis_summary_json,
                    created_at = excluded.created_at
                """,
                (
                    day_key,
                    dataset_key,
                    json.dumps(response),
                    json.dumps(analysis_summary) if analysis_summary is not None else None,
                    now,
                ),
            )

    def clear_cached_analysis(self, day_key: str, dataset_key: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM analysis_cache
                WHERE day_key = ? AND dataset_key = ?
                """,
                (day_key, dataset_key),
            )

    def get_dataset_snapshot(
        self, day_key: str, dataset_key: str
    ) -> Optional[tuple[List[Dict[str, Any]], Dict[str, Any]]]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT rows_json, meta_json
                FROM dataset_snapshots
                WHERE day_key = ? AND dataset_key = ?
                """,
                (day_key, dataset_key),
            ).fetchone()
        if not row:
            return None
        rows = json.loads(row["rows_json"])
        meta_raw = row["meta_json"]
        meta: Dict[str, Any] = {}
        if meta_raw:
            try:
                parsed = json.loads(meta_raw)
                if isinstance(parsed, dict):
                    meta = parsed
            except json.JSONDecodeError:
                pass
        return rows, meta

    def save_dataset_snapshot(
        self,
        day_key: str,
        dataset_key: str,
        page_id: str,
        rows: List[Dict[str, Any]],
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        meta_json = json.dumps(meta) if meta else None
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO dataset_snapshots (day_key, dataset_key, page_id, rows_json, meta_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(day_key, dataset_key) DO UPDATE SET
                    page_id = excluded.page_id,
                    rows_json = excluded.rows_json,
                    meta_json = excluded.meta_json,
                    updated_at = excluded.updated_at
                """,
                (day_key, dataset_key, page_id, json.dumps(rows), meta_json, now),
            )

    def clear_dataset_snapshot(self, day_key: str, dataset_key: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM dataset_snapshots
                WHERE day_key = ? AND dataset_key = ?
                """,
                (day_key, dataset_key),
            )

    def get_chat_messages(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
    ) -> List[Dict[str, str]]:
        """Returns the most recent stored thread for this scope (ignores legacy per-day rows)."""
        del day_key  # partition is now PERSISTENT_AI_DAY_KEY; keep param for API compatibility
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT messages_json
                FROM chat_sessions
                WHERE org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (org_id, user_id, page_id, dataset_key),
            ).fetchone()
        return json.loads(row["messages_json"]) if row else []

    def save_chat_messages(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
        messages: List[Dict[str, str]],
        last_analysis_summary: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO chat_sessions (
                    day_key, org_id, user_id, page_id, dataset_key, messages_json,
                    last_analysis_summary_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(day_key, org_id, user_id, page_id, dataset_key) DO UPDATE SET
                    messages_json = excluded.messages_json,
                    last_analysis_summary_json = excluded.last_analysis_summary_json,
                    updated_at = excluded.updated_at
                """,
                (
                    day_key,
                    org_id,
                    user_id,
                    page_id,
                    dataset_key,
                    json.dumps(messages),
                    json.dumps(last_analysis_summary) if last_analysis_summary is not None else None,
                    now,
                ),
            )

    def clear_chat_messages(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
    ) -> None:
        """Removes all stored threads for this scope (including legacy daily partitions)."""
        del day_key
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM chat_sessions
                WHERE org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                """,
                (org_id, user_id, page_id, dataset_key),
            )

    def list_recent_user_chat_messages(
        self,
        org_id: str,
        user_id: str,
        limit_sessions: int = 20,
        limit_messages: int = 80,
    ) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT day_key, page_id, messages_json, updated_at
                FROM chat_sessions
                WHERE org_id = ? AND user_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (org_id, user_id, limit_sessions),
            ).fetchall()
        out: List[Dict[str, Any]] = []
        for row in rows:
            try:
                messages = json.loads(row["messages_json"])
            except Exception:
                messages = []
            if not isinstance(messages, list):
                continue
            for msg in messages:
                if not isinstance(msg, dict):
                    continue
                out.append(
                    {
                        "dayKey": row["day_key"],
                        "pageId": row["page_id"],
                        "updatedAt": row["updated_at"],
                        "role": msg.get("role"),
                        "content": msg.get("content"),
                    }
                )
                if len(out) >= limit_messages:
                    return out
        return out

    def add_feedback(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
        payload: Dict[str, Any],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO feedback (day_key, org_id, user_id, page_id, dataset_key, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (day_key, org_id, user_id, page_id, dataset_key, json.dumps(payload), now),
            )

    def get_feedback(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
    ) -> List[Dict[str, Any]]:
        """All feedback events for this scope (any legacy day partition)."""
        del day_key
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT payload_json
                FROM feedback
                WHERE org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                ORDER BY created_at ASC
                """,
                (org_id, user_id, page_id, dataset_key),
            ).fetchall()
        return [json.loads(row["payload_json"]) for row in rows]

    def list_recent_user_feedback(
        self,
        org_id: str,
        user_id: str,
        limit: int = 80,
    ) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT day_key, page_id, payload_json, created_at
                FROM feedback
                WHERE org_id = ? AND user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (org_id, user_id, limit),
            ).fetchall()
        out: List[Dict[str, Any]] = []
        for row in rows:
            try:
                payload = json.loads(row["payload_json"])
            except Exception:
                payload = {}
            if not isinstance(payload, dict):
                continue
            out.append(
                {
                    **payload,
                    "_dayKey": row["day_key"],
                    "_pageId": row["page_id"],
                    "_createdAt": row["created_at"],
                }
            )
        return out

    def clear_feedback(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
    ) -> None:
        """Removes all feedback rows for this scope (including legacy daily partitions)."""
        del day_key
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM feedback
                WHERE org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                """,
                (org_id, user_id, page_id, dataset_key),
            )

    def get_import_scoped_data(
        self, org_id: str, scope_kind: str, scope_key: str
    ) -> Optional[tuple[str, List[Dict[str, Any]], Dict[str, Any], str]]:
        """Returns (imported_at, rows, meta, page_id) or None."""
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT imported_at, rows_json, meta_json, page_id
                FROM import_scoped_data
                WHERE org_id = ? AND scope_kind = ? AND scope_key = ?
                """,
                (org_id, scope_kind, scope_key),
            ).fetchone()
        if not row:
            return None
        meta: Dict[str, Any] = {}
        raw_meta = row["meta_json"]
        if raw_meta:
            try:
                parsed = json.loads(raw_meta)
                if isinstance(parsed, dict):
                    meta = parsed
            except json.JSONDecodeError:
                pass
        rows = json.loads(row["rows_json"])
        if not isinstance(rows, list):
            rows = []
        return (
            str(row["imported_at"] or ""),
            rows,
            meta,
            str(row["page_id"] or ""),
        )

    def save_import_scoped_data(
        self,
        org_id: str,
        scope_kind: str,
        scope_key: str,
        imported_at: str,
        rows: List[Dict[str, Any]],
        page_id: str,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        meta_json = json.dumps(meta) if meta else None
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO import_scoped_data (
                    org_id, scope_kind, scope_key, imported_at, rows_json, meta_json, page_id, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(org_id, scope_kind, scope_key) DO UPDATE SET
                    imported_at = excluded.imported_at,
                    rows_json = excluded.rows_json,
                    meta_json = excluded.meta_json,
                    page_id = excluded.page_id,
                    updated_at = excluded.updated_at
                """,
                (
                    org_id,
                    scope_kind,
                    scope_key,
                    imported_at,
                    json.dumps(rows),
                    meta_json,
                    page_id,
                    now,
                ),
            )

    def clear_import_scoped_data(self, org_id: str, scope_kind: str, scope_key: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM import_scoped_data
                WHERE org_id = ? AND scope_kind = ? AND scope_key = ?
                """,
                (org_id, scope_kind, scope_key),
            )

    def get_import_scoped_insight(
        self, org_id: str, user_id: str, insight_base_key: str
    ) -> Optional[tuple[str, Dict[str, Any], Optional[Dict[str, Any]]]]:
        """Returns (imported_at, response, analysis_summary) or None."""
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT imported_at, response_json, analysis_summary_json
                FROM import_scoped_insight
                WHERE org_id = ? AND user_id = ? AND insight_base_key = ?
                """,
                (org_id, user_id, insight_base_key),
            ).fetchone()
        if not row:
            return None
        summary = None
        if row["analysis_summary_json"]:
            try:
                summary = json.loads(row["analysis_summary_json"])
            except json.JSONDecodeError:
                summary = None
        return (
            str(row["imported_at"] or ""),
            json.loads(row["response_json"]),
            summary,
        )

    def save_import_scoped_insight(
        self,
        org_id: str,
        user_id: str,
        insight_base_key: str,
        imported_at: str,
        response: Dict[str, Any],
        analysis_summary: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO import_scoped_insight (
                    org_id, user_id, insight_base_key, imported_at,
                    response_json, analysis_summary_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(org_id, user_id, insight_base_key) DO UPDATE SET
                    imported_at = excluded.imported_at,
                    response_json = excluded.response_json,
                    analysis_summary_json = excluded.analysis_summary_json,
                    updated_at = excluded.updated_at
                """,
                (
                    org_id,
                    user_id,
                    insight_base_key,
                    imported_at,
                    json.dumps(response),
                    json.dumps(analysis_summary) if analysis_summary is not None else None,
                    now,
                ),
            )

    def clear_import_scoped_insight(self, org_id: str, user_id: str, insight_base_key: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM import_scoped_insight
                WHERE org_id = ? AND user_id = ? AND insight_base_key = ?
                """,
                (org_id, user_id, insight_base_key),
            )

    def get_app_prompt(self, prompt_key: str) -> Optional[str]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT body FROM app_prompts WHERE prompt_key = ?",
                (prompt_key,),
            ).fetchone()
        return str(row["body"]) if row and row["body"] is not None else None

    def set_app_prompt(self, prompt_key: str, body: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO app_prompts (prompt_key, body, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(prompt_key) DO UPDATE SET
                    body = excluded.body,
                    updated_at = excluded.updated_at
                """,
                (prompt_key, body, now),
            )

    def delete_app_prompt(self, prompt_key: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM app_prompts WHERE prompt_key = ?", (prompt_key,))

    def list_app_prompt_keys(self) -> List[str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT prompt_key FROM app_prompts ORDER BY prompt_key").fetchall()
        return [str(r["prompt_key"]) for r in rows]

    def get_app_setting(self, setting_key: str) -> Optional[str]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT setting_value FROM app_settings WHERE setting_key = ?",
                (setting_key,),
            ).fetchone()
        return str(row["setting_value"]) if row and row["setting_value"] is not None else None

    def set_app_setting(self, setting_key: str, setting_value: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO app_settings (setting_key, setting_value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(setting_key) DO UPDATE SET
                    setting_value = excluded.setting_value,
                    updated_at = excluded.updated_at
                """,
                (setting_key, setting_value, now),
            )

    def delete_app_setting(self, setting_key: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM app_settings WHERE setting_key = ?", (setting_key,))

    def list_app_settings(self) -> Dict[str, str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT setting_key, setting_value FROM app_settings").fetchall()
        return {str(r["setting_key"]): str(r["setting_value"]) for r in rows}
