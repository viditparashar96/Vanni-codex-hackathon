"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  ChartNoAxesColumn,
  House,
  Megaphone,
  PhoneCall,
  Settings,
  Sparkles,
  Wallet,
  Waypoints,
  Wrench,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { mockAgents, mockCampaigns } from "@/lib/mock-data";

const PAGES = [
  { href: "/", label: "Overview", icon: House },
  { href: "/agents", label: "Agents", icon: Waypoints },
  { href: "/composer", label: "Composer", icon: Sparkles },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/recordings", label: "Recordings", icon: AudioLines },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/history", label: "Call History", icon: PhoneCall },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { href: "/billing", label: "Billing", icon: Wallet },
  { href: "/settings/general", label: "Settings", icon: Settings },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search across your workspace">
      <CommandInput placeholder="Search agents, calls, campaigns…" />
      <CommandList>
        <CommandEmpty>Nothing matches — try a different term.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.href} onSelect={() => go(p.href)}>
              <p.icon className="size-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Agents">
          {mockAgents
            .filter((a) => a.status !== "archived")
            .map((a) => (
              <CommandItem key={a.id} onSelect={() => go(`/agents/${a.id}`)}>
                <Waypoints className="size-4" />
                {a.name}
                <span className="ml-auto text-[10px] tracking-wide text-muted-foreground uppercase">
                  {a.type}
                </span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Campaigns">
          {mockCampaigns.slice(0, 3).map((c) => (
            <CommandItem key={c.id} onSelect={() => go(`/campaigns/${c.id}`)}>
              <Megaphone className="size-4" />
              {c.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
