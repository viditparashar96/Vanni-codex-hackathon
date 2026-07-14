"""{{variable}} substitution for prompts and greetings.

Precedence (highest first): per-call injected values > agent customVariable defaults.
Built-ins {{date}} / {{time}} render in the agent's timezone.
"""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

from engine.contract import AgentConfig, FlowConfig

_TOKEN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def build_variable_map(config: AgentConfig, injected: dict[str, str], timezone: str) -> dict[str, str]:
    values: dict[str, str] = {}

    # customVariable defaults (persona for simple agents)
    if config.persona and config.persona.custom_variables:
        for cv in config.persona.custom_variables:
            if cv.default_value is not None:
                values[cv.name] = cv.default_value

    # per-call injected values win
    values.update({k: str(v) for k, v in injected.items()})

    # built-ins
    try:
        now = datetime.now(ZoneInfo(timezone))
    except Exception:
        now = datetime.now(ZoneInfo("UTC"))
    values.setdefault("date", now.strftime("%A, %B %d, %Y"))
    values.setdefault("time", now.strftime("%I:%M %p"))

    return values


def build_flow_variable_map(
    flow: FlowConfig, injected: dict[str, str], timezone: str
) -> dict[str, str]:
    """Variable map for a flow agent: flow.customVariable defaults, then per-call
    injected values (which win), then built-in {{date}}/{{time}}."""
    values: dict[str, str] = {}

    for cv in flow.custom_variables or []:
        if cv.default_value is not None:
            values[cv.name] = cv.default_value

    values.update({k: str(v) for k, v in injected.items()})

    try:
        now = datetime.now(ZoneInfo(timezone))
    except Exception:
        now = datetime.now(ZoneInfo("UTC"))
    values.setdefault("date", now.strftime("%A, %B %d, %Y"))
    values.setdefault("time", now.strftime("%I:%M %p"))

    return values


def substitute(text: str | None, values: dict[str, str]) -> str:
    if not text:
        return ""
    return _TOKEN.sub(lambda m: values.get(m.group(1), m.group(0)), text)
