import React from "react"
import NotificationItem, { NotificationItemProps } from "./NotificationItem"

interface NotificationListProps {
  notifications: NotificationItemProps[]
}

export default function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No new learners to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-white/10">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          id={notification.id}
          title={notification.title}
          subtitle={notification.subtitle}
          timestamp={notification.timestamp}
          icon={notification.icon}
          className="py-4"
        />
      ))}
    </div>
  )
}
