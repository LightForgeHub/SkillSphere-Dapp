"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: "session" | "payment" | "reward" | "refund";
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Bob started the session",
    description: "Session with Bob has begun. Payment streaming active.",
    timestamp: "2 mins ago",
    read: false,
    type: "session",
  },
  {
    id: "2",
    title: "Staking reward distributed",
    description: "You received 50 XLM in staking rewards.",
    timestamp: "1 hour ago",
    read: false,
    type: "reward",
  },
  {
    id: "3",
    title: "Session refund completed",
    description: "Refund of 100 XLM has been processed successfully.",
    timestamp: "1 day ago",
    read: true,
    type: "refund",
  },
  {
    id: "4",
    title: "Expert accepted your request",
    description: "Alice accepted your consultation request.",
    timestamp: "2 days ago",
    read: true,
    type: "session",
  },
];

export default function NotificationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(
    MOCK_NOTIFICATIONS.filter((n) => !n.read).length
  );

  const handleOpen = () => {
    setIsOpen(true);
    // Mark all as read when dropdown is opened
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    }, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case "session":
        return "border-blue-500/30 bg-blue-500/10";
      case "payment":
        return "border-emerald-500/30 bg-emerald-500/10";
      case "reward":
        return "border-amber-500/30 bg-amber-500/10";
      case "refund":
        return "border-violet-500/30 bg-violet-500/10";
      default:
        return "border-zinc-700 bg-zinc-800/60";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={handleClose}
          />

          <div className="absolute right-0 top-full z-20 mt-2 w-96 max-h-96 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-200">Notifications</h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-zinc-800 px-4 py-3 hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      !notification.read ? "bg-zinc-800/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {notification.type === "session" && "📞"}
                        {notification.type === "payment" && "💰"}
                        {notification.type === "reward" && "🎁"}
                        {notification.type === "refund" && "↩️"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100">
                          {notification.title}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {notification.timestamp}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-zinc-400">No notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
                <Link
                  href="/dashboard/notifications"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
