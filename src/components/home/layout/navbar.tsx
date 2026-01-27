"use client";

import React, { useState } from 'react';
import { Menu, X, Search } from 'lucide-react';
import Link from 'next/link';

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full h-[78px] my-auto  text-white overflow-x-hidden"
      style={{
        backgroundColor: "#0B0113",
        backgroundImage: `
          url(/effect.png),
          linear-gradient(
          213.91deg,
          rgba(23, 22, 22, 0) 61.67%,
          rgba(44, 9, 74, 0.71) 116.1%
          ),
          linear-gradient(
          144.95deg,
          rgba(19, 19, 19, 0) 50.66%,
          rgba(142, 56, 217, 0.15) 84.18%
          )
           `,
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Navbar */}
      <nav className="backdrop-blur-sm h-full">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-full items-center self-center my-auto h-16">
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
                  className="w-full bg-[#11042475] border rounded-full border-gray-700 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center font-inter font-normal space-x-6">
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">Explore Experts</a>
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">Community</a>
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">Contact us</a>
              <a href="#" className="text-sm hover:text-purple-400 transition-colors">FAQ&apos;s</a>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3 ml-6">
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
            <div className="md:hidden py-4 space-y-4 border-t border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Want to learn?"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex flex-col space-y-3">
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Explore Experts</a>
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Community</a>
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">Contact us</a>
                <a href="#" className="text-sm hover:text-purple-400 transition-colors">FAQ&apos;s</a>
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
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}