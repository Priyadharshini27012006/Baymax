import { AppShell } from "@/components/app-shell"
import { ReportsContent } from "@/components/reports-content"

export default function ReportsPage() {
  return (
    <AppShell title="Reports" subtitle="Production, utilization & OEE — export ready">
      <ReportsContent />
    </AppShell>
  )
}
