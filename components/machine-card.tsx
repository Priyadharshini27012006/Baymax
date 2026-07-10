"use client"

import Link from "next/link"
import { Clock, Hammer, Package, Timer, TrendingDown, User } from "lucide-react"
import type { Machine } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { calculateUtilization } from "@/lib/oee"
import { cn } from "@/lib/utils"

function formatCycleTime(cycleTimeSeconds: number): string {
  if (cycleTimeSeconds <= 0) return "0s"
  const hours = Math.floor(cycleTimeSeconds / 3600)
  const minutes = Math.floor((cycleTimeSeconds % 3600) / 60)
  const seconds = Math.floor(cycleTimeSeconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.floor(mins % 60)
  const s = Math.floor((mins * 60) % 60)
  return `${h}h ${m}m ${s}s`
}

const GLOW: Record<Machine["status"], string> = {
  running: "hover:glow-green",
  idle: "hover:glow-amber",
  fault: "glow-red",
}

export function MachineCard({ machine }: { machine: Machine }) {
  const util = calculateUtilization(machine)
  const progress = machine.targetCount > 0 ? Math.min(100, (machine.actualCount / machine.targetCount) * 100) : 0

  return (
    <Link
      href={`/oee?machine=${machine.id}`}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl glass p-4 transition-all hover:-translate-y-0.5",
        GLOW[machine.status],
      )}
    >
      {machine.status === "running" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-running/15 to-transparent animate-scan"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold tracking-tight">{machine.machineNo}</p>
          <p className="text-[11px] text-muted-foreground">Part {machine.partNumber}</p>
        </div>
        <StatusBadge status={machine.status} />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5">
        <User className="h-3.5 w-3.5 text-accent" />
        {machine.operatorName ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{machine.operatorName}</p>
            <p className="text-[10px] text-muted-foreground">{machine.operatorId}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Unassigned</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric icon={Timer} label="Cycle" value={formatCycleTime(machine.cycleTime)} />
        <Metric icon={Clock} label="Runtime" value={fmtMins(machine.runtime)} />
        <Metric icon={TrendingDown} label="Downtime" value={fmtMins(machine.downtime)} />
        <Metric icon={Hammer} label="Util" value={`${util.toFixed(0)}%`} />
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" /> Output
          </span>
          <span className="font-medium text-foreground tabular-nums">
            {machine.actualCount} / {machine.targetCount}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress >= 90 ? "bg-running" : progress >= 60 ? "bg-accent" : "bg-idle",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px]">{label}</span>
      <span className="ml-auto font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}
