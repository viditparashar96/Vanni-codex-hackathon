"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Plus, ShieldOff } from "lucide-react";
import type { ApiKey } from "@/types";
import { api as apiClient } from "@/lib/api-client";
import { fmtAgo, fmtDay } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApiKeysManager({ keys }: { keys: ApiKey[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [mintedKey, setMintedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await apiClient.createApiKey(name.trim());
      setMintedKey(created.key);
      setName("");
      router.refresh();
    } catch (err) {
      toast.error("Could not create key", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (key: ApiKey) => {
    try {
      await apiClient.revokeApiKey(key.id);
      toast.success(`Revoked "${key.name}"`, { description: "Requests with this key stop working immediately." });
      router.refresh();
    } catch (err) {
      toast.error("Could not revoke key", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const copyKey = () => {
    if (!mintedKey) return;
    navigator.clipboard.writeText(mintedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const closeCreate = (open: boolean) => {
    setCreateOpen(open);
    if (!open) setMintedKey(null);
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="eyebrow text-ink">API keys</h2>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
        >
          <Plus className="size-3.5" />
          Create key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-ink/30 bg-paper/60 px-6 py-10 text-center">
          <KeyRound className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-[13.5px] font-semibold text-ink">No keys yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[12px] leading-relaxed text-muted-foreground">
            Create one to use the public API or connect an MCP client — the same key powers{" "}
            <span className="font-mono">npx vaani-mcp</span>.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
          {keys.map((k, i) => (
            <div
              key={k.id}
              className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 ${i > 0 ? "border-t border-border/70" : ""} ${k.revokedAt ? "opacity-50" : ""}`}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-sand">
                <KeyRound className="size-4 text-ink" />
              </span>
              <div className="min-w-0 flex-1 basis-44">
                <div className="text-[13.5px] font-semibold text-ink">{k.name}</div>
                <div className="font-mono text-[11.5px] text-muted-foreground">{k.prefix}•••••••••••••</div>
              </div>
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {k.scopes.map((s) => (
                  <span key={s} className="rounded-md bg-cream px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
              <div className="w-36 text-right text-[11px] text-muted-foreground">
                {k.lastUsedAt ? `used ${fmtAgo(k.lastUsedAt)}` : "never used"}
                <br />
                created {fmtDay(k.createdAt)}
              </div>
              {k.revokedAt ? (
                <span className="eyebrow text-[9px] text-destructive">Revoked</span>
              ) : (
                <button
                  type="button"
                  onClick={() => revoke(k)}
                  className="flex items-center gap-1.5 rounded-full border-[1.5px] border-border px-3.5 py-1.5 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-destructive hover:text-destructive"
                >
                  <ShieldOff className="size-3" />
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Keys are hashed at rest and shown once at creation. They authenticate the public API and the MCP
        endpoint — each key is bound to this workspace.
      </p>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={closeCreate}>
        <DialogContent className="rounded-3xl border-[1.5px] border-ink bg-paper sm:max-w-[480px]">
          {mintedKey === null ? (
            <>
              <DialogHeader>
                <DialogTitle className="display text-[20px]">New API key</DialogTitle>
                <DialogDescription>
                  Name it after where it will live — you&apos;ll recognize it in the usage log later.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="e.g. Claude Desktop — Soumya"
                autoFocus
                className="h-12 rounded-xl border-[1.5px] border-input text-[14px]"
              />
              <button
                type="button"
                onClick={create}
                disabled={busy || !name.trim()}
                className="flex h-11 items-center justify-center rounded-full bg-ink font-display text-[11.5px] font-extrabold tracking-[0.12em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create key"}
              </button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="display text-[20px]">Copy it now</DialogTitle>
                <DialogDescription>
                  This is the only time the full key is shown. Treat it like a password.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                onClick={copyKey}
                className="flex items-center gap-3 rounded-xl border-[1.5px] border-ink bg-cream px-4 py-3.5 text-left shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
              >
                <code className="min-w-0 flex-1 font-mono text-[12.5px] break-all text-ink">{mintedKey}</code>
                {copied ? <Check className="size-4 shrink-0 text-forest" /> : <Copy className="size-4 shrink-0 text-muted-foreground" />}
              </button>
              <div className="rounded-xl bg-sand/60 p-3.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                claude mcp add vaani -e VAANI_API_KEY={mintedKey.slice(0, 12)}… -- npx -y vaani-mcp
              </div>
              <button
                type="button"
                onClick={() => closeCreate(false)}
                className="flex h-11 items-center justify-center rounded-full bg-lime font-display text-[11.5px] font-extrabold tracking-[0.12em] text-forest uppercase transition-transform hover:-translate-y-0.5"
              >
                I&apos;ve copied it
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
