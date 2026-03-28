"use client"

import { useState } from "react"
import NotificationTabs, { NotificationTabType } from "@/components/dashboard/NotificationTabs"
import NotificationList from "@/components/dashboard/NotificationList"
import QuestionNotificationList from "@/components/dashboard/QuestionNotificationList"
import PaymentNotificationList from "@/components/dashboard/PaymentNotificationList"

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTabType>("New Learner")

  return (
    <div className="p-2 md:p-6 w-full  space-y-8">
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
          <div className="py-8 text-center text-gray-400">
            No notifications for {activeTab}.
          </div>
        )}
      </div>
    </div>
  )
}
