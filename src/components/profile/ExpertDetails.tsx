"use client";

import React from 'react';
import { Star, Clock, CheckCircle } from 'lucide-react';
import { Expert, Review } from '@/utils/types/types';
import { useCurrency } from '@/hooks/useCurrency';

// ── Rating Breakdown Panel ──────────────────────────────────────────────────

interface RatingBreakdownProps {
  reviews: Review[];
  overallRating: number;
}

const SUB_CATEGORIES = [
  { key: "communication", label: "Communication" },
  { key: "subjectDepth", label: "Subject Depth" },
  { key: "punctuality", label: "Punctuality" },
  { key: "valueForMoney", label: "Value for Money" },
] as const;

// Deterministically derive mock sub-category scores from the review list
function deriveSubScores(reviews: Review[]): Record<string, number> {
  if (reviews.length === 0) {
    return { communication: 0, subjectDepth: 0, punctuality: 0, valueForMoney: 0 };
  }
  const base = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return {
    communication: Math.min(5, parseFloat((base + 0.2).toFixed(1))),
    subjectDepth: Math.min(5, parseFloat((base - 0.3).toFixed(1))),
    punctuality: Math.min(5, parseFloat((base + 0.1).toFixed(1))),
    valueForMoney: Math.min(5, parseFloat((base - 0.1).toFixed(1))),
  };
}

function RatingBreakdown({ reviews, overallRating }: RatingBreakdownProps) {
  // Count reviews per star bucket
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating)));
    starCounts[bucket]++;
  });
  const total = reviews.length;

  const subScores = deriveSubScores(reviews);

  return (
    <div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border border-purple-500/20 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Rating Breakdown</h2>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Star distribution */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl font-bold text-white">{overallRating.toFixed(1)}</span>
            <div>
              <div className="flex gap-0.5 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      i < Math.round(overallRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-500"
                    }
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400">{total} review{total !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = starCounts[star] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-right text-gray-400">{star}</span>
                  <Star size={13} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${star} star: ${pct}%`}
                    />
                  </div>
                  <span className="w-10 text-right text-gray-400">{pct}%</span>
                  <span className="w-6 text-right text-gray-500 text-xs">({count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-category averages */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Category Averages
          </h3>
          <div className="space-y-4">
            {SUB_CATEGORIES.map(({ key, label }) => {
              const score = subScores[key] ?? 0;
              const pct = (score / 5) * 100;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{label}</span>
                    <span className="font-semibold text-white">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      aria-label={`${label}: ${score} out of 5`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExpertDetailsProps {
  expert: Expert;
  onBookClick?: () => void;
}

export default function ExpertDetails({ expert, onBookClick }: ExpertDetailsProps) {
  const { rates } = useCurrency();
    
  // Calculate USD rates
  const hourlyRateUSD = rates ? expert.hourlyRate * rates.usd : null;


  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-purple-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={expert.avatar}
              alt={expert.name}
              className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
            />
          </div>

          {/* Expert Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{expert.name}</h1>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-full text-sm font-medium">
                {expert.category}
              </span>
              <span className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-full text-sm font-medium flex items-center gap-1">
                <Clock size={16} />
                {expert.responseTime}
              </span>
              {expert.is_busy ? (
                <span className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-sm font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  In Call
                </span>
              ) : expert.availability ? (
                <span className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-sm font-medium flex items-center gap-1">
                  <CheckCircle size={16} />
                  Available Now
                </span>
              ) : null}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.floor(expert.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                    />
                  ))}
                </div>
                <span className="font-semibold">{expert.rating}</span>
                <span className="text-gray-400">({expert.reviews} reviews)</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{expert.totalSessions}</div>
                <div className="text-sm text-gray-400">Total Sessions</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{expert.hourlyRate} XLM/hr</div>
                <div className="text-sm text-gray-400">
                  {hourlyRateUSD ? `($${hourlyRateUSD.toFixed(2)} / hr)` : 'Hourly Rate'}
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{expert.reviews}</div>
                <div className="text-sm text-gray-400">Positive Reviews</div>
              </div>
            </div>

            {/* Book Button */}
            <div className="relative group">
              <button
                onClick={onBookClick}
                disabled={expert.is_busy}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
              >
                Book Session
              </button>
              {expert.is_busy && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-gray-300 text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Expert is currently in another consultation. Please try again later.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {expert.bio && (
        <div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <p className="text-gray-400 leading-relaxed">{expert.bio}</p>
        </div>
      )}

      {/* Skills Section */}
      {expert.skills && expert.skills.length > 0 && (
        <div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Skills & Expertise</h2>
          <div className="flex flex-wrap gap-3">
            {expert.skills.map((skill, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 rounded-lg text-sm font-medium hover:from-purple-600/50 hover:to-pink-600/50 transition-all cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rating Breakdown Panel */}
      {expert.pastReviews && expert.pastReviews.length > 0 && (
        <RatingBreakdown
          reviews={expert.pastReviews}
          overallRating={expert.rating}
        />
      )}

      {/* Reviews Section */}
      {expert.pastReviews && expert.pastReviews.length > 0 && (
        <div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Past Reviews</h2>
          <div className="space-y-6">
            {expert.pastReviews.map((review) => (
              <div key={review.id} className="border-b border-purple-500/10 pb-6 last:border-0">
                <div className="flex items-start gap-4">
                  <img
                    src={review.reviewerAvatar}
                    alt={review.reviewer}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{review.reviewer}</h3>
                      <span className="text-sm text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                        />
                      ))}
                    </div>
                    <p className="text-gray-400">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}