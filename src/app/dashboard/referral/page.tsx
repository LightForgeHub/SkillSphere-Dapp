"use client";

import React, { useState } from "react";
import ReferralTracker from "@/components/dashboard/ReferralTracker";
import CopyButton from "@/components/ui/CopyButton";

export const metadata = {
  title: "Referral - SkillSphere",
  description: "Generate your referral link and view referral stats",
};

export default function ReferralPage() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral/link", {
        method: "POST",
      });
      const data = await res.json();
      setReferralLink(data.link);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Invite Friends & Earn Rewards</h1>
      <div className="flex items-center space-x-4">
        <button
          onClick={generateLink}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded hover:opacity-90 transition"
        >
          {loading ? "Generating…" : "Generate Referral Link"}
        </button>
        {referralLink && (
          <CopyButton
            text={referralLink}
            displayText="Copy Referral Link"
            ariaLabel="Copy referral link"
            tooltipPosition="top"
          />
        )}
      </div>
      {referralLink && (
        <p className="text-sm text-gray-300 break-all">{referralLink}</p>
      )}
      <ReferralTracker />
    </div>
  );
}
