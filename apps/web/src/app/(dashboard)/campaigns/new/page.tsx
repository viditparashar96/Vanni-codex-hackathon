"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Upload } from "lucide-react";
import { mockAgents, mockNumbers } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = ["Agent & number", "Contacts", "Schedule & retries"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [concurrency, setConcurrency] = React.useState([6]);
  const [uploaded, setUploaded] = React.useState(false);

  const launch = () => {
    toast.success("Campaign created (draft)", {
      description: "Review the summary, then hit Start when you're ready.",
    });
    router.push("/campaigns");
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center gap-4 pt-6 pb-8">
        <Link
          href="/campaigns"
          className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-x-0.5"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="eyebrow text-muted-foreground">New campaign</div>
          <h1 className="display mt-1 text-[26px] text-ink">{STEPS[step]}</h1>
        </div>
      </div>

      {/* stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 rounded-full border-[1.5px] px-4 py-1.5 font-display text-[10px] font-extrabold tracking-[0.1em] uppercase transition-all ${
                i === step
                  ? "border-ink bg-ink text-paper"
                  : i < step
                    ? "border-ink bg-lime text-forest"
                    : "border-border bg-paper text-muted-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <div className="rounded-3xl border-[1.5px] border-ink bg-paper p-7 shadow-[5px_5px_0_var(--ink)]">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <div className="eyebrow mb-2 text-[10px] text-ink">Agent</div>
              <Select defaultValue="agt_reminder">
                <SelectTrigger className="h-12 w-full rounded-xl border-[1.5px] border-input text-[14px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockAgents.filter((a) => a.status === "active").map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="eyebrow mb-2 text-[10px] text-ink">Caller number</div>
              <Select defaultValue="num_2">
                <SelectTrigger className="h-12 w-full rounded-xl border-[1.5px] border-input text-[14px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockNumbers.filter((n) => n.status === "active").map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.e164} · {n.provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="eyebrow mb-2 text-[10px] text-ink">Campaign name</div>
              <Input placeholder="e.g. August recall — dental" className="h-12 rounded-xl border-[1.5px] border-input text-[14px]" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <button
              type="button"
              onClick={() => {
                setUploaded(true);
                toast.success("contacts.csv parsed", { description: "1,840 rows · phone + 4 variable columns mapped." });
              }}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed px-6 py-14 transition-colors ${
                uploaded ? "border-forest bg-lime/15" : "border-ink/35 hover:border-ink hover:bg-cream/60"
              }`}
            >
              {uploaded ? (
                <>
                  <FileSpreadsheet className="size-8 text-forest" />
                  <div className="font-display text-[15px] font-bold text-forest">contacts.csv — 1,840 contacts ready</div>
                  <div className="text-[12px] text-muted-foreground">
                    phone → dial · patient_name, provider, appt_date, clinic → {"{{variables}}"}
                  </div>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <div className="font-display text-[15px] font-bold text-ink">Drop a CSV or click to upload</div>
                  <div className="text-[12px] text-muted-foreground">
                    One phone column required — every other column becomes an agent variable
                  </div>
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="eyebrow mb-2 text-[10px] text-ink">Calling window</div>
                <Select defaultValue="business">
                  <SelectTrigger className="h-12 w-full rounded-xl border-[1.5px] border-input text-[14px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Mon–Fri · 9:00–17:00</SelectItem>
                    <SelectItem value="extended">Mon–Sat · 9:00–18:00</SelectItem>
                    <SelectItem value="any">Any time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="eyebrow mb-2 text-[10px] text-ink">Timezone</div>
                <Select defaultValue="pt">
                  <SelectTrigger className="h-12 w-full rounded-xl border-[1.5px] border-input text-[14px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">America/Los_Angeles</SelectItem>
                    <SelectItem value="et">America/New_York</SelectItem>
                    <SelectItem value="ist">Asia/Kolkata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="eyebrow mb-2 flex items-center justify-between text-[10px] text-ink">
                Concurrency <span className="figure text-[14px]">{concurrency[0]} lines</span>
              </div>
              <Slider value={concurrency} onValueChange={setConcurrency} min={1} max={20} step={1} />
            </div>
            <div>
              <div className="eyebrow mb-2 text-[10px] text-ink">Retry policy</div>
              <Select defaultValue="2x">
                <SelectTrigger className="h-12 w-full rounded-xl border-[1.5px] border-input text-[14px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No retries</SelectItem>
                  <SelectItem value="2x">2 attempts · 2h backoff · on no-answer/busy</SelectItem>
                  <SelectItem value="3x">3 attempts · 4h backoff · incl. voicemail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`text-[12.5px] font-semibold text-muted-foreground hover:text-ink ${step === 0 ? "invisible" : ""}`}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => (step < 2 ? setStep(step + 1) : launch())}
            className="group flex h-11 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            {step < 2 ? "Continue" : "Create campaign"}
            <span className="flex size-5.5 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3 stroke-[3]" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
