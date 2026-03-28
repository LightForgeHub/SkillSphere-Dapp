import React from "react"
import AnnouncementNotificationItem, { AnnouncementNotificationItemProps } from "./AnnouncementNotificationItem"

interface AnnouncementNotificationListProps {
  announcements: AnnouncementNotificationItemProps[]
}

export default function AnnouncementNotificationList({ announcements }: AnnouncementNotificationListProps) {
  if (announcements.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No announcements to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {announcements.map((announcement) => (
        <AnnouncementNotificationItem
          key={announcement.id}
          {...announcement}
        />
      ))}
    </div>
  )
}
