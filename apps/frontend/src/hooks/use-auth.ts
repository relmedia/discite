"use client";

import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { clearAuthSession, syncAuthSession } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalUserId: string;
  originalUserEmail: string;
  originalToken: string;
  impersonatedUser?: User;
  impersonationToken?: string;
}

const IMPERSONATION_KEY = "impersonation-state";

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const initializedRef = useRef(false);
  
  // Load impersonation state from localStorage on mount and restore token
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          const parsedState = JSON.parse(stored) as ImpersonationState;
          setImpersonation(parsedState);
          // Restore the impersonation token for API calls
          if (parsedState.impersonationToken && parsedState.impersonatedUser) {
            syncAuthSession(parsedState.impersonationToken, parsedState.impersonatedUser.tenantId);
          }
        } catch (e) {
          localStorage.removeItem(IMPERSONATION_KEY);
        }
      }
    }
  }, []);
  
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  
  // Memoize user to prevent object reference changes
  const user: User | null = useMemo(() => {
    if (impersonation?.isImpersonating && impersonation.impersonatedUser) {
      return impersonation.impersonatedUser;
    }
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.name || "",
        role: session.user.role || "user",
        tenantId: session.user.tenantId || "",
      };
    }
    return null;
  }, [
    impersonation?.isImpersonating,
    impersonation?.impersonatedUser,
    session?.user?.id,
    session?.user?.email,
    session?.user?.name,
    session?.user?.role,
    session?.user?.tenantId,
  ]);
  
  // Memoize tenant to prevent object reference changes
  const tenant: Tenant | null = useMemo(() => {
    if (session?.user?.tenantId) {
      return {
        id: session.user.tenantId,
        name: session.user.tenantName || "",
        subdomain: "",
        isActive: true,
      };
    }
    return null;
  }, [session?.user?.tenantId, session?.user?.tenantName]);

  const logout = async () => {
    try {
      // Clear impersonation state first
      if (typeof window !== "undefined") {
        localStorage.removeItem(IMPERSONATION_KEY);
      }
      setImpersonation(null);

      // Sign out from Auth.js
      await nextAuthSignOut({ redirect: false });
      
      // Clear auth session data for API client
      clearAuthSession();
      
      // Clear any legacy storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        localStorage.removeItem("tenant-id");
        localStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("tenant-id");
        sessionStorage.removeItem("token");
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }

      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  const updateTenant = async (tenantId: string, tenantName: string) => {
    await update({ tenantId, tenantName });
  };

  // Get backend token for API calls
  const getBackendToken = (): string | null => {
    return session?.backendToken || null;
  };

  // Store backend token in a ref to avoid dependency issues
  const backendTokenRef = useRef(session?.backendToken);
  backendTokenRef.current = session?.backendToken;

  // Switch to another user (impersonate)
  const switchToUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    try {
      // Store the current token before switching
      const currentToken = backendTokenRef.current || null;
      
      const response = await authApi.impersonateUser(targetUserId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to switch user");
      }

      const { user: impersonatedUser, token, impersonation: impersonationInfo } = response.data;

      // Store the new token for API calls
      if (token) {
        syncAuthSession(token, impersonatedUser.tenantId);
      }

      // Store impersonation state (including tokens for restoration)
      const impersonationState: ImpersonationState = {
        isImpersonating: true,
        originalUserId: impersonationInfo?.originalUserId || "",
        originalUserEmail: impersonationInfo?.originalUserEmail || "",
        originalToken: currentToken || "",
        impersonatedUser: {
          id: impersonatedUser.id,
          email: impersonatedUser.email,
          name: impersonatedUser.name,
          role: impersonatedUser.role,
          tenantId: impersonatedUser.tenantId,
        },
        impersonationToken: token || "",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationState));
      }
      
      setImpersonation(impersonationState);
      
      // Force a full page reload to reset all state
      window.location.href = "/dashboard";
      
      return true;
    } catch (error) {
      console.error("Switch user error:", error);
      return false;
    }
  }, []);

  // Stop impersonation and return to original user
  const stopImpersonation = useCallback(async (): Promise<boolean> => {
    if (!impersonation?.originalUserId) {
      return false;
    }

    try {
      // Restore original token first (so the API call uses the original user's credentials)
      if (impersonation.originalToken) {
        syncAuthSession(impersonation.originalToken, null);
      }

      const response = await authApi.stopImpersonation(impersonation.originalUserId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to return to original user");
      }

      const { token } = response.data;

      // Sync with the fresh token from the server
      if (token) {
        syncAuthSession(token, response.data.user.tenantId);
      }

      // Clear impersonation state
      if (typeof window !== "undefined") {
        localStorage.removeItem(IMPERSONATION_KEY);
      }
      
      setImpersonation(null);
      
      // Refresh the page
      router.refresh();
      
      return true;
    } catch (error) {
      console.error("Stop impersonation error:", error);
      // Try to restore original state anyway if the API call fails
      if (impersonation.originalToken && typeof window !== "undefined") {
        syncAuthSession(impersonation.originalToken, null);
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
        router.refresh();
      }
      return false;
    }
  }, [impersonation, router]);

  return {
    user,
    tenant,
    session,
    isLoading,
    logout,
    isAuthenticated,
    updateTenant,
    getBackendToken,
    provider: session?.provider,
    // Impersonation
    isImpersonating: impersonation?.isImpersonating || false,
    impersonation,
    switchToUser,
    stopImpersonation,
  };
}
