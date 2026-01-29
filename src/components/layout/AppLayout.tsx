import React, { ReactNode } from "react";

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
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {headerSlot && <header className="sticky top-0 z-50">{headerSlot}</header>}
      
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {footerSlot && <footer>{footerSlot}</footer>}
    </div>
  );
}
