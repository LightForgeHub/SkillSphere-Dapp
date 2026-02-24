"use client"

import React from "react"
import { Search, Bell, ChevronDown, MoreVertical, Menu } from "lucide-react"
import Logo from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar"
import { useRouter } from "next/navigation"

export default function DashboardTopBar({ onToggleMenu }: { onToggleMenu?: () => void }) {
  const router = useRouter()
  return (
    <header className="w-full bg-[#05010d] border-b border-white/5 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Hamburger, Logo and Breadcrumbs */}
      <div className="flex justify-between items-center md:min-w-[380px] gap-4 md:gap-12">
        <button
          onClick={onToggleMenu}
          className="lg:hidden p-2 -ml-2 text-white/60 hover:text-white transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-2xl font-jersey-10 tracking-[1px] text-white hidden sm:block">SkillSphere</span>
        </div>

        <nav aria-label="Breadcrumb" className="hidden xl:flex items-center text-sm font-medium">
          <span className="text-white">Home</span>
          <span className="mx-3 text-white/40">|</span>
          <span className="text-white/60">Glance</span>
        </nav>
      </div>

      {/* Right: Actions and User */}
      <div className="flex  items-center gap-5 md:min-w-[780px]">
        {/* Notification Icon */}
        <button className="p-2 text-white/40 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-purple-500 rounded-full border border-[#05010d]" />
        </button>

        {/* Search Bar */}
        <div className="relative hidden md:block w-48 lg:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full pl-9 bg-white/5 border-white/10 text-sm text-white placeholder:text-white/20 focus:bg-white/10 transition-all rounded-xl h-10 border"
          />
        </div>

        {/* Create Courses Button */}
        <Button 
          onClick={() => router.push("/dashboard/courses/create")}
          className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white h-10 px-4 rounded-xl text-sm font-medium transition-all"
        >
          <img src="/icons/paint-brush.svg" alt="Create" className="w-5 h-5 invert transition-all" />
          <span>Create Courses</span>
        </Button>

        {/* User Section */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1 pr-3 hover:bg-white/10 transition-all cursor-pointer min-w-max">
          <Avatar className="w-8 h-8 rounded-xl overflow-hidden border border-white/20">
            <AvatarImage src="/assets/Avatar Placeholder.png" alt="User Avatar" />
            <AvatarFallback>OP</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs md:text-sm text-white font-medium hidden xs:block">osatuyipikin.fright.eth</span>
            <span className="text-xs text-white/60 hidden md:block">osatuyipikin.fright.eth</span>
          </div>
          <MoreVertical className="w-4 h-4 text-white/40 hidden md:block" />
        </div>
      </div>
    </header>
  )
}
