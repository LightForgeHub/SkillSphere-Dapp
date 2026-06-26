"use client";

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import ExpertCard from '@/components/marketplace/ExpertCard';
import { mockExperts } from '@/utils/data/mock-data';

export default function ExploreExpertsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rateFilter, setRateFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const categories = Array.from(new Set(mockExperts.map((e) => e.category)));

  const filteredExperts = mockExperts.filter((expert) => {
    const matchesSearch = expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expert.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || expert.category === selectedCategory;

    const numericRate = parseFloat(expert.hourlyRate.replace(/[^0-9.]/g, ""));
    const matchesRate =
      rateFilter === "all" ||
      (rateFilter === "under50" && numericRate < 50) ||
      (rateFilter === "50to150" && numericRate >= 50 && numericRate <= 150) ||
      (rateFilter === "over150" && numericRate > 150);

    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "4plus" && expert.rating >= 4) ||
      (ratingFilter === "4.5plus" && expert.rating >= 4.5) ||
      (ratingFilter === "5" && expert.rating === 5);

    return matchesSearch && matchesCategory && matchesRate && matchesRating;
  });

  return (
    <div
      className="min-h-screen w-full text-foreground"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: "var(--bg-full-pattern)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Explore Experts</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Connect with talented professionals across various fields. Browse our expert community, view their profiles, and book sessions.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-12 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by name, category, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500/60 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 hover:border-purple-500/60'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 hover:border-purple-500/60'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Rate and Rating Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Rate Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400 whitespace-nowrap">Hourly Rate:</label>
              <select
                value={rateFilter}
                onChange={(e) => setRateFilter(e.target.value)}
                className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/60 transition-all"
              >
                <option value="all">All Rates</option>
                <option value="under50">Under $50/hr</option>
                <option value="50to150">$50–$150/hr</option>
                <option value="over150">Over $150/hr</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400 whitespace-nowrap">Rating:</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/60 transition-all"
              >
                <option value="all">All Ratings</option>
                <option value="4plus">4+ Stars</option>
                <option value="4.5plus">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8 text-gray-400">
          Showing {filteredExperts.length} expert{filteredExperts.length !== 1 ? 's' : ''}
        </div>

        {/* Experts Grid */}
        {filteredExperts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">No experts found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory(null);
                setRateFilter('all');
                setRatingFilter('all');
              }}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
