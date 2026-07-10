"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Machine } from "@/lib/types"
import { calculateOee } from "@/lib/oee"

interface TrendPoint {
  hour: string
  output: number
  target: number
}

const trendConfig: ChartConfig = {
  output: { label: "Output", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-2)" },
}

export function ProductionTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-output)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-output)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillTarget" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-target)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-target)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="target"
          type="monotone"
          stroke="var(--color-target)"
          fill="url(#fillTarget)"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <Area
          dataKey="output"
          type="monotone"
          stroke="var(--color-output)"
          fill="url(#fillOutput)"
          strokeWidth={2.5}
        />
      </AreaChart>
    </ChartContainer>
  )
}

const statusConfig: ChartConfig = {
  count: { label: "Machines" },
  running: { label: "Running", color: "var(--running)" },
  idle: { label: "Idle", color: "var(--idle)" },
  fault: { label: "Fault", color: "var(--fault)" },
}

export function StatusDistributionChart({ machines }: { machines: Machine[] }) {
  const counts = machines.reduce(
    (acc, m) => {
      acc[m.status] += 1
      return acc
    },
    { running: 0, idle: 0, fault: 0 } as Record<string, number>,
  )
  const data = [
    { name: "running", value: counts.running, fill: "var(--running)" },
    { name: "idle", value: counts.idle, fill: "var(--idle)" },
    { name: "fault", value: counts.fault, fill: "var(--fault)" },
  ]

  return (
    <ChartContainer config={statusConfig} className="mx-auto aspect-square h-[260px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

const oeeConfig: ChartConfig = {
  oee: { label: "OEE %", color: "var(--chart-1)" },
}

export function OeeComparisonChart({ machines }: { machines: Machine[] }) {
  const data = machines.slice(0, 12).map((m) => ({
    machine: m.machineNo.replace("CNC-", "M"),
    oee: Number(calculateOee(m).oee.toFixed(1)),
  }))

  return (
    <ChartContainer config={oeeConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="machine" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} interval={0} />
        <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} domain={[0, 100]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="oee" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.machine}
              fill={entry.oee >= 75 ? "var(--running)" : entry.oee >= 55 ? "var(--cyan)" : "var(--fault)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
