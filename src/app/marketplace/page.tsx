"use client";

import TrendingExpert from "@/components/marketplace/trendingExpert";
import PlatformStats from "@/components/marketplace/PlatformStats";
import ExploreExpertsPage from "@/app/explore-experts/page";

export default function MarketplacePage() {
  return (
    <div className="bg-background min-h-screen">
      <TrendingExpert />
      <PlatformStats />
      <div className="border-t border-border/40">
        <ExploreExpertsPage />
      </div>
    </div>
  );
}