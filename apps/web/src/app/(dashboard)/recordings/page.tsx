import { AudioLines, Play, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo, fmtDuration } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";

export default async function RecordingsPage() {
  const recordings = await api.getRecordings();

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        eyebrow={`${recordings.length} clips`}
        title="Recordings"
        description="Real studio audio your agents play instead of TTS — reference any clip as @slug inside greetings, goodbyes and voicemail drops."
        actions={
          <button
            type="button"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <Upload className="size-4" />
            Upload audio
          </button>
        }
      />

      <div className="rise-in rise-in-1 space-y-3">
        {recordings.map((r) => (
          <div
            key={r.id}
            className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-[1.5px] border-border bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[4px_4px_0_var(--ink)]"
          >
            <button
              type="button"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime text-forest transition-transform hover:scale-105"
              aria-label={`Play ${r.name}`}
            >
              <Play className="ml-0.5 size-4.5" />
            </button>
            <div className="min-w-0 flex-1 basis-52">
              <div className="font-display text-[14.5px] font-bold text-ink">{r.name}</div>
              <div className="mt-0.5 font-mono text-[12px] text-forest">@{r.slug}</div>
            </div>
            {/* waveform sketch */}
            <div className="hidden h-8 flex-1 basis-40 items-end gap-[3px] md:flex" aria-hidden>
              {Array.from({ length: 36 }, (_, i) => (
                <span
                  key={i}
                  className="w-full rounded-full bg-sand transition-colors group-hover:bg-lime"
                  style={{ height: `${18 + Math.abs(Math.sin(i * 2.3 + r.name.length)) * 82}%` }}
                />
              ))}
            </div>
            <div className="w-16 text-right text-[12px] text-muted-foreground">{fmtDuration(r.durationSecs)}</div>
            <div className="hidden w-40 text-right text-[11.5px] text-muted-foreground sm:block">
              {r.usedIn.length > 0 ? `Used in ${r.usedIn.join(", ")}` : "Not referenced yet"}
            </div>
            <div className="hidden w-20 text-right text-[11px] text-muted-foreground lg:block">{fmtAgo(r.createdAt)}</div>
          </div>
        ))}
      </div>

      <div className="rise-in rise-in-2 mt-8 flex items-start gap-3 rounded-2xl bg-brand-yellow/20 p-5">
        <AudioLines className="mt-0.5 size-4 shrink-0 text-[#8a6d0e]" />
        <p className="text-[12.5px] leading-relaxed text-[#8a6d0e]">
          Try it: set a greeting to <span className="font-mono font-semibold">@clinic-greeting Hello {"{{patient_name}}"}!</span> —
          the pipeline plays the studio clip, then synthesizes the rest.
        </p>
      </div>
    </div>
  );
}
