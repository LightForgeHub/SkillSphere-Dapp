"use client";

import { useState, useEffect } from "react";
import { Activity, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useHeartbeatPing } from "@/hooks/useHeartbeat";
import { formatTimeAgo } from "@/utils/time";

interface ExpertStatsProps {
  expertId: string;
  initialLastHeartbeat?: number | null;
}

export default function ExpertStats({
  expertId,
  initialLastHeartbeat,
}: ExpertStatsProps) {
  const { isPinging, pingError, lastHeartbeat, handlePingNow, setLastHeartbeat } =
    useHeartbeatPing(expertId);

  // Initialize with provided heartbeat, update when hook provides new value
  useEffect(() => {
    if (initialLastHeartbeat !== undefined) {
      setLastHeartbeat(initialLastHeartbeat ?? null);
    }
  }, [initialLastHeartbeat, setLastHeartbeat]);

  // STEP E: Re-render every 30 seconds to keep "X mins ago" current
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine if heartbeat is considered "fresh" (within 1 hour = 3600 seconds)
  const HEARTBEAT_VALIDITY_WINDOW = 3600; // 1 hour in seconds
  const isHeartbeatFresh =
    lastHeartbeat &&
    Math.floor((Date.now() - lastHeartbeat) / 1000) < HEARTBEAT_VALIDITY_WINDOW;

  return (
    <div className="space-y-6">
      {/* Heartbeat Status Panel */}
      <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Availability Heartbeat</h3>
            </div>

            {/* Heartbeat Status Display */}
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Last Heartbeat</span>
                  {isHeartbeatFresh && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-400">Online</span>
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatTimeAgo(lastHeartbeat)}
                </p>
                {!isHeartbeatFresh && lastHeartbeat && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Not visible in search. Send a heartbeat to stay online.
                  </p>
                )}
                {!lastHeartbeat && (
                  <p className="text-xs text-slate-400 mt-2">
                    Never sent a heartbeat. Send one to become visible in search.
                  </p>
                )}
              </div>

              {/* Heartbeat Information */}
              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Send a heartbeat to keep your profile active and visible to seekers.
                  Your heartbeat status is valid for <strong>1 hour</strong> after sending.
                  Experts without a recent heartbeat cannot accept new sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Ping Button */}
          <div className="ml-4 flex-shrink-0">
            <Button
              onClick={handlePingNow}
              disabled={isPinging}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Activity className="w-4 h-4 mr-2" />
              {isPinging ? "Pinging..." : "Ping Now"}
            </Button>
          </div>
        </div>

        {/* Error State */}
        {pingError && (
          <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400" role="alert">
              {pingError}
            </p>
          </div>
        )}
      </Card>

      {/* Online Status Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Info Card */}
        <Card
          className={`p-4 border transition-colors ${
            isHeartbeatFresh
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-slate-500/5 border-slate-500/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                isHeartbeatFresh ? "bg-emerald-400" : "bg-slate-400"
              }`}
            />
            <div>
              <p className="text-xs text-slate-400">Current Status</p>
              <p className={`font-semibold ${
                isHeartbeatFresh ? "text-emerald-400" : "text-slate-400"
              }`}>
                {isHeartbeatFresh ? "Online & Visible" : "Offline"}
              </p>
            </div>
          </div>
        </Card>

        {/* Validity Window Info Card */}
        <Card className="p-4 bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <div>
              <p className="text-xs text-slate-400">Validity Window</p>
              <p className="font-semibold text-blue-400">1 hour from send</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recommended Action */}
      {!isHeartbeatFresh && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
          <h4 className="font-semibold text-white mb-2">📌 Stay Visible</h4>
          <p className="text-sm text-slate-300 mb-3">
            Send a heartbeat regularly to maintain your visibility in the search index.
            Consider setting up automatic heartbeats to avoid going offline.
          </p>
          <Button
            onClick={handlePingNow}
            disabled={isPinging}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            {isPinging ? "Pinging..." : "Send Heartbeat Now"}
          </Button>
        </div>
      )}
    </div>
  );
}
