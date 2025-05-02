"use client";

import React from "react";
import Link from "next/link";
import Head from "next/head";

export default function Custom404() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-green-50 to-teal-50 w-full overflow-x-hidden">
      <Head>
        <title>404 - Knowledge Gap Detected</title>
        <meta name="description" content="Page not found" />
      </Head>

      {/* Navigation Bar */}
      {/* Navigation Bar */}
      <nav className="bg-transparent px-4 md:px-6 py-3 flex justify-center items-center">
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-2 mr-2">
            <div className="h-4 w-4 bg-teal-500 rounded-full"></div>
            <span className="text-teal-600 text-xs font-medium">Logo</span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search to search"
              className="bg-white text-xs rounded-full pl-3 pr-6 py-1 w-28 focus:outline-none border border-gray-200"
            />
            <svg
              className="h-3 w-3 absolute right-2 top-1.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center ml-1">
            <span className="text-gray-600 text-xs">English</span>
            <svg
              className="h-3 w-3 ml-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <div className="flex space-x-2 text-xs ml-2">
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              Home
            </Link>
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              About us
            </Link>
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              Courses
            </Link>
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              Contact us
            </Link>
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              FAQs
            </Link>
            <Link href="#" className="text-gray-600 hover:text-teal-600">
              Sign in
            </Link>
          </div>
          <button className="bg-teal-500 text-white text-xs px-3 py-1 rounded-full hover:bg-teal-600 transition-colors ml-1">
            Get into account
          </button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center text-center px-4 py-6 md:py-12 relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <div className="grid grid-cols-12 h-full w-full">
            {[...Array(144)].map((_, i) => (
              <div key={i} className="border border-teal-200"></div>
            ))}
          </div>
        </div>

        {/* Error code */}
        <h1 className="text-6xl md:text-8xl font-bold text-teal-600 mt-6 md:mt-8 z-10">
          404
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mt-2 mb-4 z-10">
          Knowledge Gap Detected
        </h2>
        <p className="text-sm md:text-base text-gray-600 max-w-lg mb-6 z-10">
          Oops! This page seems to have emerged <b>404</b> in search of
          expertise. Even the most knowledgeable platforms have their blind
          spots.
        </p>

        {/* SVG Network Visualization */}
        <div
          className="relative w-56 md:w-64 h-56 md:h-64 mb-6 z-10"
          aria-hidden="true"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <g stroke="rgba(20, 184, 166, 0.8)" fill="none" strokeWidth="1">
              <circle
                cx="100"
                cy="100"
                r="50"
                strokeDasharray="4 2"
                className="opacity-40"
              />
              <circle
                cx="100"
                cy="100"
                r="70"
                strokeDasharray="4 2"
                className="opacity-30"
              />
              {[
                ["70", "80"],
                ["120", "60"],
                ["150", "100"],
                ["130", "140"],
                ["80", "150"],
                ["50", "120"],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="rgba(20, 184, 166, 0.8)"
                />
              ))}
              <circle cx="100" cy="100" r="6" fill="rgba(239, 68, 68, 0.8)" />
              {[
                [70, 80, 120, 60],
                [120, 60, 150, 100],
                [150, 100, 130, 140],
                [130, 140, 80, 150],
                [80, 150, 50, 120],
                [50, 120, 70, 80],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
              {[
                ["70", "80"],
                ["120", "60"],
                ["150", "100"],
                ["130", "140"],
                ["80", "150"],
                ["50", "120"],
              ].map(([x, y], i) => (
                <line
                  key={`c${i}`}
                  x1="100"
                  y1="100"
                  x2={x}
                  y2={y}
                  className="opacity-50"
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Technical info */}
        <div className="bg-teal-100 border border-teal-200 rounded-lg p-4 max-w-lg text-sm text-gray-600 mb-8 z-10">
          <p>
            The term "404 error" originated in the early days of the internet.
            It's the HTTP status code that indicates a server couldn't find the
            requested page.
            <b> 404 is the code that returns even the experts</b> when you ask a
            question that stumps even the experts.
          </p>
        </div>

        {/* Action button */}
        <div className="z-10">
          <Link
            href="/"
            className="px-6 py-2 bg-teal-500 text-white text-sm rounded-md hover:bg-teal-600 transition-colors"
          >
            Go to Home
          </Link>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="rgba(20, 184, 166, 0.8)"
            strokeWidth="2"
          >
            <rect x="0" y="70" width="30" height="30" />
            <rect x="20" y="50" width="30" height="30" />
            <rect x="40" y="70" width="30" height="30" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-24 h-24 opacity-20">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="rgba(75, 85, 99, 0.8)"
            strokeWidth="2"
          >
            <rect x="30" y="70" width="30" height="30" />
            <rect x="50" y="50" width="30" height="30" />
            <rect x="70" y="70" width="30" height="30" />
          </svg>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-xs">
        <div className="container mx-auto px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div>
            <div className="mb-4">
              <div className="h-8 w-8 bg-gray-800 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-teal-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-2">
              Our learning system ensures that experts know
            </p>
            <p className="text-gray-500 text-xs">what not to forget.</p>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Product
            </h3>
            <ul className="space-y-2">
              {[
                "Overview",
                "Features",
                "Solutions",
                "Tutorials",
                "Pricing",
              ].map((text, j) => (
                <li key={j}>
                  <Link href="#" className="hover:text-white text-xs">
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Company
            </h3>
            <ul className="space-y-2">
              {["About us", "Careers", "Press", "News", "Media"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Social
            </h3>
            <ul className="space-y-2">
              {["Twitter", "LinkedIn", "Facebook", "GitHub", "Dribbble"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Legal
            </h3>
            <ul className="space-y-2">
              {["Terms", "Privacy", "Cookies", "Settings", "Contact"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto px-8">
          <p className="text-xs text-gray-500">
            © 2023 DAppName. All rights reserved.
          </p>
          <div className="flex space-x-3 mt-4 md:mt-0">
            {["Twitter", "GitHub", "LinkedIn", "Discord"].map((platform, i) => (
              <a
                key={i}
                href="#"
                className="text-gray-600 hover:text-white"
                aria-label={platform}
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
