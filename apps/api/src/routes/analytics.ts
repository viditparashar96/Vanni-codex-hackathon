/**
 * Analytics — mounted at /api/orgs/:orgId/analytics. Aggregates from vaani.calls.
 *   GET /summary   → AnalyticsSummary contract (KPIs, sentiment, trend, perAgent, topTags)
 *   GET /overview  → raw daily series + per-agent breakdown (internal/debug)
 */

import { Router, type Request, type Response } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { calls, agents } from "../db/schema/index.js";
import { requireOrg } from "../middleware/auth.js";

const router: Router = Router({ mergeParams: true });
router.use(requireOrg);

function orgOf(req: Request): string {
  return req.orgId!;
}

// Optional ?days=N window (default 30, contract trend covers 30 days).
function sinceDate(req: Request): Date {
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 1), 365);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ── AnalyticsSummary contract ────────────────────────────────────────────────
router.get("/summary", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const since = sinceDate(req);
  const scope = and(eq(calls.orgId, orgId), gte(calls.createdAt, since));

  // Headline KPIs + sentiment counts in a single scan.
  const [totals] = await db
    .select({
      totalCalls: sql<number>`count(*)::int`,
      completedCalls: sql<number>`count(*) filter (where ${calls.status} = 'completed')::int`,
      totalDurationSecs: sql<number>`coalesce(sum(${calls.durationSecs}), 0)::float`,
      avgDurationSecs: sql<number>`coalesce(avg(${calls.durationSecs}), 0)::float`,
      totalCost: sql<number>`coalesce(sum(${calls.totalCost}), 0)::float`,
      avgQaScore: sql<number>`coalesce(avg(${calls.callQualityScore}), 0)::float`,
      positive: sql<number>`count(*) filter (where ${calls.sentiment} = 'positive')::int`,
      negative: sql<number>`count(*) filter (where ${calls.sentiment} = 'negative')::int`,
    })
    .from(calls)
    .where(scope);

  const totalCalls = totals?.totalCalls ?? 0;
  const completedCalls = totals?.completedCalls ?? 0;
  const positive = totals?.positive ?? 0;
  const negative = totals?.negative ?? 0;
  // Everything not explicitly positive/negative (incl. null) counts as neutral.
  const neutral = Math.max(totalCalls - positive - negative, 0);

  // Per-day trend across the window.
  const trendRows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${calls.createdAt}), 'YYYY-MM-DD')`,
      calls: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${calls.durationSecs}), 0)::float / 60`,
      cost: sql<number>`coalesce(sum(${calls.totalCost}), 0)::float`,
      qaScore: sql<number>`coalesce(avg(${calls.callQualityScore}), 0)::float`,
      completed: sql<number>`count(*) filter (where ${calls.status} = 'completed')::int`,
    })
    .from(calls)
    .where(scope)
    .groupBy(sql`date_trunc('day', ${calls.createdAt})`)
    .orderBy(sql`date_trunc('day', ${calls.createdAt})`);

  const trend = trendRows.map((r) => ({
    date: r.date,
    calls: r.calls,
    minutes: r.minutes,
    cost: r.cost,
    qaScore: r.qaScore,
    successRate: r.calls > 0 ? r.completed / r.calls : 0,
  }));

  // Per-agent breakdown joined to agent names.
  const agentRows = await db
    .select({
      agentId: calls.agentId,
      name: agents.name,
      calls: sql<number>`count(*)::int`,
      avgQa: sql<number>`coalesce(avg(${calls.callQualityScore}), 0)::float`,
      cost: sql<number>`coalesce(sum(${calls.totalCost}), 0)::float`,
      completed: sql<number>`count(*) filter (where ${calls.status} = 'completed')::int`,
    })
    .from(calls)
    .leftJoin(agents, eq(agents.id, calls.agentId))
    .where(scope)
    .groupBy(calls.agentId, agents.name);

  const perAgent = agentRows.map((r) => ({
    agentId: r.agentId,
    name: r.name ?? "",
    calls: r.calls,
    avgQa: r.avgQa,
    cost: r.cost,
    successRate: r.calls > 0 ? r.completed / r.calls : 0,
  }));

  // Top tags — best-effort extraction from calls.qa.tags (strings or {tag}).
  const qaRows = await db.select({ qa: calls.qa }).from(calls).where(scope);

  const tagCounts = new Map<string, number>();
  for (const row of qaRows) {
    const qa = row.qa as Record<string, unknown> | null;
    const rawTags =
      qa && Array.isArray((qa as { tags?: unknown }).tags)
        ? ((qa as { tags?: unknown }).tags as unknown[])
        : [];
    for (const t of rawTags) {
      const tag =
        typeof t === "string"
          ? t
          : t && typeof t === "object" && typeof (t as { tag?: unknown }).tag === "string"
            ? (t as { tag: string }).tag
            : null;
      if (!tag) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({
    totalCalls,
    totalMinutes: (totals?.totalDurationSecs ?? 0) / 60,
    successRate: totalCalls > 0 ? completedCalls / totalCalls : 0,
    avgDurationSecs: totals?.avgDurationSecs ?? 0,
    totalCost: totals?.totalCost ?? 0,
    avgQaScore: totals?.avgQaScore ?? 0,
    sentiment: { positive, neutral, negative },
    trend,
    perAgent,
    topTags,
  });
});

// ── Raw daily series + per-agent breakdown ────────────────────────────────────
router.get("/overview", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const since = sinceDate(req);
  const scope = and(eq(calls.orgId, orgId), gte(calls.createdAt, since));

  const daily = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${calls.createdAt}), 'YYYY-MM-DD')`,
      calls: sql<number>`count(*)::int`,
      avgDurationSecs: sql<number>`coalesce(avg(${calls.durationSecs}), 0)::float`,
      cost: sql<number>`coalesce(sum(${calls.totalCost}), 0)::float`,
    })
    .from(calls)
    .where(scope)
    .groupBy(sql`date_trunc('day', ${calls.createdAt})`)
    .orderBy(sql`date_trunc('day', ${calls.createdAt})`);

  const byAgent = await db
    .select({
      agentId: calls.agentId,
      name: agents.name,
      calls: sql<number>`count(*)::int`,
      avgQualityScore: sql<number>`coalesce(avg(${calls.callQualityScore}), 0)::float`,
    })
    .from(calls)
    .leftJoin(agents, eq(agents.id, calls.agentId))
    .where(scope)
    .groupBy(calls.agentId, agents.name);

  res.json({ daily, byAgent });
});

export default router;
