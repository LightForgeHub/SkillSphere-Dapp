"use client"

import { cn } from "@/components/ui/utils"

export interface Learner {
  name: string
  course: string
  email: string
  progress: string
}

interface LearnersTableProps {
  learners?: Learner[]
  className?: string
}

const mockLearners: Learner[] = [
  {
    name: "Tony Okayi",
    course: "Product Design",
    email: "Tony@gmail.com",
    progress: "50%",
  },
  {
    name: "Flora Osatuyi",
    course: "Product Design",
    email: "Flora@gmail.com",
    progress: "20%",
  },
  {
    name: "Ejembi Benedict",
    course: "Product Design",
    email: "Ejembi@gmail.com",
    progress: "70%",
  },
  {
    name: "Sarah Johnson",
    course: "Product Design",
    email: "Sarah@gmail.com",
    progress: "85%",
  },
  {
    name: "Michael Chen",
    course: "Product Design",
    email: "Michael@gmail.com",
    progress: "45%",
  },
]

export default function LearnersTable({
  learners = mockLearners,
  className,
}: LearnersTableProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 w-full", className)}>
      {/* Mobile: Card Layout */}
      <div className="block md:hidden w-full space-y-4">
        {learners.map((learner, index) => (
          <div
            key={`${learner.email}-${index}`}
            className="bg-card rounded-lg border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Name</span>
              <span className="text-sm text-foreground">{learner.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Course</span>
              <span className="text-sm text-muted-foreground">{learner.course}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Email</span>
              <span className="text-sm text-muted-foreground">{learner.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Progress</span>
              <span className="text-sm text-foreground font-semibold">{learner.progress}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto w-full">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    Courses
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    Email Address
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-white/5">
                {learners.map((learner, index) => (
                  <tr
                    key={`${learner.email}-${index}`}
                    className="transition-colors hover:bg-accent"
                  >
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-foreground">
                      {learner.name}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground">
                      {learner.course}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground">
                      {learner.email}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-foreground font-semibold text-right">
                      {learner.progress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
