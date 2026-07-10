import { AppShell } from "@/components/app-shell"
import { DashboardContent } from "@/components/dashboard-content"

export default function DashboardPage() {
  return (
    <AppShell title="Command Dashboard" subtitle="Real-time factory overview">
      <DashboardContent />
    </AppShell>
  )
}
