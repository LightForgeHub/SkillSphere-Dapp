'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
    { name: 'FAQ’s', path: '/contact' },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 mt-11">
      <div className="flex justify-between h-16">
        {/* Logo */}
        <div className="flex items-center ml-15 ">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900">
            MiSitio
          </Link>
        </div>
        {/* search */}
        <div className=" flex items-center">
          <div className="relative flex items-center ">
            {/* Icon */}
            <div className="absolute left-2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
              className="w-full py-3 pl-12 pr-28 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#20B486] focus:border-transparent"
            />

            <button
              type="button"
              className="absolute right-2 flex items-center gap-1 p-1 pl-4 pr-3 font-inter bg-[#F2FFFB] text-[#20B486] rounded-full hover:bg-[#E0F5EF] transition-colors">
              Explore
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`px-1 py-2 text-sm font-medium ${
                pathname === item.path
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              } transition-colors`}>
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex ">
          <button>Sign in</button>
          <button className="text-green-300">Create an account</button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            aria-label="Menú principal">
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md">
          <div className="pt-2 pb-3 space-y-1 px-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === item.path
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
