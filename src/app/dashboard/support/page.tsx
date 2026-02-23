"use client"
import React from "react"
import { SupportAccordion, FAQItem } from "@/components/dashboard/SupportAccordion"

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
        <p>Your earnings are tracked in real-time. Here's what you need to know:</p>
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

export default function SupportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Support & FAQ</h1>
        <p className="mt-2 text-slate-400">
          Need help? Browse our frequently asked questions or contact our support team.
        </p>
      </div>

      <div className="max-w-[1030px]">
        <SupportAccordion items={FAQ_ITEMS} />
      </div>

      <div className="pt-6 border-t border-[#2D2E2D]">
        <h3 className="text-lg font-medium text-white">Still need help?</h3>
        <p className="mt-2 text-slate-400">
          If you can't find what you're looking for, our support team is available 24/7.
        </p>
        <button className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
          Contact Support
        </button>
      </div>
    </div>
  )
}
