import type { Machine, Operator } from "./types"

export function createOperators(): Operator[] {
  return []
}

export function createMachines(): Machine[] {
  return [{
    id: 1,
    machineNo: "CNC-01",
    partNumber: "",
    status: "idle",
    cycleTime: 0,
    idealCycleTime: 0,
    runtime: 0,
    downtime: 0,
    plannedTime: 0,
    targetCount: 720,
    actualCount: 0,
    goodParts: 0,
    operatorId: null,
    operatorName: null,
  }]
}

export function applyRfidLogins(operators: Operator[], machines: Machine[]) {
  return { operators, machines }
}

export function createProductionTrend() {
  return []
}
