import { fetchDashboardData } from "@/lib/sheets";
import Dashboard from "@/components/Dashboard";

// Revalidate every 60 seconds — ensures fresh data without rebuilding
export const revalidate = 60;

export default async function Page() {
  const data = await fetchDashboardData();
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Dashboard data={data} />
      </div>
    </main>
  );
}
