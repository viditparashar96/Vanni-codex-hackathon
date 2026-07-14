"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  ChartNoAxesColumn,
  ChevronLeft,
  House,
  Menu,
  Megaphone,
  PhoneCall,
  Settings,
  Sparkles,
  Wallet,
  Waypoints,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ORG, mockCredits } from "@/lib/mock-data";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  soon?: boolean;
};

const NAV: { group: string | null; items: NavItem[] }[] = [
  {
    group: null,
    items: [{ href: "/", label: "Overview", icon: House }],
  },
  {
    group: "Build",
    items: [
      { href: "/agents", label: "Agents", icon: Waypoints },
      { href: "/composer", label: "Composer", icon: Sparkles },
      { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/recordings", label: "Recordings", icon: AudioLines },
    ],
  },
  {
    group: "Operate",
    items: [
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/history", label: "History", icon: PhoneCall, badge: "2 live" },
      { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/billing", label: "Billing", icon: Wallet },
      { href: "/automation", label: "Automation", icon: Zap, soon: true },
      { href: "/settings/general", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const isPhone = useMediaQuery("(max-width: 767px)");

  React.useEffect(() => {
    setCollapsed(window.localStorage.getItem("vaani.sidebar") === "rail");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      window.localStorage.setItem("vaani.sidebar", c ? "open" : "rail");
      return !c;
    });
  };

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href.split("/").slice(0, 2).join("/") + "/");

  if (isPhone) {
    return <MobileSidebar pathname={pathname} isActive={isActive} />;
  }

  return (
    <TooltipProvider delayDuration={80}>
      <aside
        className={cn(
          "group/sidebar sticky top-3 z-40 m-3 mr-0 flex h-[calc(100vh-24px)] shrink-0 flex-col rounded-3xl bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out",
          collapsed ? "w-[76px]" : "w-[256px]",
        )}
      >
        {/* logo */}
        <div className={cn("flex items-center gap-2.5 px-6 pt-6 pb-2", collapsed && "justify-center px-0")}>
          <span className="pulse-dot shrink-0" />
          {!collapsed && (
            <span className="display text-[20px] font-black tracking-tight text-paper">
              Vaani
            </span>
          )}
        </div>

        {/* nav */}
        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 [scrollbar-width:none]">
          {NAV.map(({ group, items }) => (
            <div key={group ?? "root"}>
              {group && !collapsed && (
                <div className="eyebrow px-3 pb-2 text-[10px] text-sidebar-foreground/45">
                  {group}
                </div>
              )}
              {group && collapsed && <div className="mx-4 mb-2 border-t border-sidebar-border" />}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  const link = (
                    <Link
                      href={item.soon ? "/automation" : item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className={cn("size-[17px] shrink-0", active && "stroke-[2.4]")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-orange">
                          <span className="size-1.5 rounded-full bg-brand-orange" />
                          {item.badge}
                        </span>
                      )}
                      {!collapsed && item.soon && (
                        <span className="ml-auto rounded-full border border-sidebar-border px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
                          Soon
                        </span>
                      )}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={10}>
                            {item.label}
                            {item.badge ? ` · ${item.badge}` : ""}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* credits + org */}
        <div className={cn("space-y-3 p-4", collapsed && "p-3")}>
          {!collapsed && (
            <Link
              href="/billing"
              className="block rounded-2xl bg-sidebar-accent/70 p-3.5 transition-colors hover:bg-sidebar-accent"
            >
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-[9.5px] text-sidebar-foreground/50">Credits</span>
                <span className="figure text-[17px] text-sidebar-primary">
                  ${mockCredits.balance.toFixed(2)}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
                <div className="h-full w-[68%] rounded-full bg-sidebar-primary" />
              </div>
              <div className="mt-1.5 text-[10.5px] text-sidebar-foreground/55">
                ${mockCredits.burnLast7d.toFixed(2)} used this week
              </div>
            </Link>
          )}
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary font-display text-[12px] font-black text-sidebar-primary-foreground">
              C
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-paper">{ORG.name}</div>
                <div className="text-[10.5px] text-sidebar-foreground/50">{ORG.plan} plan</div>
              </div>
            )}
          </div>
        </div>

        {/* interactive edge: hover to reveal, click to collapse/expand */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute inset-y-0 -right-2.5 w-5 cursor-pointer outline-none"
        >
          <span className="absolute inset-y-6 right-2 w-[3px] rounded-full bg-transparent transition-colors duration-200 group-hover/sidebar:bg-lime/60" />
          <span
            className={cn(
              "absolute top-1/2 right-0 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime text-forest opacity-0 shadow-[2px_2px_0_var(--ink)] transition-all duration-200 group-hover/sidebar:opacity-100",
              collapsed && "rotate-180",
            )}
          >
            <ChevronLeft className="size-3.5 stroke-[3]" />
          </span>
        </button>
      </aside>
    </TooltipProvider>
  );
}

function MobileSidebar({
  pathname,
  isActive,
}: {
  pathname: string;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed top-6 left-5 z-30 flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime text-forest shadow-[2px_2px_0_var(--ink)]"
          aria-label="Open navigation"
        >
          <Menu className="size-5 stroke-[2.5]" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,320px)] gap-0 border-r-[1.5px] border-ink bg-sidebar p-0 text-sidebar-foreground sm:max-w-none">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-4">
          <span className="pulse-dot shrink-0" />
          <span className="display text-[20px] font-black tracking-tight text-paper">Vaani</span>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {NAV.map(({ group, items }) => (
            <div key={group ?? "root"}>
              {group && <div className="eyebrow px-3 pb-2 text-[10px] text-sidebar-foreground/45">{group}</div>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.soon ? "/automation" : item.href}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                          active
                            ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 active:bg-sidebar-accent",
                        )}
                      >
                        <item.icon className={cn("size-[18px] shrink-0", active && "stroke-[2.4]")} />
                        <span>{item.label}</span>
                        {item.badge && <span className="ml-auto text-[10px] font-bold text-brand-orange">{item.badge}</span>}
                        {item.soon && <span className="ml-auto text-[10px] text-sidebar-foreground/50">Soon</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <Link href="/settings/general" className="flex min-h-11 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary font-display text-[12px] font-black text-sidebar-primary-foreground">C</div>
            <div>
              <div className="text-[12.5px] font-semibold text-paper">{ORG.name}</div>
              <div className="text-[10.5px] text-sidebar-foreground/50">{ORG.plan} plan</div>
            </div>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
