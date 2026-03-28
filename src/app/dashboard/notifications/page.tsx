"use client"

import { useState } from "react"
import NotificationTabs, { NotificationTabType } from "@/components/dashboard/NotificationTabs"
import NotificationList from "@/components/dashboard/NotificationList"
import QuestionNotificationList from "@/components/dashboard/QuestionNotificationList"
import PaymentNotificationList from "@/components/dashboard/PaymentNotificationList"
import AnnouncementNotificationList from "@/components/dashboard/AnnouncementNotificationList"

const mockLearnersData = [
  {
    id: "1",
    title: "Josh joined your design class",
    subtitle: "Welcome them by sending them a warm message",
    timestamp: "5 hrs ago",
  },
  {
    id: "2",
    title: "Faith joined your design class",
    subtitle: "Welcome them by sending them a warm message",
    timestamp: "1 day ago",
  },
]

const mockQuestionsData = [
  {
    id: "q1",
    timestamp: "15 mins ago",
    category: "Design",
    question: "What videos and materials can you recommend for a beginner started web design",
    avatarUrl: "/mia.svg", 
  },
  {
    id: "q2",
    timestamp: "2 hrs ago",
    category: "Development",
    question: "How do I ensure my smart contract is secure against reentrancy attacks?",
    // Without avatarUrl to test fallback
  }
]

const mockPaymentsData = [
  {
    id: "p1",
    amount: "$15",
    source: "0x411ad3c6ab...",
    timestamp: "15 mins ago"
  },
  {
    id: "p2",
    amount: "$150",
    source: "0x411ad3c6ab...",
    timestamp: "1 week ago"
  }
]

const mockAnnouncementsData = [
  {
    id: "a1",
    title: "Upcoming Learner Assessments",
    description: "Don't forget to prepare your students for the Quarterly Assessment starting Feb 10th, 2025.",
  },
  {
    id: "a2",
    title: "Policy Update",
    description: "Starting March 1st, 2025, all session reports must be submitted within 24 hours of the session.",
  }
]

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTabType>("New Learner")

  return (
    <div className="p-2 md:p-6 w-full max-w-5xl space-y-8">
      <NotificationTabs
        tabs={["New Learner", "Questions", "Payment", "Announcements"]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-8">
        {activeTab === "New Learner" && (
          <NotificationList notifications={mockLearnersData} />
        )}
        {activeTab === "Questions" && (
          <QuestionNotificationList questions={mockQuestionsData} />
        )}
        {activeTab === "Payment" && (
          <PaymentNotificationList payments={mockPaymentsData} />
        )}
        {activeTab === "Announcements" && (
          <AnnouncementNotificationList announcements={mockAnnouncementsData} />
        )}
      </div>
    </div>
  )
}
