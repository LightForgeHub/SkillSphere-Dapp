import { CreateCourseCTA } from "@/components/dashboard/CreateCourseCTA";

export default function CoursesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-border/50">
        <div>
          <h2 className="text-2xl font-bold">Courses</h2>
          <p className="mt-1 text-slate-400">Create, edit, and manage courses here.</p>
        </div>
      </div>

      <CreateCourseCTA />
    </div>
  )
}

