"use client";

import React from "react";
import Link from "next/link";
import Head from "next/head";
import Footer from "./home/layout/footer";
import Navbar from "./home/layout/navbar";

export default function Custom404() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-green-50 to-teal-50 w-full overflow-x-hidden">
      <Head>
        <title>404 - Knowledge Gap Detected</title>
        <meta name="description" content="Page not found" />
      </Head>

      {/* Navigation Bar */}
      <Navbar />

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
      <Footer />
    </div>
  );
}
