import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { organization as organizationTable, member as memberTable } from "../db/schema/index.js";
import { initializeOrgCredits } from "./credits.js";

/** Slugify a name into a URL-safe base, suffixed with short randomness for uniqueness. */
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "workspace"}-${suffix}`;
}

/**
 * Better Auth: email/password + the organization plugin (orgs, members, roles,
 * invitations). Multi-tenancy pivots on the active organization stored on the
 * session; every org-scoped query filters by it (never a body-supplied orgId).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  basePath: "/api/auth",

  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-minute cache to reduce DB lookups
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
    },
  },

  databaseHooks: {
    user: {
      create: {
        // A fresh signup needs an org to operate in. Provision a personal
        // workspace + owner membership so the very next request has an active org.
        after: async (user: { id: string; name?: string | null }) => {
          try {
            const orgId = crypto.randomUUID();
            const name = `${user.name || "My"} Workspace`;
            await db.insert(organizationTable).values({
              id: orgId,
              name,
              slug: makeSlug(user.name || "workspace"),
            });
            await db.insert(memberTable).values({
              id: crypto.randomUUID(),
              userId: user.id,
              organizationId: orgId,
              role: "owner",
            });
            await initializeOrgCredits(orgId).catch((err: unknown) =>
              console.error("[auth] credit init failed for org", orgId, err)
            );
          } catch (err: unknown) {
            console.error("[auth] personal org provisioning failed for user", user.id, err);
          }
        },
      },
    },
    session: {
      create: {
        // Bind the session to the user's first membership so org-scoped queries
        // resolve an active organization without a separate selection step.
        before: async (session: Record<string, unknown> & { userId: string }) => {
          const [firstMember] = await db
            .select()
            .from(memberTable)
            .where(eq(memberTable.userId, session.userId))
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: firstMember?.organizationId ?? null,
            },
          };
        },
      },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationCreation: {
        afterCreate: async ({ organization: org }: { organization: { id: string } }) => {
          await initializeOrgCredits(org.id).catch((err: unknown) =>
            console.error("[auth] credit init failed for org", org.id, err)
          );
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
