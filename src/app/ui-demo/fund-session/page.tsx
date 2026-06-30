"use client";

import React, { useState } from 'react';
import FundSessionModal from '@/components/marketplace/FundSessionModal';

export default function FundSessionDemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Session Funding Demo</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Interactive demo of the 3-step funding wizard. Select duration, confirm amount, and complete transaction via Freighter wallet.
          </p>
        </div>

        {/* Demo Section */}
        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-12">
          <div className="max-w-2xl mx-auto">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Features Demonstrated</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-purple-400">✓</span>
                  <span><strong>Duration Selection:</strong> Choose from presets (30/60/90 min) or enter custom duration</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">✓</span>
                  <span><strong>Dynamic Price Calculation:</strong> Real-time calculation based on hourly rate × duration</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">✓</span>
                  <span><strong>Confirmation Step:</strong> Review details before payment</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">✓</span>
                  <span><strong>Success State:</strong> Session ID generation and redirection</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">✓</span>
                  <span><strong>Freighter Integration Ready:</strong> Modal structure supports wallet connection</span>
                </li>
              </ul>
            </div>

            {/* Open Modal Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              Open Funding Modal
            </button>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-12 bg-black/30 border border-purple-500/20 rounded-xl p-6 overflow-x-auto">
          <p className="text-sm text-muted-foreground mb-4 font-semibold">Usage Example:</p>
          <pre className="text-xs text-muted-foreground font-mono">
{`import FundSessionModal from '@/components/marketplace/FundSessionModal';

<FundSessionModal
  expertName="Sarah Chen"
  expertHourlyRate="$50/hr"
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={(sessionId) => {
    console.log('Session funded:', sessionId);
    // Redirect to session room
  }}
/>`}
          </pre>
        </div>
      </div>

      {/* Modal Component */}
      <FundSessionModal
        expertName="Sarah Chen"
        expertHourlyRate="$50/hr"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(sessionId) => {
          console.log('Session created:', sessionId);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
