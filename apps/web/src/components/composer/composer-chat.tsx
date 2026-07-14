"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowUp,
  Check,
  FileText,
  Globe,
  Paperclip,
  Sparkles,
  Waypoints,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Msg =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "research"; text: string }
  | {
      kind: "proposal";
      title: string;
      summary: string[];
      status: "pending" | "applied" | "discarded";
    };

const SEED: Msg[] = [
  {
    kind: "user",
    text: "Build me an agent that calls patients who no-showed today and rebooks them. It should verify identity first, and hand off to the desk if someone is upset.",
  },
  {
    kind: "research",
    text: "Read clinic handbook KB · checked existing tools (get_open_slots, book_appointment) · reviewed your Appointment Reminder flow for house style",
  },
  {
    kind: "assistant",
    text: "That's a 4-stage conversation with a branch to a human — I'd build it as a flow agent. It verifies DOB, mentions the missed visit without assigning blame, offers the two soonest slots, and warm-transfers on frustration. Here's the full draft:",
  },
  {
    kind: "proposal",
    title: "Create flow agent — “No-show Rebooker”",
    summary: [
      "6 nodes: greet & verify → acknowledge miss → offer slots → confirm + SMS → transfer (on frustration) → end",
      "Tools: lookup_patient, get_open_slots, book_appointment, send_sms",
      "Voice: Meera (Cartesia) · gpt-4.1-mini · deepgram nova-3",
      "Voicemail: leave rebooking message after 2.0s",
      "QA extraction: rebooked (boolean), new_date, refusal_reason",
    ],
    status: "pending",
  },
];

export function ComposerChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = React.useState<Msg[]>(SEED);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const feedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { kind: "user", text }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        {
          kind: "assistant",
          text: "Done — I've folded that into the draft. Anything else before I finalize the proposal?",
        },
      ]);
    }, 1600);
  };

  const decide = (idx: number, decision: "applied" | "discarded") => {
    setMessages((m) =>
      m.map((msg, i) => (i === idx && msg.kind === "proposal" ? { ...msg, status: decision } : msg)),
    );
    if (decision === "applied") {
      toast.success("Agent created — No-show Rebooker v1 (draft)", {
        description: "Open it in Agents to review, test and publish.",
      });
      setMessages((m) => [
        ...m,
        {
          kind: "assistant",
          text: "Created as a draft — v1 is in your Agents list. Want me to mint a share link so the desk team can test it?",
        },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        { kind: "assistant", text: "Discarded. Tell me what to change and I'll redraft." },
      ]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* thread */}
      <div ref={feedRef} className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto", compact ? "p-5" : "p-7")}>
        {messages.map((m, i) => {
          if (m.kind === "user")
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-forest px-4 py-3 text-[13.5px] leading-relaxed text-paper">
                  {m.text}
                </div>
              </div>
            );
          if (m.kind === "research")
            return (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-dashed border-ink/25 bg-cream/60 px-3.5 py-2.5">
                <Globe className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-[11.5px] leading-relaxed text-muted-foreground">{m.text}</span>
              </div>
            );
          if (m.kind === "assistant")
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime">
                  <Sparkles className="size-3.5 text-forest" />
                </span>
                <div className="max-w-[85%] text-[13.5px] leading-relaxed text-ink">{m.text}</div>
              </div>
            );
          /* proposal card — propose-then-apply */
          return (
            <div
              key={i}
              className={cn(
                "overflow-hidden rounded-2xl border-[1.5px] transition-all",
                m.status === "pending"
                  ? "border-ink bg-paper shadow-[4px_4px_0_var(--ink)]"
                  : m.status === "applied"
                    ? "border-forest/40 bg-lime/10"
                    : "border-border bg-paper opacity-55",
              )}
            >
              <div className="flex items-center gap-2.5 border-b border-border bg-cream/70 px-4 py-3">
                <Waypoints className="size-4 text-forest" />
                <span className="font-display text-[13px] font-bold text-ink">{m.title}</span>
                <span
                  className={cn(
                    "eyebrow ml-auto text-[8.5px]",
                    m.status === "pending" ? "text-brand-orange" : m.status === "applied" ? "text-forest" : "text-muted-foreground",
                  )}
                >
                  {m.status === "pending" ? "Awaiting apply" : m.status}
                </span>
              </div>
              <ul className="space-y-1.5 px-4 py-3.5">
                {m.summary.map((s, j) => (
                  <li key={j} className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                    <FileText className="mt-0.5 size-3 shrink-0 text-forest/60" />
                    {s}
                  </li>
                ))}
              </ul>
              {m.status === "pending" && (
                <div className="flex gap-2.5 border-t border-border px-4 py-3">
                  <button
                    type="button"
                    onClick={() => decide(i, "applied")}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-lime font-display text-[10.5px] font-extrabold tracking-[0.12em] text-forest uppercase transition-transform hover:-translate-y-0.5"
                  >
                    <Check className="size-3.5 stroke-[3]" />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(i, "discarded")}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-border px-5 font-display text-[10.5px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-ink hover:text-ink"
                  >
                    <X className="size-3.5" />
                    Discard
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {thinking && (
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-lime">
              <Sparkles className="size-3.5 animate-pulse text-forest" />
            </span>
            <span className="text-[12.5px] text-muted-foreground">Drafting…</span>
          </div>
        )}
      </div>

      {/* input */}
      <div className={cn("border-t-[1.5px] border-border bg-paper", compact ? "p-4" : "p-5")}>
        <div className="flex items-end gap-2.5 rounded-2xl border-[1.5px] border-input bg-cream/50 p-2.5 focus-within:border-ink">
          <button
            type="button"
            onClick={() => toast("Attach PDFs, docs or images — 25 MB each")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-ink"
            aria-label="Attach files"
          >
            <Paperclip className="size-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Describe the agent, or ask for changes…"
            className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[13.5px] text-ink outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-all hover:-translate-y-0.5 disabled:opacity-30"
            aria-label="Send"
          >
            <ArrowUp className="size-4 stroke-[2.5]" />
          </button>
        </div>
        <p className="mt-2 px-1 text-[10.5px] text-muted-foreground">
          Reads run automatically · every write needs your explicit Apply
        </p>
      </div>
    </div>
  );
}
