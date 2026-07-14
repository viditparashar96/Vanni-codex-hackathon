"""Post-call intelligence.

Runs once, after a call ends, over the collected transcript (and a small bag of
call metrics). A single OpenAI chat completion returns everything the report
needs: a human summary, an overall sentiment, optional structured extraction
(when the dispatch supplied an extraction schema), and a QA rubric (quality
score, sentiment, summary, and a set of closed failure-mode tags with
evidence).

This is strictly advisory. Every path is fail-open: any error — missing key,
empty transcript, network failure, malformed model output — returns an empty
dict and NEVER raises, so it can never block or delay end-of-call report
delivery.

The QA tag catalogue is intentionally closed: adding or removing a tag is a
deliberate change (it shifts what operators are trained to look for and what the
dashboard renders), so tags outside this set are dropped on parse.
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from loguru import logger

_OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

# Closed set of failure-mode tags the model may apply. Generic across use cases.
QA_TAGS: tuple[str, ...] = (
    "USER_FRUSTRATED",
    "USER_DETECTS_AI",
    "USER_NOT_UNDERSTANDING",
    "USER_REQUESTING_UNSUPPORTED",
    "ASSISTANT_IN_LOOP",
    "ASSISTANT_REPLY_IMPROPER",
    "ASSISTANT_LACKS_EMPATHY",
    "HEARING_ISSUES",
    "DEAD_AIR",
    "UNCLEAR_CONVERSATION",
    "GOAL_ACHIEVED",
)

_BASE_INSTRUCTIONS = """You are a QA analyst reviewing a transcript of a voice conversation between a \
user (a human caller) and an AI voice assistant. Analyse it carefully and return a SINGLE JSON object \
(no markdown, no code fences) with exactly these top-level fields:

- "summary": a concise 2-3 sentence plain-language summary of the call.
- "sentiment": the user's overall sentiment, exactly one of "positive", "neutral", or "negative".
- "qa": an object with:
    - "callQualityScore": an integer 1-10 rating how well the assistant handled the call (10 = flawless).
    - "overallSentiment": one of "positive", "neutral", "negative" (the assistant/interaction quality tone).
    - "summary": a 1-2 sentence QA-focused summary.
    - "tags": an array of {"tag": TAG, "evidence": "short quote or reason citing the transcript"} objects, \
drawn ONLY from this closed set (omit any that do not clearly apply; return an empty array if none do):
%s

Judge DEAD_AIR from timestamps when present. Always provide summary, sentiment, callQualityScore, \
overallSentiment and a QA summary even when the tags array is empty."""

_STRUCTURED_SUFFIX = """

Additionally, extract structured data into a "structuredData" object. Populate exactly these fields \
(use null when a value cannot be determined from the conversation):
%s"""


def _tag_catalogue() -> str:
    return "\n".join(f"    - {t}" for t in QA_TAGS)


def _format_transcript(transcript: list[dict[str, Any]]) -> str:
    """Render transcript turns as readable lines. Tolerant of several shapes."""
    lines: list[str] = []
    for turn in transcript:
        if not isinstance(turn, dict):
            continue
        role = turn.get("role") or turn.get("speaker") or "unknown"
        text = turn.get("text") or turn.get("content") or ""
        if not text:
            continue
        ts = turn.get("seconds_from_start")
        if ts is None:
            ts = turn.get("secondsFromStart")
        prefix = f"[{ts:.1f}s] " if isinstance(ts, (int, float)) else ""
        speaker = {"assistant": "Assistant", "agent": "Assistant", "user": "User"}.get(
            str(role).lower(), str(role)
        )
        lines.append(f"{prefix}{speaker}: {text}".strip())
    return "\n".join(lines)


def _format_metrics(metrics: dict[str, Any] | None) -> str:
    if not metrics:
        return "(no metrics available)"
    parts = [f"{k}={v}" for k, v in metrics.items() if v is not None]
    return ", ".join(parts) or "(no metrics available)"


def _describe_schema(schema: list[dict[str, Any]]) -> str:
    """Turn a list of {name,type,description,...} field specs into prompt text."""
    lines: list[str] = []
    for prop in schema:
        if not isinstance(prop, dict):
            continue
        name = prop.get("name")
        if not name:
            continue
        ptype = prop.get("type", "string")
        desc = prop.get("description", "")
        enum_vals = prop.get("enum_values") or prop.get("enumValues")
        extra = f" (one of: {', '.join(map(str, enum_vals))})" if enum_vals else ""
        detail = f" — {desc}" if desc else ""
        lines.append(f'    - "{name}" ({ptype}){extra}{detail}')
    return "\n".join(lines)


def _clamp_score(raw: Any) -> int | None:
    try:
        return max(1, min(10, int(raw)))
    except (TypeError, ValueError):
        return None


def _normalize_sentiment(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    val = raw.strip().lower()
    return val if val in ("positive", "neutral", "negative") else None


def _clean_tags(raw_tags: Any) -> list[dict[str, str]]:
    tags: list[dict[str, str]] = []
    if not isinstance(raw_tags, list):
        return tags
    for t in raw_tags:
        if not isinstance(t, dict):
            continue
        tag = str(t.get("tag", "")).upper().strip()
        if tag not in QA_TAGS:
            continue
        evidence = str(t.get("evidence") or t.get("reason") or "").strip()
        tags.append({"tag": tag, "evidence": evidence})
    return tags


def _parse(content: str, want_structured: bool) -> dict[str, Any]:
    """Parse the model's JSON reply into our normalized result shape."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError) as err:
        logger.warning(f"[qa] could not parse model output: {err} | raw={cleaned[:200]!r}")
        return {}
    if not isinstance(data, dict):
        return {}

    qa_in = data.get("qa") if isinstance(data.get("qa"), dict) else {}
    qa = {
        "call_quality_score": _clamp_score(qa_in.get("callQualityScore")),
        "overall_sentiment": _normalize_sentiment(qa_in.get("overallSentiment")),
        "summary": (qa_in.get("summary") or None),
        "tags": _clean_tags(qa_in.get("tags")),
    }

    result: dict[str, Any] = {
        "summary": data.get("summary") or None,
        "sentiment": _normalize_sentiment(data.get("sentiment")),
        "qa": qa,
    }
    if want_structured:
        sd = data.get("structuredData")
        result["structured_data"] = sd if isinstance(sd, dict) else None
    return result


async def analyze(
    transcript: list[dict[str, Any]],
    metrics: dict[str, Any] | None,
    openai_api_key: str | None,
    *,
    structured_schema: list[dict[str, Any]] | None = None,
    model: str = "gpt-4o-mini",
) -> dict[str, Any]:
    """Run post-call analysis over ``transcript``.

    Returns a dict with keys ``summary``, ``sentiment``, ``qa`` and (when a
    ``structured_schema`` was supplied) ``structured_data``. Returns an empty
    dict on ANY error or when there is nothing to analyse. Never raises.
    """
    if not openai_api_key:
        logger.info("[qa] skipped: no OpenAI API key available")
        return {}

    transcript_text = _format_transcript(transcript or [])
    if not transcript_text:
        logger.info("[qa] skipped: empty transcript")
        return {}

    want_structured = bool(structured_schema and _describe_schema(structured_schema))
    system_prompt = _BASE_INSTRUCTIONS % _tag_catalogue()
    if want_structured:
        system_prompt += _STRUCTURED_SUFFIX % _describe_schema(structured_schema)

    user_prompt = (
        "## Transcript\n\n"
        f"{transcript_text}\n\n"
        "## Call metrics\n\n"
        f"{_format_metrics(metrics)}\n"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                _OPENAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            res.raise_for_status()
            content = (
                res.json()
                .get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
    except Exception as err:  # noqa: BLE001 — advisory, never propagate
        logger.warning(f"[qa] analysis request failed: {err}")
        return {}

    result = _parse(content, want_structured)
    if result:
        qa = result.get("qa", {})
        logger.info(
            f"[qa] analyzed call: sentiment={result.get('sentiment')}, "
            f"score={qa.get('call_quality_score')}, tags={len(qa.get('tags', []))}"
        )
    return result
