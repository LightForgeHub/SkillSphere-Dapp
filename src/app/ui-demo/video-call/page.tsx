"use client";

import React, { useState } from 'react';
import VideoCall from '@/components/session/VideoCall';

export default function VideoCallDemoPage() {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleEndCall = () => {
    alert('Call ended! (Demo only)');
  };

  return (
    <div className="w-full">
      {isFullScreen ? (
        <div className="fixed inset-0 z-50">
          <VideoCall
            expertName="Alex Kumar"
            seekerName="You"
            expertAvatar="/assets/Avatar.svg"
            seekerAvatar="/assets/Avatar.svg"
            onEndCall={() => setIsFullScreen(false)}
            isPictureInPicture={isPictureInPicture}
            onTogglePIP={() => setIsPictureInPicture(!isPictureInPicture)}
          />
        </div>
      ) : (
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
              <h1 className="text-5xl md:text-6xl font-bold mb-4">WebRTC Video Call Demo</h1>
              <p className="text-gray-400 text-lg max-w-2xl">
                Interactive video call layout with split-screen display, mute/video controls, and picture-in-picture support.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Full-Screen Mode</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Responsive 1 or 2 column grid layout</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Audio & video mute toggle buttons</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Call duration timer</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Settings and chat access</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>End call button</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Picture-in-Picture Mode</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Floating compact video window</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Local video in corner</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Minimal controls at bottom</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Expand to fullscreen option</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Stay visible while browsing content</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-8 mb-12">
              <h2 className="text-2xl font-bold mb-6">Interactive Preview</h2>
              <div className="bg-black rounded-lg overflow-hidden border border-purple-500/30 aspect-video mb-6">
                <div className="w-full h-full relative flex items-center justify-center">
                  <div className="text-center text-gray-400 space-y-4">
                    <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p>Video Preview (Responsive Layout)</p>
                    <p className="text-xs">Click "Enter Full Screen" to see the actual video component</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsFullScreen(true)}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Enter Full Screen Video Demo
              </button>
            </div>

            {/* Code Example */}
            <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6 overflow-x-auto">
              <p className="text-sm text-gray-400 mb-4 font-semibold">Usage Example:</p>
              <pre className="text-xs text-gray-300 font-mono">
{`import VideoCall from '@/components/session/VideoCall';

<VideoCall
  expertName="Alex Kumar"
  seekerName="You"
  expertAvatar="/assets/Avatar.svg"
  seekerAvatar="/assets/Avatar.svg"
  onEndCall={() => console.log('Call ended')}
  isPictureInPicture={false}
  onTogglePIP={() => togglePIP()}
/>`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
