"""Pydantic mirror of @vaani/shared (packages/shared/src).

The engine validates the dispatch payload against these and builds reports/events
with them. Field names are snake_case in Python but (de)serialize as camelCase to
match the TypeScript contract. KEEP IN SYNC with packages/shared — CI checks this.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _Base(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


# ── Agent config ────────────────────────────────────────────────────────────

class RealtimeConfig(_Base):
    enabled: bool = False
    provider: Literal["openai_realtime", "gemini_live"] | None = None
    model: str | None = None
    voice: str | None = None


class VoiceConfig(_Base):
    llm_provider: Literal["openai", "anthropic", "google", "groq"] = "openai"
    llm_model: str = "gpt-4.1-mini"
    stt_provider: Literal["deepgram", "assemblyai", "azure", "openai", "speechmatics"] = "deepgram"
    stt_model: str = "nova-3-general"
    stt_language: str | None = None
    tts_provider: Literal["cartesia", "elevenlabs", "deepgram", "openai"] = "cartesia"
    tts_model: str | None = None
    tts_voice: str | None = None
    language: str = "en"
    voice_speed: float | None = None
    realtime: RealtimeConfig | None = None


class CustomVariable(_Base):
    name: str
    default_value: str | None = None
    description: str | None = None


class PersonaConfig(_Base):
    system_prompt: str
    agent_speaks_first: bool = False
    greeting_message: str | None = None
    personality_traits: list[str] | None = None
    speaking_style: str | None = None
    response_length_preference: Literal["concise", "balanced", "verbose"] | None = None
    custom_variables: list[CustomVariable] | None = None


class VadConfig(_Base):
    stop_secs: float = 0.3
    confidence: float = 0.7
    min_volume: float = 0.6


class BackgroundNoise(_Base):
    enabled: bool = False
    sound: Literal["office", "call_center", "cafe"] = "office"
    volume: float = 0.3


class VoicemailConfig(_Base):
    enabled: bool = False
    response_delay_secs: float = 2.0
    leave_message: bool = False
    message: str = ""


class IvrNavigation(_Base):
    enabled: bool = False
    goal_template: str | None = None
    max_navigation_secs: int = 90
    on_stuck: Literal["end_call", "continue_to_flow"] = "continue_to_flow"


class ChatSettings(_Base):
    chat_max_duration_secs: int = 480
    chat_idle_warning_secs: int = 20
    chat_idle_timeout_secs: int = 25


class AdvancedConfig(_Base):
    max_call_duration_secs: int = 240
    inactivity_timeout_secs: int = 30
    timezone: str = "UTC"
    silence_during_intro: bool = True
    silence_when_agent_speaks: bool = False
    vad: VadConfig = Field(default_factory=VadConfig)
    background_noise: BackgroundNoise = Field(default_factory=BackgroundNoise)
    graceful_exit_enabled: bool = True
    graceful_exit_warning_secs: int = 30
    goodbye_message: str = "Thank you for your time. Goodbye!"
    enable_end_call: bool = True
    end_call_description: str | None = None
    voicemail: VoicemailConfig = Field(default_factory=VoicemailConfig)
    ivr_navigation: IvrNavigation | None = None
    chat_settings: ChatSettings | None = None
    screen_aware: dict[str, Any] | None = None


class ToolAuth(_Base):
    type: Literal["none", "api_key", "bearer"] = "none"
    value: str | None = None
    header_name: str | None = None


class HttpTool(_Base):
    id: str
    name: str
    description: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"] = "POST"
    url: str
    headers: dict[str, str] | None = None
    auth: ToolAuth | None = None
    timeout_ms: int = 10000


class KnowledgeBaseBinding(_Base):
    knowledge_base_id: str
    chunks_to_retrieve: int = 3
    similarity_threshold: float = 0.5


# ── Flow-agent graph (mirrors @vaani/shared FlowConfig) ─────────────────────
#
# A flow agent is a directed graph of conversation stages ("nodes") wired
# together by transitions ("functions"). Each node has its own objective,
# prompts, tools, and service overrides; the LLM advances the call by calling
# one of the node's transition functions when that branch's condition is met.
# The engine compiles each node into a Pipecat Flows NodeConfig on entry.

FlowNodeType = Literal["initial", "node", "end", "transfer", "dtmf", "sms"]
HandlerType = Literal["transition", "end_conversation"]
ContextStrategyName = Literal["append", "reset", "reset_with_summary"]
SourceHandle = Literal["transfer-failure", "sms-success", "sms-failure"]


class FlowMessage(_Base):
    """A single prompt message. Task messages are framework instructions; role
    messages define the node's persona."""

    role: Literal["system", "user", "assistant", "developer"] = "system"
    content: str


class FlowServiceLlm(_Base):
    model: str | None = None
    temperature: float | None = None


class FlowServiceTts(_Base):
    voice: str | None = None
    model: str | None = None
    speed: float | None = None


class FlowServiceStt(_Base):
    model: str | None = None
    language: str | None = None


class FlowServiceOverrides(_Base):
    """Per-node overrides of the pipeline's LLM/TTS/STT services, applied on
    entry to the node via update-settings frames and implicitly reverted by the
    next node's own settings."""

    llm: FlowServiceLlm | None = None
    tts: FlowServiceTts | None = None
    stt: FlowServiceStt | None = None
    stt_mute: bool | None = None


class FlowTransition(_Base):
    """A transition out of a node. The LLM picks one by calling it; `description`
    tells the model WHEN this branch applies. `properties`/`required` are the
    data captured as the branch fires; captured values become `{{param}}`
    downstream."""

    name: str
    description: str
    handler_type: HandlerType = "transition"
    target_node: str | None = None
    properties: dict[str, Any] | None = None
    required: list[str] | None = None
    transition_speech: str | None = None
    source_handle: SourceHandle | None = None


class FlowNodeData(_Base):
    label: str
    task_messages: list[FlowMessage] = Field(default_factory=list)
    role_messages: list[FlowMessage] | None = None
    respond_immediately: bool | None = None
    first_message: str | None = None
    context_strategy: ContextStrategyName | None = None
    summary_prompt: str | None = None
    service_overrides: FlowServiceOverrides | None = None
    tool_ids: list[str] | None = None
    knowledge_base: KnowledgeBaseBinding | None = None
    functions: list[FlowTransition] = Field(default_factory=list)

    # Telephony node fields (type: transfer | dtmf | sms).
    transfer_to: str | None = None
    transfer_type: Literal["cold", "warm"] | None = None
    dtmf_digits: str | None = None
    sms_content: str | None = None
    sms_to: Literal["caller", "static"] | None = None
    sms_to_number: str | None = None


class FlowNodePosition(_Base):
    x: float = 0
    y: float = 0


class FlowNode(_Base):
    id: str
    type: FlowNodeType = "node"
    position: FlowNodePosition | None = None
    data: FlowNodeData


class FlowMeta(_Base):
    name: str
    version: str
    description: str | None = None


class GlobalCallSettings(_Base):
    """The flow-agent counterpart to AdvancedConfig — call-level behaviour that
    applies across every node."""

    max_call_duration_secs: int = 240
    inactivity_timeout_secs: int = 30
    timezone: str = "UTC"
    vad: VadConfig = Field(default_factory=VadConfig)
    background_noise: BackgroundNoise = Field(default_factory=BackgroundNoise)
    graceful_exit_enabled: bool = True
    graceful_exit_warning_secs: int = 30
    goodbye_message: str = "Thank you for your time. Goodbye!"
    voicemail: VoicemailConfig = Field(default_factory=VoicemailConfig)
    post_call_analysis: dict[str, Any] | None = None


class FlowConfig(_Base):
    meta: FlowMeta
    nodes: list[FlowNode] = Field(default_factory=list)
    global_role_messages: list[FlowMessage] | None = None
    global_tool_ids: list[str] | None = None
    global_knowledge_bases: list[KnowledgeBaseBinding] | None = None
    global_context_strategy: ContextStrategyName | None = None
    global_summary_prompt: str | None = None
    custom_variables: list[CustomVariable] | None = None
    global_call_settings: GlobalCallSettings | None = None


class AgentConfig(_Base):
    type: Literal["simple", "flow"]
    voice: VoiceConfig
    persona: PersonaConfig | None = None
    flow: FlowConfig | None = None
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)
    tools: list[HttpTool] = Field(default_factory=list)
    knowledge_bases: list[KnowledgeBaseBinding] = Field(default_factory=list)


# ── Dispatch (API → engine) ───────────────────────────────────────────────

class TransportConfig(_Base):
    type: Literal["livekit", "daily", "smallwebrtc"]
    url: str | None = None
    token: str | None = None
    room_name: str | None = None


class CallbackUrls(_Base):
    report: str
    events: str


class DispatchRequest(_Base):
    call_id: str
    org_id: str
    agent_id: str
    version_id: str
    mode: Literal["web_test", "widget", "shared", "phone", "chat"]
    direction: Literal["inbound", "outbound"]
    transport: TransportConfig
    agent_config: AgentConfig
    variables: dict[str, str] = Field(default_factory=dict)
    from_number: str | None = None
    to_number: str | None = None
    callbacks: CallbackUrls
    metadata: dict[str, Any] | None = None


class DispatchAck(_Base):
    call_id: str
    accepted: bool
    reason: str | None = None


# ── End-of-call report (engine → API) ──────────────────────────────────────

class TranscriptEntry(_Base):
    role: Literal["user", "agent", "system"]
    text: str
    ts: int
    latency_ms: int | None = None


class CallMetrics(_Base):
    voice_to_voice_p50_ms: int | None = None
    voice_to_voice_p95_ms: int | None = None
    interruptions: int = 0
    dead_air_secs: float = 0
    turns: int = 0


class SttUsage(_Base):
    provider: str
    model: str
    seconds: float


class LlmUsage(_Base):
    provider: str
    model: str
    input_tokens: int
    cached_input_tokens: int = 0
    output_tokens: int


class TtsUsage(_Base):
    provider: str
    model: str
    characters: int


class Usage(_Base):
    stt: SttUsage | None = None
    llm: LlmUsage | None = None
    tts: TtsUsage | None = None


class PostCallAnalysis(_Base):
    summary: str | None = None
    sentiment: str | None = None
    structured_data: dict[str, Any] | None = None


class QaTag(_Base):
    tag: str
    evidence: str | None = None


class QaResult(_Base):
    call_quality_score: int
    overall_sentiment: str
    summary: str
    tags: list[QaTag] = Field(default_factory=list)


class RecordingRef(_Base):
    storage_path: str | None = None
    duration_secs: float | None = None


class EndOfCallReport(_Base):
    call_id: str
    status: Literal["completed", "failed", "no_answer", "busy", "voicemail"]
    started_at: int
    ended_at: int
    duration_secs: float
    transcript: list[TranscriptEntry] = Field(default_factory=list)
    metrics: CallMetrics = Field(default_factory=CallMetrics)
    usage: Usage = Field(default_factory=Usage)
    analysis: PostCallAnalysis | None = None
    qa: QaResult | None = None
    recording: RecordingRef | None = None
    error: str | None = None


# ── Realtime feedback events (engine → live WS + DB) ───────────────────────

class FeedbackEvent(_Base):
    call_id: str
    type: Literal[
        "transcript",
        "tool_call",
        "node_transition",
        "latency",
        "vad",
        "interruption",
        "call_status",
    ]
    ts: int
    payload: dict[str, Any] = Field(default_factory=dict)


class FeedbackEventBatch(_Base):
    call_id: str
    events: list[FeedbackEvent] = Field(default_factory=list)
