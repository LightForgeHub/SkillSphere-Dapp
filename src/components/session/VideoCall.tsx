"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Settings, Maximize2, MessageCircle, MonitorUp } from 'lucide-react';

interface VideoCallProps {
  expertName: string;
  seekerName: string;
  expertAvatar?: string;
  seekerAvatar?: string;
  onEndCall?: () => void;
  isPictureInPicture?: boolean;
  onTogglePIP?: () => void;
}

export default function VideoCall({
  expertName,
  seekerName,
  expertAvatar,
  seekerAvatar,
  onEndCall,
  isPictureInPicture = false,
  onTogglePIP,
}: VideoCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const videoRefLocal = useRef<HTMLVideoElement>(null);
  const videoRefRemote = useRef<HTMLVideoElement>(null);

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRefLocal.current) {
          videoRefLocal.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        showToast("Screen sharing started");
        
        // Listen for the user stopping screen share via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          showToast("Screen sharing ended");
          if (videoRefLocal.current) {
             videoRefLocal.current.srcObject = null;
          }
        };
      } else {
        setIsScreenSharing(false);
        showToast("Screen sharing ended");
        if (videoRefLocal.current && videoRefLocal.current.srcObject) {
          const tracks = (videoRefLocal.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          videoRefLocal.current.srcObject = null;
        }
      }
    } catch (err) {
      console.error("Error sharing screen", err);
      showToast("Failed to share screen");
    }
  };

  if (isPictureInPicture) {
    return (
      <div className="fixed bottom-4 right-4 w-80 z-40">
        <div className="bg-black rounded-lg border border-purple-500/30 overflow-hidden shadow-2xl">
          {/* Remote Video - PIP Mode */}
          <div className="relative w-full aspect-video bg-black">
            <video
              ref={videoRefRemote}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

            {/* Local Video - Small Corner */}
            <div className="absolute bottom-2 right-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500/50 bg-black">
              <video
                ref={videoRefLocal}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>

            {/* Expert Name Overlay */}
            <div className="absolute bottom-2 left-2 text-foreground text-xs font-semibold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {expertName}
            </div>
          </div>

          {/* Minimal Controls */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-t border-purple-500/20 p-2 flex gap-2 justify-center">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-purple-600/30 rounded-lg transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="p-2 hover:bg-purple-600/30 rounded-lg transition-all"
              title={isVideoOn ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
            <button
              onClick={onTogglePIP}
              className="p-2 hover:bg-purple-600/30 rounded-lg transition-all"
              title="Expand to fullscreen"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onEndCall}
              className="p-2 hover:bg-red-600/30 rounded-lg transition-all text-red-400"
              title="End call"
            >
              <Phone size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Mode
  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* Main Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-4 md:p-6">
        {/* Remote Video (Expert) */}
        <div className="relative bg-gradient-to-br from-purple-900/20 to-black rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center group">
          <video
            ref={videoRefRemote}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />

          {/* Fallback Avatar if video unavailable */}
          {!isVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600/30 to-pink-600/30">
              <img
                src={expertAvatar}
                alt={expertName}
                className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
              />
              <p className="mt-4 text-lg font-semibold">{expertName}</p>
            </div>
          )}

          {/* Status Badge - Expert */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold text-foreground">Expert</span>
          </div>

          {/* Call Duration */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg font-mono text-foreground">
            {formatTime(callDuration)}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
        </div>

        {/* Local Video (Seeker / Screen Share) */}
        <div className="relative bg-gradient-to-br from-purple-900/20 to-black rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center">
          <video
            ref={videoRefLocal}
            className={`w-full h-full object-cover ${!isScreenSharing ? 'mirror' : ''}`}
            autoPlay
            playsInline
            muted
          />

          {/* Fallback Avatar if video unavailable and not sharing screen */}
          {(!isVideoOn && !isScreenSharing && !videoRefLocal.current?.srcObject) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600/30 to-pink-600/30">
              <img
                src={seekerAvatar}
                alt={seekerName}
                className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
              />
              <p className="mt-4 text-lg font-semibold">{seekerName}</p>
            </div>
          )}

          {/* Status Badge - Seeker */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold text-foreground">{isScreenSharing ? "Your Screen" : "You"}</span>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-purple-900/90 text-foreground px-4 py-2 rounded-full shadow-lg border border-purple-500/50 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all transform hover:scale-110 ${
              isMuted
                ? 'bg-red-600/20 border border-red-500/50 hover:bg-red-600/30'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-4 rounded-full transition-all transform hover:scale-110 ${
              !isVideoOn
                ? 'bg-red-600/20 border border-red-500/50 hover:bg-red-600/30'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            }`}
            title={isVideoOn ? 'Turn off video' : 'Turn on video'}
          >
            {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all transform hover:scale-110 ${
              isScreenSharing
                ? 'bg-blue-600/80 border border-blue-400 hover:bg-blue-600 text-white'
                : 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <MonitorUp size={24} />
          </button>

          {/* Settings */}
          <button
            className="p-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 rounded-full transition-all transform hover:scale-110 text-white"
            title="Settings"
          >
            <Settings size={24} />
          </button>

          {/* Chat */}
          <button
            className="p-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 rounded-full transition-all transform hover:scale-110 text-white"
            title="Open chat"
          >
            <MessageCircle size={24} />
          </button>

          {/* Picture in Picture */}
          <button
            onClick={onTogglePIP}
            className="p-4 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 rounded-full transition-all transform hover:scale-110 text-white"
            title="Picture in picture"
          >
            <Maximize2 size={24} />
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-4 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 rounded-full transition-all transform hover:scale-110 text-white"
            title="End call"
          >
            <Phone size={24} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
