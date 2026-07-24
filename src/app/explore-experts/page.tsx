"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import ExpertCard from "@/components/marketplace/ExpertCard";
import { useExperts } from "@/hooks/useExperts";
import { debounce } from "@/utils/debounce";

const EXPERTS_PER_PAGE = 12;

function ExploreExpertsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams?.get("search") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams?.get("page") ?? "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rateFilter, setRateFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setDebouncedSearch(value), 300),
    []
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncedSetSearch(value);
      setCurrentPage(1);
    },
    [debouncedSetSearch]
  );

  const updateURL = useCallback(
    (search: string, page: number) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      router.replace(`/explore-experts${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    updateURL(debouncedSearch, currentPage);
  }, [debouncedSearch, currentPage, updateURL]);

  useEffect(() => {
    const urlSearch = searchParams?.get("search") ?? "";
    const urlPage = Math.max(1, parseInt(searchParams?.get("page") ?? "1", 10) || 1);
    if (urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: experts = [], isLoading, error } = useExperts();

  const categories = useMemo(
    () => Array.from(new Set(experts.map((e) => e.category))),
    [experts]
  );

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => {
      const matchesSearch =
        expert.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        expert.category.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesCategory = !selectedCategory || expert.category === selectedCategory;

      const numericRate =
        typeof expert.hourlyRate === "number"
          ? expert.hourlyRate
          : parseFloat(String(expert.hourlyRate || 0).replace(/[^0-9.]/g, ""));
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
  }, [experts, debouncedSearch, selectedCategory, rateFilter, ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExperts.length / EXPERTS_PER_PAGE));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedExperts = useMemo(() => {
    const start = (safeCurrentPage - 1) * EXPERTS_PER_PAGE;
    return filteredExperts.slice(start, start + EXPERTS_PER_PAGE);
  }, [filteredExperts, safeCurrentPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages]
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory(null);
    setRateFilter("all");
    setRatingFilter("all");
    setCurrentPage(1);
  }, []);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

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
          <p className="text-muted-foreground text-lg max-w-2xl">
            Connect with talented professionals across various fields. Browse our
            expert community, view their profiles, and book sessions.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-12 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, category, or skill..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500/60 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setCurrentPage(1);
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === null
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-foreground"
                  : "bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 hover:border-purple-500/60"
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-foreground"
                    : "bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 hover:border-purple-500/60"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Rate and Rating Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Hourly Rate:
              </label>
              <select
                value={rateFilter}
                onChange={(e) => {
                  setRateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/60 transition-all"
              >
                <option value="all">All Rates</option>
                <option value="under50">Under $50/hr</option>
                <option value="50to150">$50–$150/hr</option>
                <option value="over150">Over $150/hr</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Rating:
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setCurrentPage(1);
                }}
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
        <div className="mb-8 text-muted-foreground">
          {isLoading && "Loading experts..."}
          {error && "Error loading experts"}
          {!isLoading &&
            !error &&
            `Showing ${filteredExperts.length} expert${filteredExperts.length !== 1 ? "s" : ""}`}
        </div>

        {/* Experts Grid */}
        {paginatedExperts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">
              No experts found matching your criteria.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {filteredExperts.length > EXPERTS_PER_PAGE && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              className="p-2 rounded-lg border border-purple-500/30 hover:border-purple-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>

            {pageNumbers.map((page, i) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-3 py-2 text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === safeCurrentPage
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-foreground"
                      : "border border-purple-500/30 hover:border-purple-500/60"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              className="p-2 rounded-lg border border-purple-500/30 hover:border-purple-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExploreExpertsPage() {
  return (
    <Suspense>
      <ExploreExpertsContent />
    </Suspense>
  );
}
