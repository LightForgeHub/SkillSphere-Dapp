"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ExpertDetails from '@/components/profile/ExpertDetails';
import { mockExperts } from '@/utils/data/mock-data';
import { Expert } from '@/utils/types/types';

interface ExpertProfilePageProps {
  params: {
    id: string;
  };
}

export default function ExpertProfilePage({ params }: ExpertProfilePageProps) {
  const router = useRouter();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Simulate fetching expert data
    const expertId = params.id;
    const foundExpert = mockExperts.find((e) => e.id === expertId);

    if (foundExpert) {
      setExpert(foundExpert);
      setLoading(false);
    } else {
      setError('Expert not found');
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-pink-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400">Loading expert profile...</p>
        </div>
      </div>
    );
  }

  if (error || !expert) {
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
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Expert Not Found</h1>
          <p className="text-gray-400 text-lg mb-8">{error || 'The expert you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/explore-experts')}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all duration-300"
          >
            Back to Experts
          </button>
        </div>
      </div>
    );
  }

  const handleBookClick = () => {
    if (expert.is_busy) return;
    // Store expert info for the booking flow and navigate to marketplace
    sessionStorage.setItem('selectedExpertId', expert.id);
    sessionStorage.setItem('selectedExpertName', expert.name);
    router.push('/marketplace?action=book&expertId=' + expert.id);
  };

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
      <ExpertDetails expert={expert} onBookClick={handleBookClick} />
    </div>
  );
}
