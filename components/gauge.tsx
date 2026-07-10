import { cn } from "@/lib/utils"

type GaugeColor = "primary" | "cyan" | "running" | "idle" | "fault"

const STROKE: Record<GaugeColor, string> = {
  primary: "var(--primary)",
  cyan: "var(--cyan)",
  running: "var(--running)",
  idle: "var(--idle)",
  fault: "var(--fault)",
}

function colorForValue(value: number): GaugeColor {
  if (value >= 85) return "running"
  if (value >= 60) return "cyan"
  if (value >= 40) return "idle"
  return "fault"
}

export function Gauge({
  value,
  label,
  size = 160,
  color,
}: {
  value: number
  label?: string
  size?: number
  color?: GaugeColor
}) {
  const radius = (size - 18) / 2
  const circumference = 2 * Math.PI * radius
  // Full 360deg circular progress
  const pct = Math.max(0, Math.min(100, value))
  const filled = (pct / 100) * circumference
  const resolved = color ?? colorForValue(pct)
  const stroke = STROKE[resolved]

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={12}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums tracking-tight">{pct.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>
      {label && <p className={cn("mt-1 text-sm font-medium text-muted-foreground")}>{label}</p>}
    </div>
  )
}
