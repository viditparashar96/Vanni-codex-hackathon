import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client for Vaani.
 *
 * Points at the Express API (NEXT_PUBLIC_API_URL) so email/password auth,
 * session reads, and the organization plugin all work from the client with
 * cookies. The organization plugin adds `authClient.organization.*` helpers
 * (list / setActive / …) used right after login to pick an active workspace.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  plugins: [organizationClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useActiveOrganization,
  useListOrganizations,
} = authClient;

/**
 * Ensure the signed-in user has an active organization.
 *
 * Signup auto-creates a personal org, so `organization.list()` always returns
 * at least one. We set the first as active when none is selected yet. Failures
 * are swallowed — the app can still resolve an org later — so a transient
 * error here never blocks the redirect into the dashboard.
 */
export async function ensureActiveOrg(): Promise<void> {
  try {
    const orgs = await authClient.organization.list();
    if (orgs.data && orgs.data.length > 0) {
      await authClient.organization.setActive({
        organizationId: orgs.data[0].id,
      });
    }
  } catch (err) {
    console.warn("Could not set an active organization:", err);
  }
}
