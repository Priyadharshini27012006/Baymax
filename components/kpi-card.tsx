import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "primary" | "cyan" | "running" | "idle" | "fault"

const ACCENTS: Record<Accent, { icon: string; glow: string; bar: string }> = {
  primary: { icon: "bg-primary/15 text-primary", glow: "glow-purple", bar: "bg-primary" },
  cyan: { icon: "bg-accent/15 text-accent", glow: "glow-cyan", bar: "bg-accent" },
  running: { icon: "bg-running/15 text-running", glow: "glow-green", bar: "bg-running" },
  idle: { icon: "bg-idle/15 text-idle", glow: "glow-amber", bar: "bg-idle" },
  fault: { icon: "bg-fault/15 text-fault", glow: "glow-red", bar: "bg-fault" },
}

export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = "primary",
  hint,
}: {
  label: string
  value: string | number
  unit?: string
  icon: LucideIcon
  accent?: Accent
  hint?: string
}) {
  const a = ACCENTS[accent]
  return (
    <div className="group relative overflow-hidden rounded-2xl glass p-4 transition-transform hover:-translate-y-0.5">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", a.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", a.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
