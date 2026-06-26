"use client";

import Link from "next/link";
import { Home, Compass, LayoutDashboard, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const BOTTOM_NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/explore-experts", label: "Experts", icon: Users },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

/** Bottom navigation bar shown on mobile for dashboard routes */
export default function MobileMenu() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch">
        {BOTTOM_NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-violet-400"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
