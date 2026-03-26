from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def utc_day_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


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
                """
            )

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

    def get_dataset_snapshot(self, day_key: str, dataset_key: str) -> Optional[List[Dict[str, Any]]]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT rows_json
                FROM dataset_snapshots
                WHERE day_key = ? AND dataset_key = ?
                """,
                (day_key, dataset_key),
            ).fetchone()
        return json.loads(row["rows_json"]) if row else None

    def save_dataset_snapshot(
        self,
        day_key: str,
        dataset_key: str,
        page_id: str,
        rows: List[Dict[str, Any]],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO dataset_snapshots (day_key, dataset_key, page_id, rows_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(day_key, dataset_key) DO UPDATE SET
                    page_id = excluded.page_id,
                    rows_json = excluded.rows_json,
                    updated_at = excluded.updated_at
                """,
                (day_key, dataset_key, page_id, json.dumps(rows), now),
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
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT messages_json
                FROM chat_sessions
                WHERE day_key = ? AND org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                """,
                (day_key, org_id, user_id, page_id, dataset_key),
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
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM chat_sessions
                WHERE day_key = ? AND org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                """,
                (day_key, org_id, user_id, page_id, dataset_key),
            )

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
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT payload_json
                FROM feedback
                WHERE day_key = ? AND org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                ORDER BY created_at ASC
                """,
                (day_key, org_id, user_id, page_id, dataset_key),
            ).fetchall()
        return [json.loads(row["payload_json"]) for row in rows]

    def clear_feedback(
        self,
        day_key: str,
        org_id: str,
        user_id: str,
        page_id: str,
        dataset_key: str,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                DELETE FROM feedback
                WHERE day_key = ? AND org_id = ? AND user_id = ? AND page_id = ? AND dataset_key = ?
                """,
                (day_key, org_id, user_id, page_id, dataset_key),
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
