import { AppShell } from "@/components/app-shell"
import { MonitoringContent } from "@/components/monitoring-content"

export default function MonitoringPage() {
  return (
    <AppShell title="Live Machine Monitoring" subtitle="All 25 CNC machines · PLC telemetry">
      <MonitoringContent />
    </AppShell>
  )
}
