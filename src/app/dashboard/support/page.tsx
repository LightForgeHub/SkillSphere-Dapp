"use client"
import React, { useMemo, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { SupportAccordion, FAQItem } from "@/components/dashboard/SupportAccordion"
import { AppealFormModal } from "@/components/session/AppealForm"
import { mockSessions } from "@/utils/data/mock-data"
import { formatDate } from "@/utils/time"
import { useSandboxWallet } from "@/providers/WalletProvider"
import type { Dispute } from "../../../../utils/types/types"

const reviewedSessions = mockSessions.filter((s) => s.status === "completed")

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "course-creation",
    title: "Course Creation Guide",
    subtitle: "How to structure, upload, and edit courses",
    content: (
      <div className="space-y-4">
        <p>Learn how to create high-quality courses that engage students. This guide covers:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Structuring your curriculum for maximum impact</li>
          <li>Technical requirements for video and document uploads</li>
          <li>Using the built-in editor to refine your content</li>
          <li>Best practices for course metadata and thumbnails</li>
        </ul>
      </div>
    ),
  },
  {
    id: "earnings-payments",
    title: "Earnings & Payments",
    subtitle: "How earnings are calculated & withdrawal process",
    content: (
      <div className="space-y-4">
        <p>Your earnings are tracked in real-time. Here&apos;s what you need to know:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Earnings distribution based on student enrollments and engagement</li>
          <li>Withdrawal options including directly to your blockchain wallet</li>
          <li>Monthly reporting and tax documentation</li>
          <li>Escrow status for on-chain transactions</li>
        </ul>
      </div>
    ),
  },
  {
    id: "student-engagement",
    title: "Student Engagement Tips",
    subtitle: "How to improve student interaction & ratings",
    content: (
      <div className="space-y-4">
        <p>Keep your students motivated and improve your course ratings:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Participating in course discussion forums</li>
          <li>Setting up automated feedback systems</li>
          <li>Creating interactive quizzes and assignments</li>
          <li>Responding to student reviews and queries promptly</li>
        </ul>
      </div>
    ),
  },
  {
    id: "technical-issues",
    title: "Technical Issues",
    subtitle: "Troubleshooting course uploads, media files, etc.",
    content: (
      <div className="space-y-4">
        <p>Encountering glitches? Check these common solutions:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supported video formats and bitrate recommendations</li>
          <li>Browser compatibility and cache clearing</li>
          <li>Large file upload optimization tips</li>
          <li>Contacting our technical support team for priority issues</li>
        </ul>
      </div>
    ),
  },
  {
    id: "blockchain-help",
    title: "Blockchain Integration Help",
    subtitle: "Understanding on-chain payments & certifications",
    content: (
      <div className="space-y-4">
        <p>SkillSphere leverages blockchain for transparency and trust:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Setting up your Stellar wallet for seamless payments</li>
          <li>How on-chain course completion certificates work</li>
          <li>Verifying transactions on Stellar Expert</li>
          <li>Understanding smart contract interactions for course access</li>
        </ul>
      </div>
    ),
  },
]

/** Support & FAQ page with reviewed-session appeal entry points. */
export default function SupportPage() {
  const [appealDispute, setAppealDispute] = useState<Dispute | null>(null);
  const { activeMockProfile } = useSandboxWallet();

  // The dApp has no production role context yet; the dev-only mock profile is
  // the sole role source. Defaults to "seeker" for real wallets until an auth
  // role lands â€” ArbitrationPanel maps the claimant slot correctly either way.
  const claimantRole: "seeker" | "expert" =
    activeMockProfile?.role === "expert" ? "expert" : "seeker";

  const appealChoices = useMemo(
    () =>
      reviewedSessions.map<Dispute>((session) => ({
        id: `disputable-${session.id}`,
        sessionId: session.id,
        raisedBy: claimantRole,
        reason:
          session.expertName
            ? `Dispute claim for the reviewed session "${session.title}" with ${session.expertName}.`
            : `Dispute claim for the reviewed session "${session.title}".`,
        status: "resolved",
        evidence: [],
        createdAt: new Date(`${session.date}T00:00:00Z`).toISOString(),
      })),
    [claimantRole]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Support & FAQ</h1>
        <p className="mt-2 text-slate-400">
          Need help? Browse our frequently asked questions or contact our support team.
        </p>
      </div>

      {/* Dispute an appeal for reviewed sessions */}
      {appealChoices.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground">Your Reviewed Sessions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Submit a dispute claim for a session that was reviewed but did not meet expectations.
          </p>
          <div className="mt-4 grid gap-3">
            {reviewedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(`${session.date}T00:00:00Z`)} Â· {session.duration} Â· with {session.expertName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const match = appealChoices.find((d) => d.sessionId === session.id);
                    if (match) setAppealDispute(match);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/10 transition-colors"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Appeal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full">
        <SupportAccordion items={FAQ_ITEMS} />
      </div>

      <div className="pt-6 border-t border-[#2D2E2D]">
        <h3 className="text-lg font-medium text-foreground">Still need help?</h3>
        <p className="mt-2 text-slate-400">
          If you can&apos;t find what you&apos;re looking for, our support team is available 24/7.
        </p>
        <button className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-colors">
          Contact Support
        </button>
      </div>

      {appealDispute && (
        <AppealFormModal
          isOpen={true}
          onClose={() => setAppealDispute(null)}
          dispute={appealDispute}
          sessionTitle={
            reviewedSessions.find((s) => s.id === appealDispute.sessionId)?.title ?? "Session"
          }
          onAppealSubmitted={() => undefined}
        />
      )}
    </div>
  )
}
