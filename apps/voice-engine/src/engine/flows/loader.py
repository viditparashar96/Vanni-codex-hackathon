"""Flow-graph loader: compile a :class:`FlowConfig` into Pipecat Flows nodes.

The engine stores a flow agent as a directed graph of stages (``FlowNode``)
wired by transitions (``FlowTransition``). Pipecat Flows drives the call one
``NodeConfig`` at a time: each node advertises its transition functions as LLM
tools, and when the model calls one the handler returns ``(result, next_node)``
so Flows knows where to go next.

:class:`FlowRuntime` owns that compilation. It builds the initial node up front
and rebuilds each target node lazily inside the transition handler, so
``{{variables}}`` captured mid-call (from a transition's ``properties``) resolve
in downstream prompts, first messages and transition speech.

Mapping from our contract to Pipecat Flows ``NodeConfig``:

* ``taskMessages``            -> ``task_messages`` (roles coerced to "developer")
* ``roleMessages`` / global   -> ``role_message`` (single string, 1.5.0 form)
* ``functions``               -> ``functions`` (FlowsFunctionSchema transitions)
* ``serviceOverrides``        -> ``pre_actions`` (service-switch actions)
* ``firstMessage``            -> a trailing ``tts_say`` pre-action
* ``respondImmediately``      -> ``respond_immediately``
* ``contextStrategy``/summary -> ``context_strategy`` (ContextStrategyConfig)
* ``transitionSpeech``        -> a leading ``tts_say`` pre-action on the target
* ``handlerType==end_conversation`` / ``end`` nodes -> built-in end action

Telephony nodes (``transfer`` / ``dtmf`` / ``sms``) have no carrier backend yet:
their branch functions LOG the intended action and route the success/failure
branch. Nothing here places a real call, and nothing raises.
"""

from __future__ import annotations

from typing import Any, Optional

from loguru import logger
from pipecat.flows import (
    ContextStrategy,
    ContextStrategyConfig,
    FlowsFunctionSchema,
    NodeConfig,
)

from engine.contract import (
    ContextStrategyName,
    FlowConfig,
    FlowMessage,
    FlowNode,
    FlowServiceOverrides,
    FlowTransition,
    HttpTool,
)
from engine.tools import build_flow_tool_functions
from engine.variables import substitute

# RESET_WITH_SUMMARY requires a summary prompt (ContextStrategyConfig raises
# without one), so we always supply a sensible default rather than crash a
# transition the author configured for summarisation.
_DEFAULT_SUMMARY_PROMPT = (
    "Summarize the key facts gathered so far in this conversation: the caller's "
    "intent, any identifying details they provided, decisions made, and anything "
    "still outstanding. Be concise and factual — this summary seeds the next "
    "stage of the call."
)

# Where captured transition properties accumulate on flow_manager.state.
_VARS_KEY = "captured_vars"
# Per-function record of what was captured, surfaced in the end-of-call report.
_COLLECTED_KEY = "collected_params"


class FlowRuntime:
    """Compiles a :class:`FlowConfig` into Pipecat Flows node configs.

    Args:
        flow: The validated flow graph from the dispatch payload.
        values: Base variable map (customVariable defaults + injected + builtins).
        tools: Resolved HTTP tools from the agent config, indexed here by id.
    """

    def __init__(self, flow: FlowConfig, values: dict[str, str], tools: list[HttpTool]):
        self.flow = flow
        self.base_values = values
        self._tools_by_id = {t.id: t for t in tools}
        self._nodes: dict[str, FlowNode] = {n.id: n for n in flow.nodes}

        initial = next((n for n in flow.nodes if n.type == "initial"), None)
        if initial is None:
            raise ValueError("Flow has no 'initial' node")
        self.initial_id = initial.id

    # ── Public API ───────────────────────────────────────────────────────────

    def global_functions(self) -> list[FlowsFunctionSchema]:
        """HTTP tools available at every node, resolved from ``globalToolIds``."""
        tools = self._resolve_tools(self.flow.global_tool_ids)
        return build_flow_tool_functions(tools, self.base_values)

    def build_initial_node(self, flow_manager: Any) -> NodeConfig:
        return self.build_node(self.initial_id, flow_manager)

    def build_node(self, node_id: str, flow_manager: Any) -> Optional[NodeConfig]:
        """Compile one node into a Pipecat Flows ``NodeConfig``.

        ``flow_manager`` supplies the runtime variable overlay (properties
        captured on earlier transitions), so prompts resolve the latest values.
        """
        node = self._nodes.get(node_id)
        if node is None:
            logger.warning(f"[flow] build_node: unknown node id '{node_id}'")
            return None

        data = node.data
        values = self._runtime_values(flow_manager)

        if node.type in ("transfer", "dtmf", "sms"):
            self._log_telephony_intent(node, values)

        # Messages: task objectives + persona.
        task_messages = self._coerce_task_messages(data.task_messages, values)
        role_message = self._role_message(data.role_messages, values)

        # Transition functions + per-node HTTP tools.
        functions: list[FlowsFunctionSchema] = [
            self._transition_function(t) for t in data.functions
        ]
        functions.extend(
            build_flow_tool_functions(self._resolve_tools(data.tool_ids), values)
        )

        # Telephony nodes get a synthetic success branch + an outcome hint so the
        # model knows to advance even without a live carrier.
        if node.type in ("transfer", "dtmf", "sms"):
            synthetic = self._telephony_synthetic_function(node)
            if synthetic is not None:
                functions.append(synthetic)
            hint = self._telephony_hint(node)
            if hint:
                task_messages = task_messages + [{"role": "developer", "content": hint}]

        pre_actions = self._service_pre_actions(data.service_overrides)
        # firstMessage speaks exact text via TTS on entry, AFTER any service
        # switches so the switched voice is used.
        if data.first_message:
            pre_actions.append(
                {"type": "tts_say", "text": substitute(data.first_message, values)}
            )

        config: NodeConfig = {
            "name": node_id,
            "task_messages": task_messages
            or [{"role": "developer", "content": data.label or "Continue the conversation."}],
            "functions": functions,
        }
        if role_message:
            config["role_message"] = role_message
        if pre_actions:
            config["pre_actions"] = pre_actions
        if data.respond_immediately is not None:
            config["respond_immediately"] = data.respond_immediately

        strategy = self._context_strategy(data.context_strategy, data.summary_prompt)
        if strategy is not None:
            config["context_strategy"] = strategy

        # An 'end' node speaks its closing objective then hangs up via the
        # built-in end_conversation action.
        if node.type == "end":
            config["post_actions"] = [{"type": "end_conversation"}]

        return config

    # ── Message / persona helpers ─────────────────────────────────────────────

    def _coerce_task_messages(
        self, messages: list[FlowMessage], values: dict[str, str]
    ) -> list[dict]:
        """Resolve {{vars}} and coerce author roles to Pipecat Flows' "developer"
        role, which marks framework instructions apart from real speech."""
        out: list[dict] = []
        for msg in messages:
            role = "developer" if msg.role in ("system", "user") else msg.role
            out.append({"role": role, "content": substitute(msg.content, values)})
        return out

    def _role_message(
        self, node_role_messages: Optional[list[FlowMessage]], values: dict[str, str]
    ) -> Optional[str]:
        """Resolve the node persona to a single string (1.5.0 ``role_message``).

        Prefers the node's own role messages, else the flow-global persona. The
        several message contents are joined into one system instruction."""
        messages = node_role_messages or self.flow.global_role_messages
        if not messages:
            return None
        parts = [substitute(m.content, values) for m in messages if m.content]
        joined = "\n\n".join(p for p in parts if p)
        return joined or None

    # ── Context strategy ──────────────────────────────────────────────────────

    def _context_strategy(
        self, node_strategy: Optional[ContextStrategyName], node_summary: Optional[str]
    ) -> Optional[ContextStrategyConfig]:
        """Build a ``ContextStrategyConfig`` from node/global settings.

        Returns None for the APPEND default (Pipecat's own default) so we leave
        the key unset."""
        name = node_strategy or self.flow.global_context_strategy
        if not name or name == "append":
            return None
        if name == "reset":
            return ContextStrategyConfig(strategy=ContextStrategy.RESET)
        if name == "reset_with_summary":
            summary = node_summary or self.flow.global_summary_prompt or _DEFAULT_SUMMARY_PROMPT
            return ContextStrategyConfig(
                strategy=ContextStrategy.RESET_WITH_SUMMARY, summary_prompt=summary
            )
        logger.warning(f"[flow] unknown contextStrategy '{name}' — using append")
        return None

    # ── Service overrides ─────────────────────────────────────────────────────

    def _service_pre_actions(
        self, overrides: Optional[FlowServiceOverrides]
    ) -> list[dict]:
        """Translate ``serviceOverrides`` into service-switch pre-actions (see
        ``flows.actions``)."""
        if overrides is None:
            return []
        actions: list[dict] = []
        if overrides.llm is not None:
            llm: dict[str, Any] = {}
            if overrides.llm.model is not None:
                llm["model"] = overrides.llm.model
            if overrides.llm.temperature is not None:
                llm["temperature"] = overrides.llm.temperature
            if llm:
                actions.append({"type": "switch_llm_settings", **llm})
        if overrides.tts is not None:
            tts: dict[str, Any] = {}
            if overrides.tts.voice is not None:
                tts["voice"] = overrides.tts.voice
            if overrides.tts.model is not None:
                tts["model"] = overrides.tts.model
            if tts:
                actions.append({"type": "switch_tts_voice", **tts})
            if overrides.tts.speed is not None:
                actions.append({"type": "switch_tts_speed", "speed": overrides.tts.speed})
        if overrides.stt is not None:
            stt: dict[str, Any] = {}
            if overrides.stt.model is not None:
                stt["model"] = overrides.stt.model
            if overrides.stt.language is not None:
                stt["language"] = overrides.stt.language
            if stt:
                actions.append({"type": "switch_stt_settings", **stt})
        if overrides.stt_mute:
            actions.append({"type": "stt_mute", "mute": True})
        return actions

    # ── Transitions ───────────────────────────────────────────────────────────

    def _transition_function(self, transition: FlowTransition) -> FlowsFunctionSchema:
        """Build the FlowsFunctionSchema the LLM calls to take this branch.

        On call the handler: captures the transition's ``properties`` as
        variables (available to downstream nodes as ``{{param}}``); records them
        for the report; then either ends the call (``end_conversation``) or
        builds and returns the target node config (applying ``transitionSpeech``
        on entry).
        """
        target = transition.target_node
        name = transition.name

        async def handler(args: dict[str, Any], flow_manager: Any):
            captured = {k: v for k, v in (args or {}).items() if v is not None and v != ""}
            if captured:
                store = flow_manager.state.setdefault(_VARS_KEY, {})
                store.update({k: str(v) for k, v in captured.items()})
                flow_manager.state.setdefault(_COLLECTED_KEY, {})[name] = dict(captured)
                logger.info(f"[flow] transition '{name}' captured: {list(captured.keys())}")
            else:
                logger.info(f"[flow] transition '{name}' taken")

            result: dict[str, Any] = {"status": "ok"}
            if captured:
                result["captured"] = captured

            if transition.handler_type == "end_conversation":
                return result, self._end_node(transition, flow_manager)

            if target and target in self._nodes:
                next_node = self.build_node(target, flow_manager)
                if next_node is not None and transition.transition_speech:
                    spoken = substitute(
                        transition.transition_speech, self._runtime_values(flow_manager)
                    )
                    next_node["pre_actions"] = [
                        {"type": "tts_say", "text": spoken},
                        *next_node.get("pre_actions", []),
                    ]
                return result, next_node

            if target:
                logger.warning(
                    f"[flow] transition '{name}' targets unknown node '{target}'; "
                    f"staying put (known nodes: {sorted(self._nodes)})"
                )
            return result, None

        return FlowsFunctionSchema(
            name=name,
            description=transition.description,
            properties=transition.properties or {},
            required=transition.required or [],
            handler=handler,
        )

    def _end_node(self, transition: FlowTransition, flow_manager: Any) -> NodeConfig:
        """A synthetic terminal node: speak a brief closing line, then hang up via
        the built-in end_conversation action. Used for ``end_conversation``
        transitions so the call ends cleanly through Flows' own machinery."""
        pre_actions: list[dict] = []
        if transition.transition_speech:
            spoken = substitute(
                transition.transition_speech, self._runtime_values(flow_manager)
            )
            pre_actions.append({"type": "tts_say", "text": spoken})
        node: NodeConfig = {
            "name": f"__end__{transition.name}",
            "task_messages": [
                {
                    "role": "developer",
                    "content": "The conversation is complete. Give a brief, warm closing line.",
                }
            ],
            "functions": [],
            "post_actions": [{"type": "end_conversation"}],
        }
        if pre_actions:
            node["pre_actions"] = pre_actions
        return node

    # ── Telephony (no carrier backend yet) ─────────────────────────────────────

    def _log_telephony_intent(self, node: FlowNode, values: dict[str, str]) -> None:
        """Log the intended telephony side effect on node entry. No carrier call."""
        data = node.data
        if node.type == "transfer":
            logger.info(
                f"[flow][telephony] TRANSFER intent (node '{node.id}'): "
                f"to={substitute(data.transfer_to or '', values) or '?'} "
                f"type={data.transfer_type or 'cold'} — no carrier configured, logging only"
            )
        elif node.type == "dtmf":
            logger.info(
                f"[flow][telephony] DTMF intent (node '{node.id}'): "
                f"digits={data.dtmf_digits or '?'} — no carrier configured, logging only"
            )
        elif node.type == "sms":
            dest = "caller" if data.sms_to == "caller" else (data.sms_to_number or "?")
            logger.info(
                f"[flow][telephony] SMS intent (node '{node.id}'): "
                f"to={dest} body={substitute(data.sms_content or '', values)!r} "
                f"— no carrier configured, logging only"
            )

    def _telephony_synthetic_function(
        self, node: FlowNode
    ) -> Optional[FlowsFunctionSchema]:
        """For a transfer node with no explicit success branch, synthesize one
        that ends the call (a completed transfer hands the caller off)."""
        if node.type != "transfer":
            return None
        has_success = any(f.source_handle != "transfer-failure" for f in node.data.functions)
        if has_success:
            return None
        return self._transition_function(
            FlowTransition(
                name="transfer_completed",
                description=(
                    "The transfer has been placed and the caller is being connected. "
                    "Call this to complete the hand-off."
                ),
                handler_type="end_conversation",
                transition_speech="You're being connected now. Thank you!",
            )
        )

    def _telephony_hint(self, node: FlowNode) -> Optional[str]:
        """A developer instruction telling the model which branch to take.

        With no carrier backend the action always "succeeds", so we point the
        model at the success branch; the failure branch stays registered but is
        only taken if the model explicitly determines a failure."""
        data = node.data
        if node.type == "transfer":
            success = next(
                (f for f in data.functions if f.source_handle != "transfer-failure"), None
            )
            success_name = success.name if success else "transfer_completed"
            return (
                "A call transfer has just been initiated (no live carrier in this "
                f"environment, so treat it as successful). Call `{success_name}` to "
                "proceed. Only take a failure branch if the caller cannot be transferred."
            )
        if node.type == "sms":
            success = next(
                (f for f in data.functions if f.source_handle == "sms-success"), None
            )
            if success:
                return (
                    "An SMS has just been sent (no live carrier in this environment, so "
                    f"treat it as delivered). Call `{success.name}` to proceed. Only take "
                    "the failure branch if sending is clearly not possible."
                )
            return None
        if node.type == "dtmf":
            first = data.functions[0] if data.functions else None
            if first:
                return (
                    f"The keypad digits '{data.dtmf_digits or ''}' have just been sent "
                    f"(logged only in this environment). Call `{first.name}` to continue."
                )
            return None
        return None

    # ── Variables / tools ─────────────────────────────────────────────────────

    def _runtime_values(self, flow_manager: Any) -> dict[str, str]:
        """Base variables overlaid with anything captured on earlier transitions
        (last write wins), so mid-call {{vars}} resolve in later prompts."""
        values = dict(self.base_values)
        if flow_manager is not None:
            captured = flow_manager.state.get(_VARS_KEY) or {}
            values.update(captured)
        return values

    def _resolve_tools(self, tool_ids: Optional[list[str]]) -> list[HttpTool]:
        """Resolve org tool ids to the HTTP tools carried on the agent config."""
        if not tool_ids:
            return []
        resolved: list[HttpTool] = []
        for tid in tool_ids:
            tool = self._tools_by_id.get(tid)
            if tool is None:
                logger.warning(f"[flow] tool id '{tid}' not found in agent config — skipping")
                continue
            resolved.append(tool)
        return resolved
