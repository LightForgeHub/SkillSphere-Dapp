"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function Custom404() {
  return (
    <div className="min-h-screen bg-[#0B0113] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects matching SkillSphere theme */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(/effect.png), linear-gradient(213.91deg, rgba(23, 22, 22, 0) 61.67%, rgba(44, 9, 74, 0.71) 116.1%), linear-gradient(144.95deg, rgba(19, 19, 19, 0) 50.66%, rgba(142, 56, 217, 0.15) 84.18%)`
        }}
      />
      
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0113] via-purple-900/20 to-[#0B0113] animate-pulse" />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Floating animation container */}
        <div className="animate-fade-in-up">
          {/* 404 Number with gradient effect */}
          <div className="relative mb-8">
            <h1 className="text-[150px] md:text-[200px] font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              404
            </h1>
            
            {/* Glitch effect overlay */}
            <div className="absolute inset-0 text-[150px] md:text-[200px] font-bold text-purple-500/20 leading-none animate-pulse">
              404
            </div>
          </div>

          {/* Error message */}
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            Oops! The page you're looking for doesn't exist.
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            It seems this skill has vanished into the digital void. Let's get you back to learning.
          </p>

          {/* Animated icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center animate-bounce">
                <Search className="w-10 h-10 text-white" />
              </div>
              
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 translate-y-1/2" />
                <div className="absolute left-0 top-1/2 w-2 h-2 bg-pink-400 rounded-full -translate-y-1/2 -translate-x-1/2" />
                <div className="absolute right-0 top-1/2 w-2 h-2 bg-yellow-400 rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go Back Home
            </Link>
            
            <Link
              href="/explore-experts"
              className="px-8 py-3 bg-transparent border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-800/50 hover:border-gray-500 hover:text-white transition-all duration-300 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Explore Experts
            </Link>
          </div>

          {/* Help text */}
          <div className="mt-8 text-gray-500 text-sm">
            <p>If you believe this is an error, please contact our support team.</p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-10 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .delay-500 {
          animation-delay: 500ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}
