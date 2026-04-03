"""
Encrypt/decrypt API keys and other secrets at rest (SQLite app_settings + user_api_keys).
Requires AI_ENCRYPTION_KEY (Fernet key from `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).
Legacy plaintext values are still readable and are re-encrypted on next save from the admin UI.
"""

from __future__ import annotations

import hashlib
import base64
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

_ENC_PREFIX = "enc:v1:"

# Keys stored in app_settings that should be encrypted at rest
SECRET_APP_SETTING_KEYS = frozenset(
    {
        "AZURE_OPENAI_API_KEY",
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "ANTHROPIC_API_KEY",
    }
)


def _fernet() -> Fernet:
    raw = (os.environ.get("AI_ENCRYPTION_KEY") or "").strip()
    if not raw:
        # Deterministic dev-only key — set AI_ENCRYPTION_KEY in production
        raw = "dev-insecure-ai-encryption-key-change-me"
    try:
        if len(raw) == 44 and raw.endswith("="):
            return Fernet(raw.encode("ascii"))
    except Exception:
        pass
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


_fernet_singleton: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    global _fernet_singleton
    if _fernet_singleton is None:
        _fernet_singleton = _fernet()
    return _fernet_singleton


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    token = _get_fernet().encrypt(plaintext.encode("utf-8"))
    return _ENC_PREFIX + token.decode("ascii")


def decrypt_secret(stored: str) -> str:
    if not stored:
        return ""
    s = str(stored).strip()
    if not s.startswith(_ENC_PREFIX):
        return s
    token = s[len(_ENC_PREFIX) :].encode("ascii")
    try:
        return _get_fernet().decrypt(token).decode("utf-8")
    except InvalidToken:
        return ""


def mask_secret_for_display(secret: Optional[str]) -> str:
    """Short mask for UI (never the full secret)."""
    s = str(secret or "").strip()
    if not s:
        return ""
    if len(s) <= 8:
        return "•" * min(len(s), 8)
    return f"••••{s[-4:]}"
