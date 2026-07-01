import ArbitrationPanel from "@/components/admin/ArbitrationPanel";

export const metadata = {
  title: "Dispute Arbitration | Admin Panel",
  description: "Manage and resolve disputes between seekers and experts",
};

export default function DisputesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <ArbitrationPanel />
      </div>
    </div>
  );
}
