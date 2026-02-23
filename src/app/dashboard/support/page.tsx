import SupportTable from "@/components/dashboard/SupportTable"

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Blockchain Integration Help (Understanding on-chain payments & certifications)
        </h2>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-300">Action History Table</h3>
        <SupportTable />
      </div>
    </div>
  )
}
