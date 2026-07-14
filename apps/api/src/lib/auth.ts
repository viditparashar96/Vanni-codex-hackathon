import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../db/index.js";
import { initializeOrgCredits } from "./credits.js";

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
