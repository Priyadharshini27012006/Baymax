"use client"

import { AppShell } from "@/components/app-shell"
import { OeeContent } from "@/components/oee-content"
import { Suspense } from "react"

export default function OeePage() {
  return (
    <AppShell title="Machine OEE Details" subtitle="Availability · Performance · Quality">
      <Suspense fallback={
        <div className="text-sm text-muted-foreground">Loading machine data...</div>
      }>
        <OeeContent />
      </Suspense>
    </AppShell>
  )
}