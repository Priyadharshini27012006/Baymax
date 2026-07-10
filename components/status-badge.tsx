import type { MachineStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const CONFIG: Record<MachineStatus, { label: string; dot: string; text: string; ring: string }> = {
  running: { label: "Running", dot: "bg-running", text: "text-running", ring: "border-running/40 bg-running/10" },
  idle: { label: "Idle", dot: "bg-idle", text: "text-idle", ring: "border-idle/40 bg-idle/10" },
  fault: { label: "Fault", dot: "bg-fault", text: "text-fault", ring: "border-fault/40 bg-fault/10" },
}

export function StatusBadge({ status, className }: { status: MachineStatus; className?: string }) {
  const c = CONFIG[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        c.ring,
        c.text,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", c.dot, status !== "fault" && "animate-pulse-dot")} />
      {c.label}
    </span>
  )
}
