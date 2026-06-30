"use client";

import React from "react";
import { cn } from "@/components/ui/utils";
import { Award, ExternalLink, Calendar, ShieldCheck } from "lucide-react";

export interface SBTBadge {
  id: string;
  title: string;
  icon: string;
  dateIssued: string;
  verificationLink?: string;
  description?: string;
  issuer?: string;
  category?: string;
}

interface BadgeGalleryProps {
  badges: SBTBadge[];
  className?: string;
  title?: string;
}

function VerificationBadge({ link }: { link: string }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
    >
      <ShieldCheck className="w-3 h-3" />
      Verify
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
}

export function BadgeGallery({ badges, className, title = "Skill Badges" }: BadgeGalleryProps) {
  if (!badges.length) return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-[#161716] border-none rounded-2xl p-3 md:p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            <label className="text-base font-medium text-white tracking-tight font-sans">
              {title}
            </label>
          </div>
          <span className="text-[10px] font-bold text-white/40 tracking-widest">
            {badges.length} {badges.length === 1 ? "BADGE" : "BADGES"}
          </span>
        </div>

        <div className="h-px bg-white/5 w-full mb-3" />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: SBTBadge }) {
  return (
    <div className="group relative">
      <div className="bg-black/30 border border-purple-500/10 rounded-xl p-3 flex flex-col items-center text-center gap-2 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/5 cursor-default">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all">
            <img
              src={badge.icon}
              alt={badge.title}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>

        <div className="min-w-0 w-full">
          <p className="text-xs font-semibold text-white truncate">{badge.title}</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-white/40">
            <Calendar className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{badge.dateIssued}</span>
          </div>
        </div>

        {badge.verificationLink && (
          <VerificationBadge link={badge.verificationLink} />
        )}
      </div>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2.5 bg-gray-900 text-gray-200 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="flex items-start gap-2 mb-1.5">
          <Award className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
          <p className="font-semibold text-white">{badge.title}</p>
        </div>
        {badge.description && (
          <p className="text-white/60 mb-1.5 leading-relaxed">{badge.description}</p>
        )}
        <div className="space-y-1 text-white/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Issued: {badge.dateIssued}</span>
          </div>
          {badge.issuer && (
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Issuer: {badge.issuer}</span>
            </div>
          )}
          {badge.category && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 shrink-0 flex items-center justify-center text-[8px]">#</span>
              <span>{badge.category}</span>
            </div>
          )}
        </div>
        {badge.verificationLink && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <VerificationBadge link={badge.verificationLink} />
          </div>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
