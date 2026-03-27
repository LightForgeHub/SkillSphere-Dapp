import LearnersTable from "@/components/dashboard/LearnersTable"
import LearnerReviews from "@/components/dashboard/LearnerReviews"

export default function LearnersPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* Section 1: Learners Table */}
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-white">Learners</h1>
        <LearnersTable />
      </section>

      {/* Section 2: Learners Reviews */}
      <section className="flex flex-col gap-4">
        <LearnerReviews />
      </section>
    </div>
  )
}
