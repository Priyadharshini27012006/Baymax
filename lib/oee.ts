import type { Machine } from "./types"

export interface OeeResult {
  availability: number
  performance: number
  quality: number
  oee: number
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export function calculateOee(machine: Machine): OeeResult {
  if (!machine) return { availability: 0, performance: 0, quality: 0, oee: 0 }
  const runtimeSeconds = machine.runtime * 60
  const plannedSeconds = machine.plannedTime * 60
  const availability = clampPct(
    plannedSeconds > 0 ? (runtimeSeconds / plannedSeconds) * 100 : 0,
  )
  const performance = clampPct(
    runtimeSeconds > 0
      ? ((machine.idealCycleTime * machine.actualCount) / runtimeSeconds) * 100
      : 0,
  )
  const quality = clampPct(
    machine.actualCount > 0 ? (machine.goodParts / machine.actualCount) * 100 : 0,
  )
  const oee = clampPct((availability / 100) * (performance / 100) * (quality / 100) * 100)
  return { availability, performance, quality, oee }
}

export function calculateUtilization(machine: Machine): number {
  if (!machine) return 0
  const total = machine.runtime + machine.downtime
  return total > 0 ? clampPct((machine.runtime / total) * 100) : 0
}

export function averageOee(machines: Machine[]): number {
  if (!machines || machines.length === 0) return 0
  const running = machines.filter((m) => m && m.status !== "fault")
  if (running.length === 0) return 0
  const sum = running.reduce((acc, m) => acc + calculateOee(m).oee, 0)
  return sum / running.length
}

export function averageUtilization(machines: Machine[]): number {
  if (!machines || machines.length === 0) return 0
  const sum = machines.reduce((acc, m) => acc + calculateUtilization(m), 0)
  return sum / machines.length
}