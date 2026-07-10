"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Clock, Cpu, Package, Timer, TrendingDown, User, CheckCircle2, Target, Edit, X, Loader2,
} from "lucide-react"
import { useFactory } from "@/components/factory-provider"
import { Gauge } from "@/components/gauge"
import { Panel } from "@/components/panel"
import { StatusBadge } from "@/components/status-badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { calculateOee, calculateUtilization } from "@/lib/oee"
import { cn } from "@/lib/utils"

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.floor(mins % 60)
  const s = Math.floor((mins * 60) % 60)
  return `${h}h ${m}m ${s}s`
}

export function OeeContent() {
  const { machines, refresh } = useFactory()
  const params = useSearchParams()
  const initialId = params.get("machine") || String(machines[0]?.id || "") || "CNC-01"
  const [selectedId, setSelectedId] = useState<string>(initialId)

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editMachineNo, setEditMachineNo] = useState("")
  const [editPartNumber, setEditPartNumber] = useState("")
  const [editIdealCycleTime, setEditIdealCycleTime] = useState("")
  const [editPlannedTime, setEditPlannedTime] = useState("")
  const [editTargetCount, setEditTargetCount] = useState("")
  const [editGoodParts, setEditGoodParts] = useState("")
  const [validationError, setValidationError] = useState("")

  const machine = machines ? (machines.find((m) => String(m.id) === selectedId) ?? machines[0]) : undefined

  // Update edit form states ONLY when the modal is opened
  useEffect(() => {
    if (isEditOpen && machine) {
      setEditMachineNo(machine.machineNo)
      setEditPartNumber(machine.partNumber)
      setEditIdealCycleTime(String(machine.idealCycleTime))
      setEditPlannedTime(String(machine.plannedTime))
      setEditTargetCount(String(machine.targetCount))
      setEditGoodParts(String(machine.goodParts))
      setValidationError("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditOpen])

  if (!machines || machines.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Loading machine data...
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No machine found.
      </div>
    )
  }

  const oee = calculateOee(machine)
  const util = calculateUtilization(machine)

  const hasActiveOperator = !!machine.operatorId

  const infoItems = [
    { icon: Cpu, label: "Machine No", value: machine.machineNo },
    { icon: Package, label: "Part Number", value: machine.partNumber },
    { icon: User, label: "Operator", value: hasActiveOperator ? (machine.operatorName ?? "Unassigned") : "Unassigned" },
    { icon: User, label: "Operator ID", value: hasActiveOperator ? (machine.operatorId ?? "—") : "---" },
  ]

  const prodItems = [
    { icon: Timer, label: "Ideal Cycle Time", value: `${machine.idealCycleTime}s` },
    { icon: Clock, label: "Runtime", value: fmtMins(machine.runtime) },
    { icon: TrendingDown, label: "Downtime", value: fmtMins(machine.downtime) },
    { icon: Clock, label: "Planned Time", value: fmtMins(machine.plannedTime) },
    { icon: Target, label: "Target Count", value: machine.targetCount.toLocaleString() },
    { icon: Package, label: "Actual Count", value: machine.actualCount.toLocaleString() },
    { icon: CheckCircle2, label: "Good Parts", value: machine.goodParts.toLocaleString() },
    { icon: TrendingDown, label: "Utilization", value: `${util.toFixed(1)}%` },
  ]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation Rules
    if (!editMachineNo.trim()) {
      setValidationError("Machine Number cannot be empty.")
      return
    }
    if (!editPartNumber.trim()) {
      setValidationError("Part Number cannot be empty.")
      return
    }

    const idealCycle = Number(editIdealCycleTime)
    if (isNaN(idealCycle) || idealCycle <= 0) {
      setValidationError("Ideal Cycle Time must be greater than 0.")
      return
    }

    const planned = Number(editPlannedTime)
    if (isNaN(planned) || planned <= 0) {
      setValidationError("Planned Time must be greater than 0.")
      return
    }

    const target = Number(editTargetCount)
    if (isNaN(target) || target < 0) {
      setValidationError("Target Count must be greater than or equal to 0.")
      return
    }

    const good = Number(editGoodParts)
    if (isNaN(good) || good < 0) {
      setValidationError("Good Parts must be greater than or equal to 0.")
      return
    }

    if (good > machine.actualCount) {
      setValidationError(
        "Good Parts cannot be greater than Actual Count. Please enter a value equal to or less than Actual Count."
      )
      return
    }

    setIsSaving(true)
    setValidationError("")

    try {
      const supabase = createClient()
      
      if (machine.id === "CNC-01" || machine.machineNo === "CNC-01") {
        // Update plc_data ID = 1 for CNC-01 config fields
        const { error } = await supabase
          .from("plc_data")
          .update({
            part_no: editPartNumber,
            idle_cycle_time: idealCycle,
            planned_time: planned,
            target_count: target,
            good_parts: good,
          })
          .eq("id", 1)

        if (error) throw error
      } else {
        // Update machines table for CNC-02..CNC-25
        const { error } = await supabase
          .from("machines")
          .update({
            machine_no: editMachineNo,
            part_number: editPartNumber,
            ideal_cycle_time: idealCycle,
            planned_time: planned,
            target_count: target,
            good_parts: good,
          })
          .eq("id", machine.id)

        if (error) throw error
      }

      toast.success(`${machine.machineNo} updated successfully!`)
      setIsEditOpen(false)
      await refresh()
    } catch (error: any) {
      console.error("Save error:", error)
      setValidationError(error.message || "Failed to update machine record.")
      toast.error(`Error: ${error.message || "Could not update machine record."}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl glass p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold tracking-tight">{machine.machineNo}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditOpen(true)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-md transition-all duration-200"
                title="Edit Machine Details"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Part {machine.partNumber}</p>
          </div>
          <StatusBadge status={machine.status} className="ml-2" />
        </div>
        <Select value={String(selectedId)} onValueChange={(v) => setSelectedId(v)}>
          <SelectTrigger className="w-full bg-secondary/60 sm:w-56">
            <span data-slot="select-value">
              {parseInt(machine.machineNo.replace("CNC-", ""), 10)}
            </span>
          </SelectTrigger>
          <SelectContent>
            {machines.map((m) => {
              const machineNum = parseInt(m.machineNo.replace("CNC-", ""), 10)
              return (
                <SelectItem key={m.id} value={String(m.id)}>
                  {machineNum}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="flex items-center justify-center">
          <Gauge value={oee.availability} label="Availability" color="cyan" />
        </Panel>
        <Panel className="flex items-center justify-center">
          <Gauge value={oee.performance} label="Performance" color="primary" />
        </Panel>
        <Panel className="flex items-center justify-center">
          <Gauge value={oee.quality} label="Quality" color="running" />
        </Panel>
        <Panel className="flex flex-col justify-center">
          <p className="text-2xl font-black tracking-tight text-running">{oee.oee.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Overall OEE</p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Availability</span>
              <span className="font-medium text-foreground">{oee.availability.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Performance</span>
              <span className="font-medium text-foreground">{oee.performance.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quality</span>
              <span className="font-medium text-foreground">{oee.quality.toFixed(1)}%</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Machine Specifications">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {infoItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-2.5 bg-secondary/30 p-3 rounded-xl border border-border/40">
                  <Icon className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5 truncate">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Production Analytics">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {prodItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-2.5 bg-secondary/30 p-3 rounded-xl border border-border/40">
                  <Icon className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5 truncate">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Edit Machine Details Modal overlay */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border/40 bg-background/80 shadow-2xl glass p-6 transition-all scale-100 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
              title="Close"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-semibold leading-none tracking-tight mb-1 text-foreground">
              Edit Machine Details
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Modify specifications and parameters for {machine.machineNo}.
            </p>

            {validationError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-semibold text-destructive animate-shake">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="machineNo" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Machine Number
                </Label>
                <Input
                  id="machineNo"
                  value={editMachineNo}
                  onChange={(e) => setEditMachineNo(e.target.value)}
                  placeholder="e.g. CNC-01"
                  disabled={isSaving || machine.machineNo === "CNC-01"}
                  className="bg-secondary/40 border-border/40 focus:border-primary disabled:opacity-60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
                {machine.machineNo === "CNC-01" && (
                  <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
                    CNC-01 identifier is system-configured and cannot be modified.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partNumber" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Part Number
                </Label>
                <Input
                  id="partNumber"
                  value={editPartNumber}
                  onChange={(e) => setEditPartNumber(e.target.value)}
                  placeholder="e.g. PN-9701-A"
                  disabled={isSaving}
                  className="bg-secondary/40 border-border/40 focus:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="idealCycleTime" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Ideal Cycle Time (s)
                  </Label>
                  <Input
                    id="idealCycleTime"
                    type="number"
                    step="any"
                    value={editIdealCycleTime}
                    onChange={(e) => setEditIdealCycleTime(e.target.value)}
                    placeholder="seconds"
                    disabled={isSaving}
                    className="bg-secondary/40 border-border/40 focus:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="plannedTime" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Planned Time (m)
                  </Label>
                  <Input
                    id="plannedTime"
                    type="number"
                    step="any"
                    value={editPlannedTime}
                    onChange={(e) => setEditPlannedTime(e.target.value)}
                    placeholder="minutes"
                    disabled={isSaving}
                    className="bg-secondary/40 border-border/40 focus:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="targetCount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Target Count
                  </Label>
                  <Input
                    id="targetCount"
                    type="number"
                    step="1"
                    value={editTargetCount}
                    onChange={(e) => setEditTargetCount(e.target.value)}
                    placeholder="integer count"
                    disabled={isSaving}
                    className="bg-secondary/40 border-border/40 focus:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goodParts" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Good Parts
                  </Label>
                  <Input
                    id="goodParts"
                    type="number"
                    step="1"
                    value={editGoodParts}
                    onChange={(e) => setEditGoodParts(e.target.value)}
                    placeholder="integer count"
                    disabled={isSaving}
                    className="bg-secondary/40 border-border/40 focus:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                  className="border-border/40 hover:bg-secondary/60 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="min-w-[100px] flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}