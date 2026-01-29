"use client";

import React, { useState } from 'react';
import { Menu, X, Search, Bell, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide navbar on auth routes
  const authRoutes = ['/login', '/sign-in', '/sign-up'];
  if (authRoutes.includes(pathname)) {
    return null;
  }

  const isLandingPage = pathname === '/';

  return (
    <div className="w-full h-[78px] flex items-center text-foreground overflow-x-hidden"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: "var(--bg-full-pattern)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Navbar */}
      <nav className="backdrop-blur-sm h-full w-full">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-full items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <span className="text-3xl font-jersey-10 tracking-[3px] font-bold cursor-pointer">SkillSphere</span>
              </Link>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Want to learn?"
                  className="w-full bg-[#11042475] border rounded-lg border-gray-700/50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center font-inter font-normal space-x-6">
              {!isLandingPage && (
                <Link href="/" className="text-sm hover:text-purple-400 transition-colors">Home</Link>
              )}
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">Explore Experts</a>
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">Community</a>
              {isLandingPage && (
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Contact us</a>
              )}
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">FAQ's</a>
            </div>

            {/* Desktop Auth/Signed-in Buttons */}
            <div className="hidden md:flex items-center space-x-4 ml-6">
              <ThemeToggle />
              {isLandingPage ? (
                <>
                  <Link href="/login">
                    <button className="px-4 h-8 text-sm border border-gray-700 rounded-lg hover:border-purple-500 transition-colors cursor-pointer">
                      Sign in
                    </button>
                  </Link>
                  <Link href="/sign-up">
                    <button className="px-4 h-8 text-sm bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors cursor-pointer">
                      Get Started
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <button className="flex items-center space-x-2 px-4 h-10 text-sm font-medium bg-[#FA7F2B] rounded-lg hover:bg-[#e67425] transition-colors cursor-pointer whitespace-nowrap">
      <Wallet className="w-5 h-5 text-white" />
                    <span>Connect Wallet</span>
                  </button>
                  
                  <button className="p-2 bg-[#1A0B2E] border border-gray-800 rounded-lg hover:bg-[#251241] transition-colors">
                    <Bell className="w-5 h-5 text-white" />
                  </button>

                  <div className="h-8 w-[1px] bg-gray-700" />

                  <div className="flex items-center">
                    <img
                      src="/profilePic.svg"
                      alt="Profile"
                      className="w-10 h-10 rounded-full border-2 border-[#FA7F2B] cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-4 border-t border-gray-800 bg-background">
              <div className="flex items-center justify-between px-2">
                 <span className="text-sm font-medium text-gray-400">Theme</span>
                 <ThemeToggle />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Want to learn?"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex flex-col space-y-3">
                {!isLandingPage && (
                  <Link href="/" className="text-sm hover:text-purple-400 transition-colors">Home</Link>
                )}
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Explore Experts</a>
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Community</a>
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">FAQ's</a>
                
                {isLandingPage ? (
                  <>
                    <Link href="/login" className="w-full">
                      <button className="w-full px-4 py-2 text-sm border border-gray-700 rounded-lg hover:border-purple-500 transition-colors cursor-pointer">
                        Sign in
                      </button>
                    </Link>
                    <Link href="/sign-up" className="w-full">
                      <button className="w-full px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors cursor-pointer">
                        Get Started
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="pt-4 border-t border-gray-800 space-y-4">
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-[#FA7F2B] rounded-lg">
                      <img src="/wallet-icon.png" alt="wallet" className="w-5 h-5 invert" />
                      <span>Connect Wallet</span>
                    </button>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src="/avatar.png" alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#FA7F2B]" />
                        <span className="text-sm font-medium">Profile</span>
                      </div>
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
