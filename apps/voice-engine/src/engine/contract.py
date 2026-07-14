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


class AgentConfig(_Base):
    type: Literal["simple", "flow"]
    voice: VoiceConfig
    persona: PersonaConfig | None = None
    flow: dict[str, Any] | None = None
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
