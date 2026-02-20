"use client"
import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
}

export default function AppLayout({
  children,
  headerSlot,
  footerSlot,
}: AppLayoutProps) {
  const pathname = usePathname() || "/";
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isDashboard && headerSlot && (
        <header className="sticky top-0 z-50">{headerSlot}</header>
      )}

      <main
        className={
          isDashboard
            ? "flex-1 w-full px-0 py-0"
            : "flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
        }
      >
        {children}
      </main>

      {!isDashboard && footerSlot && <footer>{footerSlot}</footer>}
    </div>
  );
}
