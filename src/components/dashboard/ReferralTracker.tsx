import React, { useEffect, useState } from "react";

interface ReferralStats {
  referredExperts: number;
  totalReferrals: number;
  activeCommissions: number;
  totalEarned: number; // assuming currency amount
}

export default function ReferralTracker() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/referral/stats");
        if (!res.ok) throw new Error("Failed to fetch referral stats");
        const data = await res.json();
        setStats(data);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-400">Loading referral stats...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="mt-8 p-6 bg-white/5 backdrop-blur-lg rounded-xl shadow-lg border border-white/10">
      <h2 className="text-xl font-semibold mb-4 text-white">Referral Statistics</h2>
      <table className="w-full text-left table-auto">
        <thead className="text-gray-300">
          <tr>
            <th className="px-4 py-2">Referred Experts</th>
            <th className="px-4 py-2">Total Referrals</th>
            <th className="px-4 py-2">Active Commissions</th>
            <th className="px-4 py-2">Total Earned</th>
          </tr>
        </thead>
        <tbody className="text-white">
          <tr className="bg-white/5 hover:bg-white/10 transition">
            <td className="px-4 py-2">{stats.referredExperts}</td>
            <td className="px-4 py-2">{stats.totalReferrals}</td>
            <td className="px-4 py-2">{stats.activeCommissions}</td>
            <td className="px-4 py-2">${stats.totalEarned.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
