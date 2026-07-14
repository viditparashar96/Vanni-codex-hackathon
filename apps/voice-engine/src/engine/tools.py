"""HTTP tool calling for the simple voice agent.

Turns each ``HttpTool`` from the agent config into a Pipecat function the LLM
can call, plus a built-in ``end_call`` that lets the agent hang up gracefully.

Design notes
------------
* We use Pipecat 1.5.0 function calling: build a ``FunctionSchema`` per tool,
  register an async handler on the LLM service, and attach the resulting
  ``ToolsSchema`` to the ``LLMContext`` so the model is told which tools exist.
* A tool handler receives a single ``FunctionCallParams`` (``params.arguments``
  is the LLM-supplied dict, ``params.result_callback`` delivers the result).
* URLs support both ``{{var}}`` and ``{var}`` templating, filled from per-call
  variables *and* the LLM-provided arguments (arguments win on collisions).
* GET requests send arguments as query params; other verbs send a JSON body.
"""

from __future__ import annotations

import re
from typing import Any, Awaitable, Callable

import httpx
from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.services.llm_service import FunctionCallParams

from engine.contract import HttpTool, ToolAuth
from engine.variables import substitute

EndCallCallback = Callable[[], Awaitable[None]]

# Single-brace {token} placeholder, used alongside the {{token}} form that
# engine.variables.substitute already understands.
_SINGLE_BRACE = re.compile(r"(?<!\{)\{\s*([a-zA-Z0-9_]+)\s*\}(?!\})")

_DEFAULT_END_CALL_DESCRIPTION = (
    "End the current call. Use this when the conversation is complete, the "
    "caller asks to hang up, or there is nothing left to help with."
)


def _fill_template(text: str, values: dict[str, str]) -> str:
    """Substitute {{token}} then {token} placeholders from ``values``.

    Unknown tokens are left untouched so a malformed template degrades to a
    literal rather than raising.
    """
    filled = substitute(text, values)
    return _SINGLE_BRACE.sub(lambda m: values.get(m.group(1), m.group(0)), filled)


def _split_parameters(parameters: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Extract JSON-schema ``properties``/``required`` from a tool's parameters.

    Accepts either a full object schema ({"type": "object", "properties": ...})
    or a bare properties map, so authors can supply whichever shape.
    """
    if not isinstance(parameters, dict):
        return {}, []
    if "properties" in parameters and isinstance(parameters["properties"], dict):
        properties = parameters["properties"]
        required = parameters.get("required") or []
    else:
        properties = parameters
        required = []
    required = [r for r in required if isinstance(r, str)]
    return properties, required


def _apply_auth(headers: dict[str, str], auth: ToolAuth | None, values: dict[str, str]) -> None:
    """Add the configured auth header to ``headers`` in place."""
    if not auth or auth.type == "none" or not auth.value:
        return
    value = _fill_template(auth.value, values)
    if auth.type == "bearer":
        headers["Authorization"] = f"Bearer {value}"
    elif auth.type == "api_key":
        header_name = auth.header_name or "X-API-Key"
        headers[header_name] = value


def _make_http_handler(
    tool: HttpTool,
    variables: dict[str, str],
) -> Callable[[FunctionCallParams], Awaitable[None]]:
    """Build the async handler that performs the HTTP call for one tool."""

    async def handler(params: FunctionCallParams) -> None:
        args: dict[str, Any] = dict(params.arguments or {})
        # URL templating draws from call variables plus the LLM's arguments;
        # arguments win so the model can steer the request.
        url_values = {**variables, **{k: str(v) for k, v in args.items()}}
        url = _fill_template(tool.url, url_values)

        headers: dict[str, str] = {}
        if tool.headers:
            headers = {k: _fill_template(v, variables) for k, v in tool.headers.items()}
        _apply_auth(headers, tool.auth, variables)

        method = tool.method.upper()
        timeout = max(tool.timeout_ms, 1) / 1000

        logger.info(f"[tools] calling '{tool.name}' -> {method} {url}")
        logger.debug(f"[tools] '{tool.name}' args={args}")

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method == "GET":
                    response = await client.request(method, url, params=args, headers=headers)
                else:
                    response = await client.request(method, url, json=args, headers=headers)

            body: Any
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body = response.json()
                except Exception:
                    body = response.text
            else:
                body = response.text

            logger.info(f"[tools] '{tool.name}' -> HTTP {response.status_code}")
            await params.result_callback({"status_code": response.status_code, "body": body})
        except httpx.TimeoutException:
            logger.warning(f"[tools] '{tool.name}' timed out after {timeout}s")
            await params.result_callback(
                {"error": f"The '{tool.name}' request timed out after {timeout} seconds."}
            )
        except Exception as exc:
            logger.exception(f"[tools] '{tool.name}' failed")
            await params.result_callback({"error": f"The '{tool.name}' request failed: {exc}"})

    return handler


def register_tools(
    llm: Any,
    context: LLMContext,
    tools: list[HttpTool],
    variables: dict[str, str],
    on_end_call: EndCallCallback | None = None,
    *,
    end_call_enabled: bool = True,
    end_call_description: str | None = None,
) -> list[FunctionSchema]:
    """Register HTTP tools + a built-in ``end_call`` on the LLM and context.

    Args:
        llm: The Pipecat LLM service (must expose ``register_function``).
        context: The ``LLMContext`` the schemas are advertised on.
        tools: HTTP tools from the agent config.
        variables: Resolved per-call variable map (see ``build_variable_map``).
        on_end_call: Coroutine invoked when the model calls ``end_call``.
        end_call_enabled: Whether to expose the built-in ``end_call`` tool.
        end_call_description: Override for the ``end_call`` tool description.

    Returns:
        The list of registered ``FunctionSchema`` (also attached to ``context``).
    """
    schemas: list[FunctionSchema] = []

    for tool in tools:
        properties, required = _split_parameters(tool.parameters)
        description = _fill_template(tool.description, variables)
        schema = FunctionSchema(
            name=tool.name,
            description=description,
            properties=properties,
            required=required,
        )
        llm.register_function(tool.name, _make_http_handler(tool, variables))
        schemas.append(schema)
        logger.info(f"[tools] registered HTTP tool '{tool.name}' ({tool.method} {tool.url})")

    if end_call_enabled and on_end_call is not None:
        description = _fill_template(
            end_call_description or _DEFAULT_END_CALL_DESCRIPTION, variables
        )

        async def end_call_handler(params: FunctionCallParams) -> None:
            logger.info("[tools] end_call invoked; ending call gracefully")
            await params.result_callback({"status": "ending_call"})
            try:
                await on_end_call()
            except Exception:
                logger.exception("[tools] end_call callback failed")

        end_call_schema = FunctionSchema(
            name="end_call",
            description=description,
            properties={},
            required=[],
        )
        llm.register_function("end_call", end_call_handler)
        schemas.append(end_call_schema)
        logger.info("[tools] registered built-in tool 'end_call'")

    context.set_tools(ToolsSchema(standard_tools=schemas) if schemas else ToolsSchema([]))
    logger.info(f"[tools] {len(schemas)} tool(s) attached to context")
    return schemas


def build_flow_tool_functions(tools: list[HttpTool], variables: dict[str, str]):
    """Build Pipecat Flows function schemas for a set of HTTP tools.

    The flow runtime (FlowManager) owns tool advertising per node, so — unlike
    ``register_tools`` (which sets the context tools directly for the single
    agent) — HTTP tools here are handed to the FlowManager as node/global
    functions. This reuses the same URL/auth templating and parameter-splitting
    machinery as ``register_tools``; only the handler signature differs
    (``(args, flow_manager)`` instead of ``FunctionCallParams``).

    Returns a list of ``FlowsFunctionSchema``. Each handler performs the HTTP
    call and returns ``(result, None)`` — a data-fetch function that never
    transitions the flow.
    """
    from pipecat.flows import FlowsFunctionSchema

    functions = []
    for tool in tools:
        properties, required = _split_parameters(tool.parameters)
        functions.append(
            FlowsFunctionSchema(
                name=tool.name,
                description=_fill_template(tool.description, variables),
                properties=properties,
                required=required,
                handler=_make_flow_http_handler(tool, variables),
            )
        )
        logger.info(f"[flow-tools] built HTTP tool '{tool.name}' ({tool.method} {tool.url})")
    return functions


def _make_flow_http_handler(tool: HttpTool, variables: dict[str, str]):
    """Flows-shaped handler ``(args, flow_manager) -> (result, None)`` performing
    the tool's HTTP call. Mirrors ``_make_http_handler`` but for the flow runtime."""

    async def handler(args: dict[str, Any], _flow_manager: Any):
        args = dict(args or {})
        url_values = {**variables, **{k: str(v) for k, v in args.items()}}
        url = _fill_template(tool.url, url_values)

        headers: dict[str, str] = {}
        if tool.headers:
            headers = {k: _fill_template(v, variables) for k, v in tool.headers.items()}
        _apply_auth(headers, tool.auth, variables)

        method = tool.method.upper()
        timeout = max(tool.timeout_ms, 1) / 1000
        logger.info(f"[flow-tools] calling '{tool.name}' -> {method} {url}")

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method == "GET":
                    response = await client.request(method, url, params=args, headers=headers)
                else:
                    response = await client.request(method, url, json=args, headers=headers)

            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body = response.json()
                except Exception:
                    body = response.text
            else:
                body = response.text

            logger.info(f"[flow-tools] '{tool.name}' -> HTTP {response.status_code}")
            return {"status_code": response.status_code, "body": body}, None
        except httpx.TimeoutException:
            logger.warning(f"[flow-tools] '{tool.name}' timed out after {timeout}s")
            return {"error": f"The '{tool.name}' request timed out after {timeout} seconds."}, None
        except Exception as exc:
            logger.exception(f"[flow-tools] '{tool.name}' failed")
            return {"error": f"The '{tool.name}' request failed: {exc}"}, None

    return handler
