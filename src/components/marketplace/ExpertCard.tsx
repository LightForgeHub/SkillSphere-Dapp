"use client";

import React from 'react';
import Link from 'next/link';
import { Star, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Expert } from '@/utils/types/types';
import { prefetchExpert } from '@/hooks/useExperts';
import { useSurgeMultiplier } from '@/hooks/useSurgeMultiplier';
import { useQueryClient } from '@tanstack/react-query';

interface ExpertCardProps {
  expert: Expert;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  const queryClient = useQueryClient();
  const { multiplier, isSurgeActive } = useSurgeMultiplier();

  const handleMouseEnter = () => {
    prefetchExpert(queryClient, expert.id);
  };

  // Calculate surge percentage for display
  const surgePercent = Math.round((multiplier - 1) * 100);

  return (
    <Link href={`/explore-experts/${expert.id}`}>
      <div
        onMouseEnter={handleMouseEnter}
        className="h-full bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
      >
        {/* Card Header with Avatar */}
        <div className="relative h-40 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/20 flex items-center justify-center">
          <img
            src={expert.avatar}
            alt={expert.name}
            className="w-24 h-24 rounded-full border-4 border-purple-500/50 object-cover"
          />
        </div>

        {/* Card Body */}
        <div className="p-6">
          {/* Name and Category */}
          <h3 className="text-xl font-bold mb-1 group-hover:text-purple-400 transition-colors">
            {expert.name}
          </h3>
          <p className="text-sm text-gray-400 mb-4">{expert.category}</p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.floor(expert.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">{expert.rating}</span>
            <span className="text-xs text-gray-500">({expert.reviews})</span>
          </div>

          {/* Rate and Availability */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-purple-500/10">
            <div className="flex flex-col gap-1">
              <span
                className="font-bold text-lg text-purple-400 cursor-help"
                title="Rate may increase during high demand periods"
              >
                {expert.hourlyRate}
              </span>
              {isSurgeActive && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 w-fit"
                  role="alert"
                  aria-label={`Surge pricing is active. Rate increased by ${surgePercent}%`}
                >
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  Surge Pricing Active (+{surgePercent}%)
                </span>
              )}
            </div>
            {expert.is_busy ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-400">In Call</span>
              </div>
            ) : expert.availability ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-xs font-medium text-green-400">Available</span>
              </div>
            ) : null}
          </div>

          {/* Response Time */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={16} className="text-blue-400" />
            <span>Responds in {expert.responseTime}</span>
          </div>

          {/* View Profile Button */}
          <button className="mt-6 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105">
            View Profile
          </button>
        </div>
      </div>
    </Link>
  );
}
