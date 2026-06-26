"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoCall from '@/components/session/VideoCall';
import { mockSessions, mockExperts } from '@/utils/data/mock-data';

interface SessionPageProps {
  params: {
    id: string;
  };
}

export default function SessionPage({ params }: SessionPageProps) {
  const router = useRouter();
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  // Find session and expert from mock data
  const session = mockSessions.find((s) => s.id === params.id);
  const expert = session ? mockExperts.find((e) => e.id === session.expertId) : null;

  if (!session || !expert) {
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
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Session Not Found</h1>
          <p className="text-gray-400 text-lg mb-8">The session you are looking for does not exist or has ended.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleEndCall = () => {
    setIsSessionEnded(true);
    // Simulate session ending
    setTimeout(() => {
      router.push(`/dashboard?sessionId=${params.id}&status=completed`);
    }, 2000);
  };

  if (isSessionEnded) {
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
          <div className="inline-block mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full p-8">
                <svg
                  className="w-24 h-24 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Session Ended
          </h1>
          <p className="text-gray-400 text-lg mb-8">Thank you for the session with {expert.name}. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      {!isPictureInPicture && (
        <div className="h-screen">
          <VideoCall
            expertName={expert.name}
            seekerName={session.seekerName || 'You'}
            expertAvatar={expert.avatar}
            seekerAvatar={session.seekerAvatar}
            onEndCall={handleEndCall}
            isPictureInPicture={isPictureInPicture}
            onTogglePIP={() => setIsPictureInPicture(!isPictureInPicture)}
          />
        </div>
      )}

      {isPictureInPicture && (
        <div className="w-full h-screen bg-gradient-to-br from-purple-900/20 to-black flex flex-col">
          {/* Session Information Panel */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-8">
              {/* Session Header */}
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">Active Session</h1>
                <p className="text-gray-400">{session.title}</p>
              </div>

              {/* Expert and Seeker Info */}
              <div className="grid grid-cols-2 gap-8">
                {/* Expert */}
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6 text-center">
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-purple-500/50"
                  />
                  <h3 className="text-xl font-bold mb-2">Expert</h3>
                  <p className="font-semibold text-purple-400">{expert.name}</p>
                  <p className="text-sm text-gray-400 mt-2">{expert.category}</p>
                </div>

                {/* Seeker */}
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6 text-center">
                  <img
                    src={session.seekerAvatar}
                    alt={session.seekerName}
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-purple-500/50"
                  />
                  <h3 className="text-xl font-bold mb-2">You (Seeker)</h3>
                  <p className="font-semibold text-purple-400">{session.seekerName || 'You'}</p>
                  <p className="text-sm text-gray-400 mt-2">Learning</p>
                </div>
              </div>

              {/* Session Details */}
              <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Session Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration</span>
                    <span className="font-semibold">{session.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate</span>
                    <span className="font-semibold">{session.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category</span>
                    <span className="font-semibold">{session.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PIP Video Call - Floating */}
          <VideoCall
            expertName={expert.name}
            seekerName={session.seekerName || 'You'}
            expertAvatar={expert.avatar}
            seekerAvatar={session.seekerAvatar}
            onEndCall={handleEndCall}
            isPictureInPicture={isPictureInPicture}
            onTogglePIP={() => setIsPictureInPicture(!isPictureInPicture)}
          />
        </div>
      )}
    </div>
  );
}
