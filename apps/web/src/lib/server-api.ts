import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server-only data access for Vaani.
 *
 * Server Components can't rely on the browser to attach the auth cookie, so
 * every request here forwards the incoming request's cookies to the backend
 * via `next/headers`. The caller's active organization is resolved once per
 * request (React `cache`) by reading the first org from Better Auth's
 * `organization/list`, then reused for all org-scoped reads.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Error carrying the HTTP status so callers can special-case 404, etc. */
export class OrgApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "OrgApiError";
    this.status = status;
  }
}

/**
 * Forward the browser's RAW `cookie` header to the backend verbatim.
 * Re-serializing via the cookie store URL-encodes values and breaks Better
 * Auth's signed session token, so we pass the original header through unchanged.
 */
async function forwardedCookieHeader(): Promise<string> {
  const h = await headers();
  return h.get("cookie") ?? "";
}

interface OrgSummary {
  id: string;
  name?: string;
  slug?: string;
}

export interface SessionSummary {
  user: { name: string; email: string; initials: string } | null;
  org: { id: string; name: string; plan: string } | null;
  credits: { balance: number; burnLast7d: number } | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Everything the dashboard chrome (sidebar + topbar) needs about the current
 * session: the signed-in user, their active org, and the org's credit balance.
 * Resolved once per request. Returns nulls (not throws) so the shell degrades
 * gracefully rather than crashing the whole layout.
 */
export const getSessionSummary = cache(async (): Promise<SessionSummary> => {
  const cookie = await forwardedCookieHeader();
  const empty: SessionSummary = { user: null, org: null, credits: null };

  try {
    const [sessionRes, orgRes] = await Promise.all([
      fetch(`${API_URL}/api/auth/get-session`, { headers: { Cookie: cookie }, cache: "no-store" }),
      fetch(`${API_URL}/api/auth/organization/list`, { headers: { Cookie: cookie }, cache: "no-store" }),
    ]);
    if (sessionRes.status === 401) redirect("/login");

    const session = (await sessionRes.json().catch(() => null)) as
      | { user?: { name?: string; email?: string } }
      | null;
    const orgs = (await orgRes.json().catch(() => null)) as OrgSummary[] | null;
    const org = Array.isArray(orgs) && orgs[0] ? orgs[0] : null;

    let credits: SessionSummary["credits"] = null;
    if (org?.id) {
      const cRes = await fetch(`${API_URL}/api/orgs/${org.id}/credits`, {
        headers: { Cookie: cookie },
        cache: "no-store",
      });
      if (cRes.ok) credits = await cRes.json().catch(() => null);
    }

    const name = session?.user?.name ?? "";
    const email = session?.user?.email ?? "";
    return {
      user: session?.user ? { name, email, initials: initialsOf(name || email) } : null,
      org: org ? { id: org.id, name: org.name ?? "Workspace", plan: "Free" } : null,
      credits,
    };
  } catch {
    return empty;
  }
});

/**
 * Resolve the caller's active organization id.
 *
 * Signup auto-creates a personal org, so `organization/list` always returns at
 * least one entry; we take the first. Memoized per request via React `cache`
 * so a page rendering several org-scoped reads only lists orgs once.
 */
export const getActiveOrgId = cache(async (): Promise<string> => {
  const res = await fetch(`${API_URL}/api/auth/organization/list`, {
    headers: { Cookie: await forwardedCookieHeader() },
    cache: "no-store",
  });

  // Not authenticated → send them to sign in instead of erroring the page.
  if (res.status === 401) {
    redirect("/login");
  }
  if (!res.ok) {
    throw new OrgApiError(
      res.status,
      `Failed to resolve active organization (${res.status})`,
    );
  }

  const orgs = (await res.json().catch(() => null)) as OrgSummary[] | null;
  const first = Array.isArray(orgs) ? orgs[0] : null;
  if (!first?.id) {
    throw new OrgApiError(404, "No organization found for the current session");
  }
  return first.id;
});

/**
 * GET an org-scoped path (relative to `/api/orgs/{orgId}`) and return the
 * parsed JSON body. Forwards the auth cookie. Throws {@link OrgApiError} on any
 * non-2xx response.
 */
export async function orgGet<T>(path: string): Promise<T> {
  const [orgId, cookieHeader] = await Promise.all([
    getActiveOrgId(),
    forwardedCookieHeader(),
  ]);

  const res = await fetch(`${API_URL}/api/orgs/${orgId}${path}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new OrgApiError(res.status, `GET ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}
