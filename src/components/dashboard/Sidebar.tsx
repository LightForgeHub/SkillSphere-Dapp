"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"


const navItems = [
  { href: "/dashboard", label: "Home", iconName: "home-05" },
  { href: "/dashboard/learners", label: "Learners", iconName: "learner" },
  { href: "/dashboard/notifications", label: "Notifications", iconName: "message-notification" },
  { href: "/dashboard/courses", label: "Courses", iconName: "course" },
  { href: "/dashboard/earnings", label: "Earnings", iconName: "wallet-02" },
]

const bottomItems = [
  { href: "/dashboard/support", label: "Support", iconName: "support" },
  { href: "/dashboard/ai", label: "AI chat bot", iconName: "ai chatbot" },
]

const profiles = [
  { id: "nora", name: "Miss Nora" },
  { id: "sam", name: "Mr Sam" },
  { id: "lulu", name: "Mrs Lulu" },
]

function classNames(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(" ")
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false)

  const [profile, setProfile] = useState(profiles[0])

  useEffect(() => {
    try {
      const v = localStorage.getItem("dashboard_profile")
      if (v) setProfile(JSON.parse(v))
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("dashboard_profile", JSON.stringify(profile))
    } catch (e) {}
  }, [profile])

  const activeItem = navItems.find((item) => pathname === item.href)?.label || "Home"

  return (
    <>
      {/* MOBILE DROPDOWN */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#110719] text-white"
        >
          {activeItem}
          <ChevronDown size={18} />
        </button>

        {open && (
          <div className="mt-2 bg-[#110719] rounded-xl p-2">
            {/* Profile selector in mobile dropdown */}
            <div className="mb-3">
              <div className="text-xs text-gray-300 mb-2">Profile</div>
              <div className="space-y-1">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfile(p)
                      setOpen(false)
                    }}
                    className={classNames(
                      "w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                      p.id === profile.id ? "bg-purple-600/20 text-white" : "text-gray-300 hover:bg-white/5"
                    )}
                  >
                    <img src={`/assets/${encodeURIComponent("Avatar Placeholder.png")}`} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                      active ? "bg-purple-600/20 text-white" : "text-gray-300 hover:bg-white/5"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <span className="w-[18px] h-[18px]">
                      <img src={`/icons/${encodeURIComponent(item.iconName)}.svg`} alt={item.label} className="w-[18px] h-[18px]" />
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
              {bottomItems.map((b) => (
                <Link
                  key={b.href}
                  href={b.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5"
                >
                  <span className="w-[18px] h-[18px]">
                    <img src={`/icons/${encodeURIComponent(b.iconName)}.svg`} alt={b.label} className="w-[18px] h-[18px]" />
                  </span>
                  {b.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[260px] h-[90vh] md:h-[80vh] bg-[#110719] border-r border-white/5 p-4">
        
        {/* Profile */}
        <div className="mb-6 relative">
          <button
            onClick={() => setDesktopProfileOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-[#110719] rounded-xl px-3 py-2"
            aria-expanded={desktopProfileOpen}
          >
              <div className="flex items-center gap-2">
              <img src={`/assets/${encodeURIComponent("Avatar Placeholder.png")}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-sm text-white">{profile.name}</span>
            </div>

            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {desktopProfileOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-[#110719] rounded-xl p-2 border border-white/5 shadow-lg z-50">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProfile(p)
                    setDesktopProfileOpen(false)
                  }}
                  className={classNames(
                    "w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                    p.id === profile.id ? "bg-purple-600/20 text-white" : "text-gray-300 hover:bg-white/5"
                  )}
                >
                  <img src={`/assets/${encodeURIComponent("Avatar Placeholder.png")}`} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={classNames(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition",
                    active
                      ? "bg-[#613485] text-white"
                      : "text-gray-400 hover:bg-white/5"
                  )}
                >
                  <span className="w-[18px] h-[18px]">
                    <img src={`/icons/${encodeURIComponent(item.iconName)}.svg`} alt={item.label} className="w-[18px] h-[18px]" />
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Bottom utilities */}
        <div className="mt-auto pt-6 space-y-3">
          {bottomItems.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5"
            >
              <span className="w-[18px] h-[18px]">
                <img src={`/icons/${encodeURIComponent(b.iconName)}.svg`} alt={b.label} className="w-[18px] h-[18px]" />
              </span>
              {b.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}

// Controlled mobile drawer used by DashboardShell (slide-in)
export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname() || "/"
  const [profile, setProfile] = useState(profiles[0])

  useEffect(() => {
    try {
      const v = localStorage.getItem("dashboard_profile")
      if (v) setProfile(JSON.parse(v))
    } catch (e) {}
  }, [])

  const handleSelectProfile = (p: { id: string; name: string }) => {
    try {
      localStorage.setItem("dashboard_profile", JSON.stringify(p))
    } catch (e) {}
    setProfile(p)
    onClose()
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-[#110719] z-50 transform transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={`/assets/${encodeURIComponent("Avatar Placeholder.png")}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <div className="text-sm font-semibold text-white">{profile.name}</div>
                <div className="text-xs text-gray-300">Active profile</div>
              </div>
            </div>

            <button onClick={onClose} aria-label="Close menu" className="p-2 rounded-md hover:bg-slate-100">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3">
            <div className="text-xs text-gray-300 mb-2">Profiles</div>
          
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={classNames(
                      "flex items-center gap-3 px-3 py-2 rounded-md",
                      active ? "bg-purple-600/20 text-white" : "text-gray-300 hover:bg-white/5"
                    )}
                  >
                    <span className="w-[18px] h-[18px]">
                        <img src={`/icons/${encodeURIComponent(item.iconName)}.svg`} alt={item.label} className="w-[18px] h-[18px]" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            {bottomItems.map((b) => (
              <Link
                key={b.href}
                href={b.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5"
              >
                <span className="w-[18px] h-[18px]">
                  <img src={`/icons/${encodeURIComponent(b.iconName)}.svg`} alt={b.label} className="w-[18px] h-[18px]" />
                </span>
                {b.label}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}