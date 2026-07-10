export type MachineStatus = "running" | "idle" | "fault"

export type Shift = "Shift A" | "Shift B" | "Shift C"

export interface Operator {
  employeeId: string
  name: string
  shift: Shift
  // RFID state
  loggedIn: boolean
  loginTime: string | null // ISO string
  assignedMachine: number | null
}

export interface Machine {
  id: number // 1..25
  machineNo: string // CNC-01 ...
  partNumber: string
  status: MachineStatus
  cycleTime: number // ideal seconds per part
  idealCycleTime: number // seconds per part
  runtime: number // minutes
  downtime: number // minutes
  plannedTime: number // minutes (shift length)
  targetCount: number
  actualCount: number
  goodParts: number
  // linked operator (only if RFID logged in)
  operatorId: string | null
  operatorName: string | null
}

export interface AlertItem {
  id: string
  machineNo: string
  severity: "fault" | "idle" | "info"
  message: string
  time: string
}
