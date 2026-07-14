"use client";

import * as React from "react";
import { Code2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { CustomVariable, FlowMessage, FlowNodeData, FlowNodeType } from "@/lib/flow-contract";
import { Field, FieldLabel } from "@/components/flow/flow-fields";

/** Variables the runtime always exposes, in addition to the flow's custom ones. */
const BUILT_IN_VARS = ["current_date", "current_time", "current_day", "agent_name", "org_name"];

interface PromptPanelProps {
  data: FlowNodeData;
  kind: FlowNodeType;
  customVariables: CustomVariable[];
  onChange: (patch: Partial<FlowNodeData>) => void;
}

/**
 * The "Prompt" tab of the node inspector — the node's spoken/authored copy.
 * Shape depends on the node kind: telephony nodes edit their own message,
 * the start node also carries the persona, everything else edits the objective.
 */
export function PromptPanel({ data, kind, customVariables, onChange }: PromptPanelProps) {
  const taskRef = React.useRef<HTMLTextAreaElement>(null);
  const roleRef = React.useRef<HTMLTextAreaElement>(null);
  const smsRef = React.useRef<HTMLTextAreaElement>(null);

  const taskContent = data.taskMessages?.[0]?.content ?? "";
  const roleContent = data.roleMessages?.[0]?.content ?? "";

  const allVars = [...customVariables.map((v) => v.name), ...BUILT_IN_VARS];

  const setTask = (content: string) =>
    onChange({ taskMessages: [{ role: "system", content }] });
  const setRole = (content: string) =>
    onChange({ roleMessages: content ? [{ role: "system", content }] : undefined });

  // ── SMS node: message body + what the agent says before sending ──
  if (kind === "sms") {
    return (
      <div className="space-y-1">
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Message</span>
              <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                {(data.smsContent ?? "").length} chars
              </span>
            </span>
          }
          hint="Static body, or composition instructions for the model. Supports {{variables}}."
        >
          <Textarea
            ref={smsRef}
            value={data.smsContent ?? ""}
            onChange={(e) => onChange({ smsContent: e.target.value })}
            placeholder="Exact text to send, or instructions for what to write…"
            className="min-h-[92px] rounded-xl border-[1.5px] border-input text-[12.5px]"
          />
        </Field>
        {allVars.length > 0 && (
          <VariableInsertRow
            variables={allVars}
            onInsert={(name) =>
              insertVariable(smsRef, name, (v) => onChange({ smsContent: v }), data.smsContent ?? "")
            }
          />
        )}

        <Field
          label="Agent speech"
          hint="What the agent says before sending the message."
          className="mt-4 mb-0"
        >
          <Textarea
            ref={taskRef}
            value={taskContent}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. I'll text that over to you now."
            className="min-h-[72px] rounded-xl border-[1.5px] border-input font-mono text-[12.5px]"
          />
        </Field>
      </div>
    );
  }

  // ── Transfer node: handoff line ──
  if (kind === "transfer") {
    return (
      <div className="space-y-1">
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Handoff message</span>
              <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                {taskContent.length} chars
              </span>
            </span>
          }
          hint="Spoken before the transfer begins. Leave empty to hand off immediately."
          className="mb-0"
        >
          <Textarea
            ref={taskRef}
            value={taskContent}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. One moment while I connect you to a specialist."
            className="min-h-[92px] rounded-xl border-[1.5px] border-input font-mono text-[12.5px]"
          />
        </Field>
        {allVars.length > 0 && (
          <VariableInsertRow
            variables={allVars}
            onInsert={(name) => insertVariable(taskRef, name, setTask, taskContent)}
          />
        )}
      </div>
    );
  }

  // ── End node: closing objective ──
  if (kind === "end") {
    return (
      <Field
        label="Closing objective"
        hint="What the agent should wrap up before the call ends."
        className="mb-0"
      >
        <Textarea
          ref={taskRef}
          value={taskContent}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Thank the caller, restate anything confirmed, and close politely."
          className="min-h-[110px] rounded-xl border-[1.5px] border-input text-[12.5px]"
        />
      </Field>
    );
  }

  // ── Conversation / initial node ──
  return (
    <div className="space-y-1">
      {kind === "initial" && (
        <>
          <Field
            label={
              <span className="flex items-center justify-between">
                <span>Persona (role message)</span>
                <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                  {roleContent.length} chars
                </span>
              </span>
            }
            hint="Defines the agent's personality. Applied to every node unless a node overrides it."
          >
            <Textarea
              ref={roleRef}
              value={roleContent}
              onChange={(e) => setRole(e.target.value)}
              placeholder="You are a warm, concise voice assistant…"
              className="min-h-[110px] rounded-xl border-[1.5px] border-input font-mono text-[12.5px]"
            />
          </Field>
          {allVars.length > 0 && (
            <VariableInsertRow
              variables={allVars}
              onInsert={(name) => insertVariable(roleRef, name, setRole, roleContent)}
            />
          )}
        </>
      )}

      <Field
        label={
          <span className="flex items-center justify-between">
            <span>Node objective</span>
            <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
              {taskContent.length} chars
            </span>
          </span>
        }
        hint="What the agent should accomplish at this stage. Be specific about goals and when to move on."
        className={kind === "initial" ? "mt-4 mb-0" : "mb-0"}
      >
        <Textarea
          ref={taskRef}
          value={taskContent}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Greet the caller and find out how you can help today…"
          className="min-h-[150px] rounded-xl border-[1.5px] border-input font-mono text-[12.5px]"
        />
      </Field>
      {allVars.length > 0 && (
        <VariableInsertRow
          variables={allVars}
          onInsert={(name) => insertVariable(taskRef, name, setTask, taskContent)}
        />
      )}
    </div>
  );
}

// ── Variable quick-insert ────────────────────────────────────────────────────

function VariableInsertRow({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (name: string) => void;
}) {
  return (
    <div className="mt-1 space-y-1.5">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Code2 className="size-3" />
        Click to insert a variable
      </p>
      <div className="flex flex-wrap gap-1">
        {variables.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onInsert(name)}
            className="rounded-md border-[1.5px] border-input bg-cream/60 px-1.5 py-0.5 font-mono text-[10px] text-forest hover:border-ink hover:text-ink"
          >
            {`{{${name}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Insert `{{name}}` at the caret of a textarea, keeping the cursor sensible. */
function insertVariable(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  varName: string,
  setter: (val: string) => void,
  current: string,
) {
  const el = ref.current;
  const token = `{{${varName}}}`;
  if (!el) {
    setter(`${current}${token}`);
    return;
  }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const next = current.slice(0, start) + token + current.slice(end);
  setter(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
}

export type { FlowMessage };
