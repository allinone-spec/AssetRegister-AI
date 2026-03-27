#!/usr/bin/env python3
"""
Quick OpenAI chat test script for the ai-service project.

Usage examples:
  python test_openai.py
  python test_openai.py --prompt "Say hello in one line."
  python test_openai.py --json-mode --prompt "Return JSON: {\"ok\": true}"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError


def _load_env_file(env_path: Path) -> None:
    """Load KEY=VALUE lines from .env into os.environ, overriding shell values."""
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key:
            os.environ[key] = value


def _assistant_text_from_message(message: Any) -> str:
    if message is None:
        return ""
    content = getattr(message, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text" and part.get("text"):
                    parts.append(str(part["text"]))
            else:
                text = getattr(part, "text", None)
                if text:
                    parts.append(str(text))
        return "".join(parts)
    return str(content or "")


def _assistant_text_from_completion(response: Any) -> str:
    choices = getattr(response, "choices", None) or []
    if not choices:
        return ""
    return _assistant_text_from_message(getattr(choices[0], "message", None))


def _build_payload(model: str, messages: List[Dict[str, str]], json_mode: bool) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 400,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    # Match app/main.py behavior for newer OpenAI model families.
    m = (model or "").lower()
    if m.startswith(("o1", "o3", "o4")) or "gpt-5" in m:
        payload.pop("temperature", None)
        max_tokens = payload.pop("max_tokens", None)
        if max_tokens is not None:
            payload["max_completion_tokens"] = max_tokens
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Simple OpenAI API test for current ai-service logic.")
    parser.add_argument(
        "--prompt",
        default="Say hello and confirm this OpenAI API test is working.",
        help="Prompt text to send as the user message.",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Override model. Defaults to OPENAI_MODEL from .env.",
    )
    parser.add_argument(
        "--json-mode",
        action="store_true",
        help="Request a JSON object response format.",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Override OPENAI_API_KEY from .env.",
    )
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent
    _load_env_file(base_dir / ".env")

    api_key = (args.api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        print("OPENAI_API_KEY is missing. Add it in ai-service/.env or environment variables.")
        return 1

    model = (args.model or os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
    # OpenAI-only test script: always target OpenAI public API.
    base_url = "https://api.openai.com/v1"

    client = OpenAI(api_key=api_key, base_url=base_url, max_retries=0)
    messages = [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": args.prompt},
    ]
    payload = _build_payload(model=model, messages=messages, json_mode=args.json_mode)

    print(f"Using model: {model}")
    print(f"Using base URL: {base_url}")
    print("Sending request...")

    try:
        response = client.chat.completions.create(**payload)
        text = _assistant_text_from_completion(response)
        if not text.strip():
            print("Empty response content received from model.")
            return 2

        if args.json_mode:
            try:
                parsed = json.loads(text)
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print("Response was not valid JSON. Raw output:")
                print(text)
                return 3
        else:
            print("\nAssistant response:\n")
            print(text)

        return 0
    except RateLimitError as exc:
        msg = str(exc)
        if "insufficient_quota" in msg:
            print("OpenAI quota/billing issue (insufficient_quota).")
            print("Fix: use a funded OPENAI_API_KEY (or pass --api-key with a funded key).")
            print("Then run: python test_openai.py --prompt \"Say hello in one line.\"")
            return 7
        print(f"Rate limited: {exc}")
        return 4
    except APIConnectionError as exc:
        print(f"Connection error: {exc}")
        return 5
    except APIStatusError as exc:
        print(f"API status error ({exc.status_code}): {exc}")
        return 6
    except Exception as exc:
        print(f"Unexpected error: {exc}")
        return 9


if __name__ == "__main__":
    sys.exit(main())
