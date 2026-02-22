"use client"
import React from "react"
import { Button } from "@/components/ui/Button"

export default function QuickActions() {
  const actions = [
    { label: "Create Course", onClick: () => console.log("Create Course clicked") },
    { label: "Viewing Earnings", onClick: () => console.log("Viewing Earnings clicked") },
    { label: "Student Feedback", onClick: () => console.log("Student Feedback clicked") },
  ]

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-white mb-4">Quick Actions</h3>
      <div className="flex flex-wrap gap-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            className="bg-[#110719] border-border/50 hover:bg-white/[0.05]"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
