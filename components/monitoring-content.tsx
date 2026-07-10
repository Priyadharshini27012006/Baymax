"use client"

import { useState } from "react"
import { useFactory } from "@/components/factory-provider"
import { MachineCard } from "@/components/machine-card"
import type { MachineStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type Filter = "all" | MachineStatus

export function MonitoringContent() {
  const { machines } = useFactory()
  const [filter, setFilter] = useState<Filter>("all")

  const counts = {
    all: machines.length,
    running: machines.filter((m) => m.status === "running").length,
    idle: machines.filter((m) => m.status === "idle").length,
    fault: machines.filter((m) => m.status === "fault").length,
  }

  const filtered = filter === "all" ? machines : machines.filter((m) => m.status === filter)

  const filters: { key: Filter; label: string; active: string }[] = [
    { key: "all", label: "All", active: "bg-primary/15 text-primary border-primary/40" },
    { key: "running", label: "Running", active: "bg-running/15 text-running border-running/40" },
    { key: "idle", label: "Idle", active: "bg-idle/15 text-idle border-idle/40" },
    { key: "fault", label: "Fault", active: "bg-fault/15 text-fault border-fault/40" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? f.active : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label} <span className="ml-1 opacity-80">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((m) => (
          <MachineCard key={m.id} machine={m} />
        ))}
      </div>
    </div>
  )
}
