"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_KEYS = [
  { provider: "OpenAI", masked: "sk-•••••••••••••4f2a", scope: "LLM · STT" },
  { provider: "Deepgram", masked: "dg-•••••••••••••9c1e", scope: "STT" },
  { provider: "Cartesia", masked: "not set — using platform key", scope: "TTS" },
];

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rise-in rounded-2xl border-[1.5px] border-border bg-paper p-6">
        <h2 className="display mb-5 text-[17px] text-ink">Organization</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="eyebrow mb-2 text-[10px] text-ink">Name</div>
            <Input defaultValue="Cedarline Health" className="h-11 rounded-xl border-[1.5px] border-input" />
          </div>
          <div>
            <div className="eyebrow mb-2 text-[10px] text-ink">Timezone</div>
            <Select defaultValue="pt">
              <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">America/Los_Angeles</SelectItem>
                <SelectItem value="et">America/New_York</SelectItem>
                <SelectItem value="ist">Asia/Kolkata</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.success("Organization settings saved")}
          className="mt-6 flex h-10 items-center rounded-full bg-ink px-6 font-display text-[11px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
        >
          Save changes
        </button>
      </section>

      <section className="rise-in rise-in-1 rounded-2xl border-[1.5px] border-border bg-paper p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display text-[17px] text-ink">Provider keys (BYO)</h2>
          <button
            type="button"
            onClick={() => toast("Keys are AES-256-GCM encrypted at rest, always masked on read")}
            className="text-[12px] font-semibold text-forest underline-offset-4 hover:underline"
          >
            + Add key
          </button>
        </div>
        <div className="space-y-2.5">
          {PROVIDER_KEYS.map((k) => (
            <div key={k.provider} className="flex items-center gap-4 rounded-xl bg-cream/70 px-4 py-3.5">
              <span className="w-24 font-display text-[13px] font-bold text-ink">{k.provider}</span>
              <span className="flex-1 font-mono text-[12px] text-muted-foreground">{k.masked}</span>
              <span className="eyebrow text-[9px] text-muted-foreground">{k.scope}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
          Resolution order: your org key → platform default. Keys are encrypted before insert and never echoed back.
        </p>
      </section>

      <section className="rise-in rise-in-2 rounded-2xl border-[1.5px] border-destructive/40 bg-paper p-6">
        <h2 className="display mb-2 text-[17px] text-destructive">Danger zone</h2>
        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">
          Deleting the organization archives every agent, number and recording. Requires the Owner
          role and typing the org name to confirm.
        </p>
        <button
          type="button"
          onClick={() => toast.error("Owner confirmation required", { description: "Type the organization name to proceed." })}
          className="mt-5 flex h-10 items-center rounded-full border-[1.5px] border-destructive px-6 font-display text-[11px] font-extrabold tracking-[0.1em] text-destructive uppercase transition-colors hover:bg-destructive hover:text-paper"
        >
          Delete organization
        </button>
      </section>
    </div>
  );
}
