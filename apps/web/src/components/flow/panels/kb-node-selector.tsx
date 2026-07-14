"use client";

import { BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { KnowledgeBase } from "@/types";
import type { KnowledgeBaseBinding } from "@/lib/flow-contract";
import { FieldLabel } from "@/components/flow/flow-fields";

const NONE = "__none__";

interface NodeKbSelectorProps {
  knowledgeBases: KnowledgeBase[];
  binding: KnowledgeBaseBinding | undefined;
  onChange: (binding: KnowledgeBaseBinding | undefined) => void;
}

/** Per-node knowledge-base override: bind one KB (or fall back to global). */
export function NodeKbSelector({ knowledgeBases, binding, onChange }: NodeKbSelectorProps) {
  if (knowledgeBases.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No knowledge bases in this workspace yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel className="flex items-center gap-1.5">
          <BookOpen className="size-3" />
          Bound knowledge base
        </FieldLabel>
        <Select
          value={binding?.knowledgeBaseId ?? NONE}
          onValueChange={(v) =>
            onChange(
              v === NONE
                ? undefined
                : {
                    knowledgeBaseId: v,
                    chunksToRetrieve: binding?.chunksToRetrieve ?? 3,
                    similarityThreshold: binding?.similarityThreshold ?? 0.5,
                  },
            )
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue placeholder="Use global default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Use global default</SelectItem>
            {knowledgeBases.map((kb) => (
              <SelectItem key={kb.id} value={kb.id}>
                {kb.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-[10.5px] text-muted-foreground">
          Overrides the global knowledge base for this node only.
        </p>
      </div>

      {binding && (
        <div className="space-y-3 rounded-lg border-[1.5px] border-input bg-cream/40 px-3 py-2.5">
          <RetrievalSliders binding={binding} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/** Chunks-to-retrieve + similarity-threshold sliders shared with the global KB panel. */
export function RetrievalSliders({
  binding,
  onChange,
}: {
  binding: KnowledgeBaseBinding;
  onChange: (binding: KnowledgeBaseBinding) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel className="mb-0">Chunks to retrieve</FieldLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {binding.chunksToRetrieve ?? 3}
          </span>
        </div>
        <Slider
          value={[binding.chunksToRetrieve ?? 3]}
          onValueChange={([v]) => onChange({ ...binding, chunksToRetrieve: v })}
          min={1}
          max={10}
          step={1}
          className="py-1"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel className="mb-0">Similarity threshold</FieldLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {(binding.similarityThreshold ?? 0.5).toFixed(2)}
          </span>
        </div>
        <Slider
          value={[binding.similarityThreshold ?? 0.5]}
          onValueChange={([v]) =>
            onChange({ ...binding, similarityThreshold: parseFloat(v.toFixed(2)) })
          }
          min={0.2}
          max={0.95}
          step={0.05}
          className="py-1"
        />
      </div>
    </>
  );
}
