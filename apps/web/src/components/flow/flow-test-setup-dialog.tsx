"use client";

import * as React from "react";
import { Globe, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CustomVariable } from "@/lib/flow-contract";

export interface FlowTestStartOptions {
  /** Values entered for the flow's custom variables, keyed by name. */
  customVariables: Record<string, string>;
}

interface FlowTestSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Variables defined on the flow plus any auto-detected `{{name}}` refs. */
  customVariables: CustomVariable[];
  onStart: (options: FlowTestStartOptions) => void;
}

/**
 * Pre-flight for an in-editor test. The call runs in the browser over WebRTC to
 * the voice engine (mic in, agent audio out) — so there's no phone number to
 * enter. If the flow references custom variables, they're collected here so the
 * run can seed them.
 */
export function FlowTestSetupDialog({
  open,
  onOpenChange,
  customVariables,
  onStart,
}: FlowTestSetupDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});

  function handleStart() {
    onStart({ customVariables: values });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b-[1.5px] border-ink/10 px-6 pt-6 pb-4">
          <DialogTitle className="display text-[18px] text-ink">Test this flow</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-input bg-cream/50 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper">
              <Globe className="size-4 text-forest" />
            </span>
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Browser call</div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Your microphone streams to the agent and its voice plays back
                through your speakers. Grant mic access when prompted.
              </p>
            </div>
          </div>

          {customVariables.length > 0 && (
            <div className="space-y-3 border-t-[1.5px] border-dashed border-ink/15 pt-4">
              <p className="eyebrow text-[9.5px] text-ink">Custom variables</p>
              {customVariables.map((v) => (
                <div key={v.name} className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-ink">
                    {v.name.replace(/_/g, " ")}
                    {v.defaultValue && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (default: {v.defaultValue})
                      </span>
                    )}
                  </label>
                  <Input
                    value={values[v.name] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                    placeholder={
                      v.defaultValue
                        ? `Default: ${v.defaultValue}`
                        : `Enter ${v.name.replace(/_/g, " ")}`
                    }
                    className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
                  />
                  {v.description && (
                    <p className="text-[10.5px] leading-snug text-muted-foreground">{v.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t-[1.5px] border-ink/10 px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 items-center rounded-full border-[1.5px] border-border bg-paper px-5 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex h-10 items-center gap-2 rounded-full bg-ink px-6 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <Phone className="size-3.5" />
            Start test call
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
