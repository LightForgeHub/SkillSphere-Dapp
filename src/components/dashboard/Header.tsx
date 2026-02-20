"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
const profiles = [
  { id: "nora", name: "Miss Nora" },
  { id: "sam", name: "Mr Sam" },
  { id: "lulu", name: "Mrs Lulu" },
]

export default function Header({
  title,
  onToggleMenu,
}: {
  title?: string
  onToggleMenu?: () => void
}) {
  const [profile, setProfile] = useState(profiles[0])
  const [open, setOpen] = useState(false)
  const [mobileProfileModalOpen, setMobileProfileModalOpen] = useState(false)

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

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "dashboard_profile" && e.newValue) {
        try {
          setProfile(JSON.parse(e.newValue))
        } catch (e) {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

    function classNames(...classes: (string | undefined | null | false)[]): string {
        return classes.filter(Boolean).join(" ")
    }
  return (
    <header className="bg-[#110719] border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleMenu}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-md hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">{title || "Dashboard"}</h1>
          </div>

          <div className="flex items-center gap-4">
        

            <div>
              <button
                onClick={() => {
                  // open mobile modal only on small screens
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setMobileProfileModalOpen(true)
                  }
                }}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100"
              >
                <span className="hidden sm:inline text-sm text-slate-200">{profile.name}</span>
                <div className="w-8 h-8 bg-slate-200 rounded-full" />
                <ChevronDown className="w-4 h-4 text-slate-200" />
              </button>

              {mobileProfileModalOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileProfileModalOpen(false)} />

                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] bg-white rounded-xl p-4 border shadow-lg z-50 md:hidden">
                    <div className="text-sm text-gray-600 mb-3">Select profile</div>
                    <div className="space-y-2">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setProfile(p)
                            setMobileProfileModalOpen(false)
                          }}
                          className={classNames(
                            "w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                            p.id === profile.id ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
