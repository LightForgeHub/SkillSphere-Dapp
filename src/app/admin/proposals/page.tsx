import React from "react";
import ProposalVoter from "@/components/admin/ProposalVoter";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Arbitration Committee - SkillSphere",
  description: "Arbitration dispute proposals voting portal for committee members.",
};

export default function AdminProposalsPage() {
  return (
    <div className="min-h-screen bg-[#05010d] text-white">
      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-[#0B0113]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-md font-bold tracking-tight">SkillSphere Admin</h1>
              <p className="text-[10px] text-gray-400">Arbitration Committee</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-purple-400 bg-clip-text text-transparent">
            Arbitration Panel
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Review disputed sessions, inspect verdict claims, and vote/sign to execute Smart Contract releases.
          </p>
        </div>

        <div className="bg-[#0B0113]/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
          <ProposalVoter />
        </div>
      </main>
    </div>
  );
}
