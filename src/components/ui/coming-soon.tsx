"use client";

import React from 'react';
import { Users, MessageCircle, Mail, HelpCircle } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  iconName: 'users' | 'message-circle' | 'mail' | 'help-circle';
  description?: string;
}

const iconMap = {
  'users': Users,
  'message-circle': MessageCircle,
  'mail': Mail,
  'help-circle': HelpCircle,
};

export default function ComingSoon({ title, iconName, description }: ComingSoonProps) {
  const Icon = iconMap[iconName];

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center text-foreground"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: "var(--bg-full-pattern)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 text-center">
        {/* Icon Container with Gradient Border */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full p-8">
            <Icon className="w-24 h-24 text-purple-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent font-jersey-10 tracking-[2px]">
          {title}
        </h1>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 mb-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <span className="text-lg font-semibold text-purple-300 font-inter">Coming Soon</span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto font-inter">
            {description}
          </p>
        )}

        {/* Decorative Elements */}
        <div className="flex justify-center gap-2 mt-12">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
