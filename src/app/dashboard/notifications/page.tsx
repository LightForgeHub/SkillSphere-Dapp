"use client"

import { useState } from "react"
import NotificationTabs, { NotificationTabType } from "@/components/dashboard/NotificationTabs"
import NotificationList from "@/components/dashboard/NotificationList"

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTabType>("New Learner")

  // Mock handling: Only New Learner has data for now
  const notifications = activeTab === "New Learner" ? mockLearnersData : []

  return (
    <div className="p-2 md:p-6 w-full max-w-5xl space-y-8">
      <NotificationTabs
        tabs={["New Learner", "Questions", "Payment", "Announcements"]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-8">
        <NotificationList notifications={notifications} />
      </div>
    </div>
  )
}
