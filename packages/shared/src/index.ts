/**
 * @vaani/shared — the contract layer.
 *
 * Zod schemas + inferred types shared across the API, widget, and (mirrored in
 * pydantic) the voice engine. The dispatch request and end-of-call report are
 * the load-bearing api <-> voice-engine boundary; change them deliberately.
 */
export * from "./agent-config.js";
export * from "./dispatch.js";
export * from "./report.js";
export * from "./events.js";
