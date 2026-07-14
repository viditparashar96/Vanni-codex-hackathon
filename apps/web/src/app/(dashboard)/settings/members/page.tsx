import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDay } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";

const ROLE_LABEL: Record<string, string> = {
  owner: "Org Owner",
  admin: "Org Admin",
  agent_builder: "Agent Builder",
  viewer: "Viewer",
};

export default async function MembersPage() {
  const members = await api.getMembers();

  return (
    <div className="space-y-6">
      <div className="rise-in flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {members.filter((m) => m.status === "active").length} active members ·{" "}
          {members.filter((m) => m.status === "invited").length} pending invitation
        </p>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
        >
          <UserPlus className="size-4" />
          Invite member
        </button>
      </div>

      <div className="rise-in rise-in-1 overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
        {members.map((m, i) => (
          <div key={m.id} className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 ${i > 0 ? "border-t border-border/70" : ""}`}>
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink font-display text-[13px] font-black ${
                i % 3 === 0 ? "bg-lime text-forest" : i % 3 === 1 ? "bg-brand-yellow text-ink" : "bg-brand-orange text-paper"
              }`}
            >
              {m.name.split(" ").map((p) => p[0]).join("")}
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <div className="text-[14px] font-semibold text-ink">{m.name}</div>
              <div className="text-[12px] text-muted-foreground">{m.email}</div>
            </div>
            <span className="sticker text-[8.5px]">{ROLE_LABEL[m.role]}</span>
            <StatusChip status={m.status} />
            <span className="hidden w-28 text-right text-[11.5px] text-muted-foreground md:inline">
              since {fmtDay(m.joinedAt)}
            </span>
          </div>
        ))}
      </div>

      <div className="rise-in rise-in-2 rounded-2xl bg-cream p-5 text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-ink">Roles.</strong> Owner manages billing and can delete the org · Admin manages
        everything else · Agent Builder creates and tests agents, tools and campaigns · Viewer is read-only across
        calls, analytics and recordings.
      </div>
    </div>
  );
}
