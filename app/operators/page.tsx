import { AppShell } from "@/components/app-shell"
import { OperatorsContent } from "@/components/operators-content"

export default function OperatorsPage() {
  return (
    <AppShell title="Operator Mapping" subtitle="RFID-driven operator-to-machine assignment">
      <OperatorsContent />
    </AppShell>
  )
}
