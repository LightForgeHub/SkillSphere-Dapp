"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Thin client component that wraps next-auth's SessionProvider.
 * Kept separate so the root layout stays a Server Component.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
