"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { syncAuthSession, clearAuthSession } from "@/lib/api/client";

/**
 * Component that syncs Auth.js session data with the API client.
 * This ensures the API client has access to the backend token and tenant ID.
 */
export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      // Sync session data to storage for API client
      syncAuthSession(
        session.backendToken || null,
        session.user?.tenantId || null
      );
    } else if (status === "unauthenticated") {
      // Clear session data when logged out
      clearAuthSession();
    }
  }, [session, status]);

  return <>{children}</>;
}

