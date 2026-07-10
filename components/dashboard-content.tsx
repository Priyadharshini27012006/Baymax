"use client"

import {
  Activity,
  AlertTriangle,
  Factory,
  PauseCircle,
  PlayCircle,
  Users,
  Package,
  Gauge as GaugeIcon,
  UsersRound,
} from "lucide-react"
import { useFactory } from "@/components/factory-provider"
import { KpiCard } from "@/components/kpi-card"
import { Panel } from "@/components/panel"
import {
  OeeComparisonChart,
  ProductionTrendChart,
  StatusDistributionChart,
} from "@/components/dashboard-charts"
import { averageOee, averageUtilization } from "@/lib/oee"
import { cn } from "@/lib/utils"

export function DashboardContent() {
  const { machines, operators, trend, alerts } = useFactory()

  const running = machines.filter((m) => m.status === "running").length
  const idle = machines.filter((m) => m.status === "idle").length
  const fault = machines.filter((m) => m.status === "fault").length
  const activeOperators = operators.filter((o) => o.loggedIn).length
  const productionToday = machines.reduce((acc, m) => acc + m.actualCount, 0)
  const utilization = averageUtilization(machines)
  const avgOee = averageOee(machines)
  const manMachineRatio = running > 0 ? activeOperators / running : 0

  const legend = [
    { label: "Running", value: running, color: "bg-running" },
    { label: "Idle", value: idle, color: "bg-idle" },
    { label: "Fault", value: fault, color: "bg-fault" },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Active Operators" value={activeOperators} icon={Users} accent="cyan" hint="RFID logged-in" />
        <KpiCard label="Total Machines" value={machines.length} icon={Factory} accent="primary" />
        <KpiCard label="Running" value={running} icon={PlayCircle} accent="running" />
        <KpiCard label="Idle" value={idle} icon={PauseCircle} accent="idle" />
        <KpiCard label="Fault" value={fault} icon={AlertTriangle} accent="fault" />
        <KpiCard label="Production Today" value={productionToday.toLocaleString()} unit="pcs" icon={Package} accent="cyan" />
        <KpiCard label="Utilization" value={utilization.toFixed(1)} unit="%" icon={Activity} accent="primary" />
        <KpiCard label="Average OEE" value={avgOee.toFixed(1)} unit="%" icon={GaugeIcon} accent="running" />
        <KpiCard
          label="Man-Machine Ratio"
          value={manMachineRatio.toFixed(2)}
          icon={UsersRound}
          accent="cyan"
          hint={`${activeOperators} ops ÷ ${running} running`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Production Trend" description="Output vs target (live)" className="xl:col-span-2">
          <ProductionTrendChart data={trend} />
        </Panel>

        <Panel title="Machine Status Distribution">
          <StatusDistributionChart machines={machines} />
          <div className="mt-3 flex items-center justify-center gap-4">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", l.color)} />
                {l.label} <span className="font-medium text-foreground">{l.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="OEE Comparison" description="Per-machine OEE %" className="xl:col-span-2">
          <OeeComparisonChart machines={machines} />
        </Panel>

        <Panel title="Live Alerts" description="Real-time PLC events">
          <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1">
            {alerts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Monitoring… no active alerts.</p>
            )}
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-secondary/40 p-2.5",
                  a.severity === "fault"
                    ? "border-fault/30"
                    : a.severity === "idle"
                      ? "border-idle/30"
                      : "border-running/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                    a.severity === "fault" ? "bg-fault" : a.severity === "idle" ? "bg-idle" : "bg-running",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{a.machineNo}</p>
                    <span className="text-[10px] text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}