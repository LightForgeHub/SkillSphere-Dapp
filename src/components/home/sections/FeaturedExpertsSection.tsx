"use client";

import React from "react";
import Link from "next/link";
import { Star, Clock, ArrowRight, ShieldCheck, Video } from "lucide-react";
import { mockExperts } from "@/utils/data/mock-data";

export function FeaturedExpertsSection() {
  // Take top 3 verified experts
  const featured = mockExperts.slice(0, 3);

  return (
    <section className="relative w-full py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/40 overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-[1320px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified On-Chain Experts</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-work tracking-tight text-foreground">
              Top Rated Knowledge Partners
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Connect with vetted industry specialists for real-time video consultations. Stream payments per minute directly on Stellar.
            </p>
          </div>

          <Link
            href="/explore-experts"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-900/20 transition-all duration-200 shrink-0 self-start md:self-auto"
          >
            <span>Explore All Experts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Expert Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featured.map((expert) => {
            const perMinuteRate = (expert.hourlyRate / 60).toFixed(2);
            return (
              <div
                key={expert.id}
                className="group relative rounded-2xl bg-card/60 backdrop-blur-xl border border-border/60 p-6 flex flex-col justify-between hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300"
              >
                <div>
                  {/* Top Header: Avatar & Category */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="relative">
                      <img
                        src={expert.avatar || "/profilePic.svg"}
                        alt={expert.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                      />
                      {expert.verified && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-1 shadow-md"
                          title="Verified Expert"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {expert.category}
                    </span>
                  </div>

                  {/* Name & Title */}
                  <h3 className="text-xl font-bold font-work text-foreground mb-1 group-hover:text-purple-300 transition-colors">
                    {expert.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {expert.bio || expert.title}
                  </p>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {expert.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40"
                      >
                        {skill}
                      </span>
                    ))}
                    {expert.skills.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground">
                        +{expert.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer: Rating, Rate & Action */}
                <div className="pt-4 border-t border-border/40 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{expert.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground font-normal">
                        ({expert.reviewsCount || 12} reviews)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{expert.responseTime || "< 1 hour"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                        Rate
                      </p>
                      <p className="text-base font-bold font-mono text-purple-300">
                        ${expert.hourlyRate}/hr{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (~${perMinuteRate}/min)
                        </span>
                      </p>
                    </div>

                    <Link
                      href={`/explore-experts/${expert.id}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-purple-200 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 hover:border-purple-500 hover:text-white transition-all duration-200"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Book Session</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
