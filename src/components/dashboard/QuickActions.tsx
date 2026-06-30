"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function QuickActions() {
  const router = useRouter()
  const actions = [
    { label: "Create Course", onClick: () => router.push("/dashboard/courses/create") },
    { label: "Viewing Earnings", onClick: () => console.log("Viewing Earnings clicked") },
    { label: "Student Feedback", onClick: () => console.log("Student Feedback clicked") },
  ]

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
      <div className="flex flex-wrap gap-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            className="bg-card border-border/50 hover:bg-accent"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
