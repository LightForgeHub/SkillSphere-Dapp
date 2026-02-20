"use client"
import React from "react"
import Header from "@/components/dashboard/Header"
import Sidebar, { MobileDrawer } from "@/components/dashboard/Sidebar"

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="min-h-screen">
      <Header onToggleMenu={() => setOpen((v) => !v)} />

      <MobileDrawer isOpen={open} onClose={() => setOpen(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:pl-72">
        <div className="md:flex md:space-x-6">
          <aside className="hidden md:block md:w-64 flex-shrink-0">
            <div className="sticky top-6">
              <Sidebar />
            </div>
          </aside>

          <main className="flex-1 mt-6 md:mt-0">
            <div className="bg-[#110719] rounded-lg shadow-sm p-6 min-h-[400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
