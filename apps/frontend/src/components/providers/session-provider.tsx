"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { AuthSyncProvider } from "./auth-sync-provider";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <AuthSyncProvider>
        {children}
      </AuthSyncProvider>
    </NextAuthSessionProvider>
  );
}

