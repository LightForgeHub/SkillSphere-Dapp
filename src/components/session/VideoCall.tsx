"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Settings, Maximize2, MessageCircle, MonitorUp, Loader2 } from 'lucide-react';

interface VideoCallProps {
  expertName: string;
  seekerName: string;
  expertAvatar?: string;
  seekerAvatar?: string;
  onEndCall?: () => void;
  isPictureInPicture?: boolean;
  onTogglePIP?: () => void;
  sessionId?: string;
  role?: "seeker" | "expert";
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export default function VideoCall({
  expertName,
  seekerName,
  expertAvatar = "",
  seekerAvatar = "",
  onEndCall,
  isPictureInPicture = false,
  onTogglePIP,
  sessionId = "default",
  role = "seeker",
}: VideoCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // WebRTC & Peer States
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(true);
  const [isRemoteAudioOn, setIsRemoteAudioOn] = useState(true);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);

  const videoRefLocal = useRef<HTMLVideoElement>(null);
  const videoRefRemote = useRef<HTMLVideoElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignalTimeRef = useRef<number>(0);
  const isReconnectingRef = useRef<boolean>(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Post signals to Next.js API endpoint
  const sendSignal = useCallback(async (type: "offer" | "answer" | "candidate" | "status", data: any) => {
    try {
      await fetch(`/api/session/${sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: role,
          type,
          data,
        }),
      });
    } catch (err) {
      console.error("Failed to send signaling message:", err);
    }
  }, [sessionId, role]);

  // Clean up WebRTC peer connection and streams
  const cleanupConnection = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (videoRefLocal.current) {
      videoRefLocal.current.srcObject = null;
    }
    if (videoRefRemote.current) {
      videoRefRemote.current.srcObject = null;
    }

    remoteStreamRef.current = null;
    setIsRemoteConnected(false);
  }, []);

  // Initialize a WebRTC Connection
  const initializeConnection = useCallback(async () => {
    try {
      // 1. Acquire Local Camera and Mic
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.warn("Could not access camera/microphone. Using fallback empty streams.", err);
        showToast("Device warning: Camera/Microphone not accessible.");
        // Fallback: Create silent audio track & blank video track if media unavailable
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, 640, 480);
        }
        const videoTrack = (canvas as any).captureStream?.(25)?.getVideoTracks()[0] || null;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const dst = audioContext.createMediaStreamDestination();
        oscillator.connect(dst);
        const audioTrack = dst.stream.getAudioTracks()[0] || null;
        
        const tracks = [];
        if (videoTrack) tracks.push(videoTrack);
        if (audioTrack) tracks.push(audioTrack);
        localStream = new MediaStream(tracks);
      }

      localStreamRef.current = localStream;
      if (videoRefLocal.current) {
        videoRefLocal.current.srcObject = localStream;
      }

      // Apply initial mute/video toggle settings
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      localStream.getVideoTracks().forEach(t => t.enabled = isVideoOn);

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
      peerConnectionRef.current = pc;

      // 3. Add tracks to Connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // 4. Handle Remote Track
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setIsRemoteConnected(true);
          if (videoRefRemote.current) {
            videoRefRemote.current.srcObject = event.streams[0];
          }
        }
      };

      // 5. Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("candidate", event.candidate);
        }
      };

      // 6. Monitor Connection State
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if (pc.connectionState === "connected") {
          setIsRemoteConnected(true);
          isReconnectingRef.current = false;
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setIsRemoteConnected(false);
          handleReconnect();
        }
      };

      // 7. Seeker Initiates Offer
      if (role === "seeker") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
      }

      // 8. Start Signaling Polling Loop
      startPolling();

      // Publish initial state status
      sendSignal("status", { video: isVideoOn, audio: !isMuted });

    } catch (err) {
      console.error("Failed to initialize connection:", err);
      showToast("WebRTC connection failed. Retrying...");
      handleReconnect();
    }
  }, [role, isMuted, isVideoOn, sendSignal, showToast]);

  // Polling Loop for Signals
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/session/${sessionId}/signal?role=${role}&since=${lastSignalTimeRef.current}`
        );
        if (!response.ok) return;

        const { signals } = await response.json();
        if (!signals || signals.length === 0) return;

        const pc = peerConnectionRef.current;
        if (!pc) return;

        for (const sig of signals) {
          lastSignalTimeRef.current = Math.max(lastSignalTimeRef.current, sig.timestamp);

          if (sig.type === "offer" && role === "expert") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("answer", answer);
          } else if (sig.type === "answer" && role === "seeker") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
          } else if (sig.type === "candidate") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            } catch (e) {
              console.warn("Error adding ICE candidate:", e);
            }
          } else if (sig.type === "status") {
            setIsRemoteVideoOn(sig.data.video);
            setIsRemoteAudioOn(sig.data.audio);
          }
        }
      } catch (err) {
        console.error("Error in signaling polling:", err);
      }
    }, 1000);
  }, [sessionId, role, sendSignal]);

  // Reconnection Logic on Drop
  const handleReconnect = useCallback(async () => {
    if (isReconnectingRef.current) return;
    isReconnectingRef.current = true;
    showToast("Connection dropped. Reconnecting...");

    // Clean connection references, but preserve local track if possible
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsRemoteConnected(false);

    // Short backoff delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Re-initialize WebRTC connection
    initializeConnection();
  }, [initializeConnection, showToast]);

  // Initial mount setup
  useEffect(() => {
    initializeConnection();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      cleanupConnection();
    };
  }, [initializeConnection, cleanupConnection]);

  // Handle Mute/Unmute Mic Toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    sendSignal("status", { video: isVideoOn, audio: !nextMuted });
  };

  // Handle Camera On/Off Toggle
  const toggleVideo = () => {
    const nextVideoOn = !isVideoOn;
    setIsVideoOn(nextVideoOn);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextVideoOn;
      });
    }
    sendSignal("status", { video: nextVideoOn, audio: !isMuted });
  };

  // Handle Screen Sharing
  const toggleScreenShare = async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        showToast("Screen sharing started");

        const screenTrack = stream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        // Display local screen stream in preview
        if (videoRefLocal.current) {
          videoRefLocal.current.srcObject = stream;
        }

        // Listen for screen sharing stop via browser UI
        screenTrack.onended = async () => {
          setIsScreenSharing(false);
          showToast("Screen sharing ended");
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            if (sender && camTrack) {
              await sender.replaceTrack(camTrack);
            }
            if (videoRefLocal.current) {
              videoRefLocal.current.srcObject = localStreamRef.current;
            }
          }
        };
      } else {
        setIsScreenSharing(false);
        showToast("Screen sharing ended");
        if (localStreamRef.current && videoRefLocal.current) {
          const camTrack = localStreamRef.current.getVideoTracks()[0];
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender && camTrack) {
            await sender.replaceTrack(camTrack);
          }
          videoRefLocal.current.srcObject = localStreamRef.current;
        }
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
      showToast("Failed to share screen");
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLocalUserExpert = role === "expert";
  const remoteUserName = isLocalUserExpert ? seekerName : expertName;
  const remoteUserAvatar = isLocalUserExpert ? seekerAvatar : expertAvatar;

  // PICTURE-IN-PICTURE LAYOUT
  if (isPictureInPicture) {
    return (
      <div className="fixed bottom-4 right-4 w-80 z-40">
        <div className="bg-black rounded-lg border border-purple-500/30 overflow-hidden shadow-2xl">
          {/* Remote Video - PIP Mode */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            {isRemoteConnected && isRemoteVideoOn ? (
              <video
                ref={videoRefRemote}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/60 to-pink-900/60">
                <img
                  src={remoteUserAvatar || "/assets/Avatar.svg"}
                  alt={remoteUserName}
                  className="w-16 h-16 rounded-full border-2 border-purple-500/50 object-cover"
                />
                <p className="mt-2 text-xs font-semibold text-foreground/80">{remoteUserName}</p>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>

            {/* Local Video - Small Corner */}
            <div className="absolute bottom-2 right-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500/50 bg-black">
              {isVideoOn ? (
                <video
                  ref={videoRefLocal}
                  className={`w-full h-full object-cover ${!isScreenSharing ? 'scale-x-[-1]' : ''}`}
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-950">
                  <span className="text-[10px] text-purple-300">You</span>
                </div>
              )}
            </div>

            {/* Remote Name Overlay */}
            <div className="absolute bottom-2 left-2 text-foreground text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded">
              <div className={`w-1.5 h-1.5 rounded-full ${isRemoteConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
              {remoteUserName}
            </div>
          </div>

          {/* Minimal Controls */}
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-t border-purple-500/20 p-2 flex gap-2 justify-center">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-all ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-purple-300 hover:bg-purple-500/20'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-lg transition-all ${!isVideoOn ? 'text-red-400 bg-red-500/10' : 'text-purple-300 hover:bg-purple-500/20'}`}
              title={isVideoOn ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
            <button
              onClick={onTogglePIP}
              className="p-2 text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all"
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

  // FULL DISPLAY LAYOUT
  return (
    <div className="w-full h-full bg-[#0d0d0d] relative overflow-hidden flex flex-col justify-between">
      {/* Top Header Information Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-purple-500/20 pointer-events-auto">
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center`}>
            {connectionState === "connected" ? (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
            )}
          </div>
          <span className="font-semibold text-xs text-foreground/90 capitalize">
            {connectionState === "connected" ? "Connected" : `WebRTC: ${connectionState}`}
          </span>
        </div>

        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-purple-500/20 font-mono text-xs text-foreground/90 pointer-events-auto">
          {formatTime(callDuration)}
        </div>
      </div>

      {/* Main Video View Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 pt-16">
        {/* Remote Video Frame */}
        <div className="relative bg-gradient-to-br from-purple-950/20 to-black rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center group shadow-xl">
          {isRemoteConnected && isRemoteVideoOn ? (
            <video
              ref={videoRefRemote}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/40 to-black/80">
              <img
                src={remoteUserAvatar || "/assets/Avatar.svg"}
                alt={remoteUserName}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-purple-500/30 object-cover shadow-2xl"
              />
              <p className="mt-4 text-base font-semibold text-purple-200">{remoteUserName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {!isRemoteConnected ? "Waiting for peer to join..." : "Camera is off"}
              </p>
            </div>
          )}

          {/* User Name Tag */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/20">
            <span className="text-xs font-semibold text-foreground/90">
              {remoteUserName} {!isRemoteAudioOn && "(Muted)"}
            </span>
          </div>
        </div>

        {/* Local Video Frame */}
        <div className="relative bg-gradient-to-br from-purple-950/20 to-black rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center shadow-xl">
          {isVideoOn ? (
            <video
              ref={videoRefLocal}
              className={`w-full h-full object-cover ${!isScreenSharing ? 'scale-x-[-1]' : ''}`}
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/40 to-black/80">
              <img
                src={isLocalUserExpert ? expertAvatar || "/assets/Avatar.svg" : seekerAvatar || "/assets/Avatar.svg"}
                alt="You"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-purple-500/30 object-cover shadow-2xl"
              />
              <p className="mt-4 text-base font-semibold text-purple-200">You (Local)</p>
              <p className="text-xs text-muted-foreground mt-1">Camera is off</p>
            </div>
          )}

          {/* User Name Tag */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/20">
            <span className="text-xs font-semibold text-foreground/90">
              {isScreenSharing ? "Your Screen" : "You"} {isMuted && "(Muted)"}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-purple-900/90 text-foreground px-4 py-2 rounded-full shadow-lg border border-purple-500/50 text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 shrink-0">
        <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
          {/* Audio Toggle */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full transition-all transform hover:scale-105 border ${
              isMuted
                ? 'bg-red-600/20 border-red-500/50 hover:bg-red-600/30 text-red-400'
                : 'bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30 text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-full transition-all transform hover:scale-105 border ${
              !isVideoOn
                ? 'bg-red-600/20 border-red-500/50 hover:bg-red-600/30 text-red-400'
                : 'bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30 text-white'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-full transition-all transform hover:scale-105 border ${
              isScreenSharing
                ? 'bg-blue-600/20 border-blue-400/50 hover:bg-blue-600/30 text-blue-400'
                : 'bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30 text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <MonitorUp size={20} />
          </button>

          {/* Settings (Placeholder) */}
          <button
            className="p-3.5 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 rounded-full transition-all transform hover:scale-105 text-white"
            title="Device settings"
          >
            <Settings size={20} />
          </button>

          {/* Picture in Picture */}
          <button
            onClick={onTogglePIP}
            className="p-3.5 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 rounded-full transition-all transform hover:scale-105 text-white"
            title="Toggle picture-in-picture"
          >
            <Maximize2 size={20} />
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-3.5 bg-red-600/25 border border-red-500/60 hover:bg-red-600/40 rounded-full transition-all transform hover:scale-105 text-red-400"
            title="Leave room"
          >
            <Phone size={20} className="rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}
