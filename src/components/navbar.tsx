'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Logo from './ui/Logo';

interface NavItem {
  name: string;
  path: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { name: 'Home', path: '/' },
    { name: 'About us', path: '/about' },
    { name: 'How it works', path: '/services' },
    { name: 'Contact us', path: '/blog' },
    { name: "FAQ's", path: '/contact' },
  ];

  return (
    <header
      className={`bg-white sticky top-0 z-50 transition-all duration-300 pt-2`}>
      <div className="container mx-auto sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center md:ml-6 lg:ml-8 xl:ml-10">
            <Logo />
          </div>

          {/* Search - Desktop */}
          <div className="hidden lg:flex flex-1 mx-6 xl:mx-8 max-w-2xl">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4-4m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Want to learn?"
                className="block w-full pl-10 pr-24 py-2 border border-gray-300 rounded-lg bg-white text-[#667085] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#20B486] focus:border-transparent sm:text-sm transition-all"
              />
              <button
                type="button"
                className="absolute inset-y-2 right-0 flex items-center pr-3 text-sm font-inter text-[#20B486] bg-[#20B486]/4">
                Explore
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-1 py-2 text-sm xl:text-base font-medium font-inter ${
                  pathname === item.path
                    ? 'text-[#1A906B]'
                    : 'text-[#101828] hover:text-[#1A906B] transition-colors'
                }`}>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons - Desktop */}
          <div className="hidden lg:flex items-center pl-10">
            <button className="mr-2 px-4 py-2 text-sm font-inter font-bold text-[#101828] hover:text-[#1A906B] transition-colors">
              Sign in
            </button>
            <button className="px-4 py-2 text-sm font-inter font-medium text-white bg-[#20B486] rounded-lg hover:bg-[#1A906B] transition-colors shadow-sm">
              Create an account
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#20B486] transition-all"
              aria-label="Menú principal">
              <span className="sr-only">
                {isOpen ? 'Close menu' : 'Open menu'}
              </span>
              <svg
                className={`h-6 w-6 ${isOpen ? 'hidden' : 'block'}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`h-6 w-6 ${isOpen ? 'block' : 'hidden'}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3 bg-white shadow-lg">
          {/* Mobile Search */}
          <div className="relative mt-2 mb-4 mx-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4-4m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Want to learn..."
              className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg bg-white text-[#667085] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#20B486] focus:border-transparent sm:text-sm"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm font-medium text-[#20B486]">
              Explore
              <svg
                className="ml-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-md text-base font-medium font-inter ${
                pathname === item.path
                  ? 'bg-[#F2FFFB] text-[#1A906B]'
                  : 'text-[#101828] hover:bg-gray-50 hover:text-[#1A906B]'
              } transition-colors`}>
              {item.name}
            </Link>
          ))}

          {/* Mobile Auth Buttons */}
          <div className="pt-4 pb-2 flex flex-col space-y-3">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-base font-inter font-medium text-[#101828] hover:bg-gray-50 rounded-lg transition-colors">
              Sign in
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-base font-inter font-medium text-white bg-[#20B486] rounded-lg hover:bg-[#1A906B] transition-colors shadow-sm">
              Create an account
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
