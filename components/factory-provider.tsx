"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode, useCallback, useMemo } from "react"
import type { AlertItem, Machine, Operator } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface TrendPoint { hour: string; output: number; target: number }
interface FactoryContextValue {
  machines: Machine[]
  operators: Operator[]
  trend: TrendPoint[]
  alerts: AlertItem[]
  live: boolean
  toggleLive: () => void
  refresh: () => Promise<void>
}
const FactoryContext = createContext<FactoryContextValue | null>(null)

// 10 seconds threshold for a gap. If there are no PLC records for 10 seconds, it is treated as a gap.
const THRESHOLD_MS = 10 * 1000

function calculateStaticRuntimeMs(rows: any[]) {
  if (rows.length < 1) return 0
  let runtimeMs = 0
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].created_at).getTime()
    const curr = new Date(rows[i].created_at).getTime()
    const diff = curr - prev
    if (diff > 0 && diff <= THRESHOLD_MS) {
      runtimeMs += diff
    }
  }
  return runtimeMs
}

function processPlcCycles(rows: any[]) {
  if (rows.length < 1) return { actualCount: 0, cycleTime: 0 }

  let actualCount = 0
  let lastCycleTime = 0
  let cycleStartTimestamp: number | null = null

  let prevDi7: number | undefined = undefined
  let prevDi12: number | undefined = undefined

  // Process rows sequentially (oldest to newest)
  for (const row of rows) {
    const currentDi7 = Number(row.di7)
    const currentDi12 = Number(row.di12)

    if (prevDi7 !== undefined && prevDi12 !== undefined) {
      // Detect Cycle Start (DI7: 1 -> 0)
      if (prevDi7 === 1 && currentDi7 === 0) {
        if (cycleStartTimestamp === null) {
          cycleStartTimestamp = new Date(row.created_at).getTime()
        }
      }

      // Detect Cycle Stop (DI12: 0 -> 1)
      if (prevDi12 === 0 && currentDi12 === 1) {
        if (cycleStartTimestamp !== null) {
          const stopTime = new Date(row.created_at).getTime()
          const duration = Math.floor((stopTime - cycleStartTimestamp) / 1000)
          if (duration > 0) {
            lastCycleTime = duration
          }
          actualCount += 1
          cycleStartTimestamp = null // reset start for next cycle
        }
      }
    }

    prevDi7 = currentDi7
    prevDi12 = currentDi12
  }

  return { actualCount, cycleTime: lastCycleTime }
}

function dbToMachine(row: any, index: number): Machine {
  return {
    id: row.id ?? row.machine_no ?? `machine-${index + 2}`,
    machineNo: row.machine_no,
    partNumber: row.part_number,
    status: String(row.status || "idle").toLowerCase() as any,
    cycleTime: Number(row.cycle_time || 0),
    idealCycleTime: Number(row.ideal_cycle_time || 0),
    runtime: Number(row.runtime || 0),
    downtime: Number(row.downtime || 0),
    plannedTime: Number(row.planned_time || 0),
    targetCount: Number(row.target_count || 0),
    actualCount: Number(row.actual_count || 0),
    goodParts: Number(row.good_parts || 0),
    operatorId: null,
    operatorName: null,
  }
}

export function FactoryProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [trend] = useState<TrendPoint[]>([
    { hour: "07:00", output: 310, target: 320 },
    { hour: "08:00", output: 350, target: 340 },
    { hour: "09:00", output: 330, target: 360 },
    { hour: "10:00", output: 390, target: 380 },
    { hour: "11:00", output: 380, target: 400 },
    { hour: "12:00", output: 420, target: 420 },
    { hour: "13:00", output: 400, target: 440 },
    { hour: "14:00", output: 450, target: 460 },
  ])
  const [alerts] = useState<AlertItem[]>([])
  const [live, setLive] = useState(true)
  const supabase = createClient()

  // Base state to store static calculations from database fetching
  const [baseCNC01, setBaseCNC01] = useState<{
    staticRuntimeMs: number
    lastTimestamp: number
    plannedTime: number
    partNumber: string
    status: string
    cycleTime: number
    idealCycleTime: number
    targetCount: number
    actualCount: number
    goodParts: number
    operatorId: string | null
    operatorName: string | null
  } | null>(null)

  const [others, setOthers] = useState<Machine[]>([])
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  // Use refs to store PLC accumulation variables so they can persist
  // across manual and polling refreshes
  const lastProcessedTimestampRef = useRef<number>(0)
  const accumulatedRuntimeMsRef = useRef<number>(0)
  const accumulatedActualCountRef = useRef<number>(0)
  const lastCycleTimeRef = useRef<number>(0)
  const cycleStartTimestampRef = useRef<number | null>(null)
  const prevDi7Ref = useRef<number | undefined>(undefined)
  const prevDi12Ref = useRef<number | undefined>(undefined)

  const loadData = useCallback(async (isInitial = false) => {
    try {
      // Fetch config row explicitly to avoid cutoff
      const configRes = await supabase.from("plc_data").select("*").eq("id", 1).maybeSingle()
      const cnc01row = configRes.data || {}

      // Fetch operator access logs to resolve active and fallback assignments
      const opsNewRes = await supabase
        .from("operators_new")
        .select("*")
        .order("created_at", { ascending: false })
      const opsLogs = opsNewRes.data || []

      const machinesRes = await supabase.from("machines").select("*").order("machine_no")

      // Fetch new PLC rows
      let newRows: any[] = []
      if (isInitial) {
        lastProcessedTimestampRef.current = 0
        accumulatedRuntimeMsRef.current = 0
        accumulatedActualCountRef.current = 0
        lastCycleTimeRef.current = 0
        cycleStartTimestampRef.current = null
        prevDi7Ref.current = undefined
        prevDi12Ref.current = undefined

        // Fetch ALL records in pages
        let page = 0
        const pageSize = 1000
        while (true) {
          const { data, error } = await supabase
            .from("plc_data")
            .select("*")
            .order("created_at", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)
          if (error || !data || data.length === 0) break
          newRows = [...newRows, ...data]
          if (data.length < pageSize) break
          page++
        }
      } else {
        // Fetch only records newer than the last processed timestamp
        if (lastProcessedTimestampRef.current > 0) {
          const lastIso = new Date(lastProcessedTimestampRef.current).toISOString()
          const { data, error } = await supabase
            .from("plc_data")
            .select("*")
            .gt("created_at", lastIso)
            .order("created_at", { ascending: true })
          if (!error && data) {
            newRows = data
          }
        }
      }

      // Process new rows
      if (newRows.length > 0) {
        for (const row of newRows) {
          if (row.id === 1) continue // Skip configuration row in runtime/count calculations
          const rowTime = new Date(row.created_at).getTime()
          
          // Accumulate runtime
          if (lastProcessedTimestampRef.current > 0) {
            const diff = rowTime - lastProcessedTimestampRef.current
            if (diff > 0 && diff <= THRESHOLD_MS) {
              accumulatedRuntimeMsRef.current += diff
            }
          }
          lastProcessedTimestampRef.current = rowTime

          // Accumulate actual count from DI7/DI12 transitions
          const currentDi7 = Number(row.di7)
          const currentDi12 = Number(row.di12)

          if (prevDi7Ref.current !== undefined && prevDi12Ref.current !== undefined) {
            // Detect Cycle Start (DI7: 1 -> 0)
            if (prevDi7Ref.current === 1 && currentDi7 === 0) {
              if (cycleStartTimestampRef.current === null) {
                cycleStartTimestampRef.current = rowTime
              }
            }

            // Detect Cycle Stop (DI12: 0 -> 1)
            if (prevDi12Ref.current === 0 && currentDi12 === 1) {
              if (cycleStartTimestampRef.current !== null) {
                accumulatedActualCountRef.current += 1
                lastCycleTimeRef.current = (rowTime - cycleStartTimestampRef.current) / 1000
                cycleStartTimestampRef.current = null
              }
            }
          }

          prevDi7Ref.current = currentDi7
          prevDi12Ref.current = currentDi12
        }
      }

      // Resolve active operator list
      const latestOpState = new Map<string, any>()
      for (const log of opsLogs) {
        const opId = log.operator_id
        if (opId && !latestOpState.has(opId)) {
          latestOpState.set(opId, log)
        }
      }

      const activeOpLogs = Array.from(latestOpState.values()).filter(
        (log) => log.event === "LOGIN"
      )

      const activeCNC01Op = activeOpLogs.find((log) => log.machine_id === "CNC-01")
      const lastCNC01Log = opsLogs.find((log) => log.machine_id === "CNC-01")
      const lastEnteredName = lastCNC01Log ? lastCNC01Log.operator_name : null

      // Sync active operator list with ESP32 status
      let activeOps: Operator[] = []
      let espIp = ""
      if (typeof window !== "undefined") {
        espIp = localStorage.getItem("esp32_ip") || ""
      }

      if (espIp) {
        try {
          const res = await fetch(`http://${espIp}/status`, { signal: AbortSignal.timeout(2000) })
          if (res.ok) {
            const data = await res.json()
            if (data && data.active) {
              activeOps = [{
                employeeId: data.operator_id || activeCNC01Op?.operator_id || "EMP-101",
                name: data.operator_name || activeCNC01Op?.operator_name || lastEnteredName || "John Doe",
                shift: (data.shift || activeCNC01Op?.shift || "Shift A") as any,
                loggedIn: true,
                loginTime: data.login_time || new Date().toISOString(),
                assignedMachine: data.machine_id === "CNC-01" ? 1 : null,
              }]
            }
          }
        } catch (err) {
          // Fetch failed (Disconnected), activeOps remains empty []
          console.warn("FactoryProvider: failed to query ESP32 reader at", espIp)
        }
      }

      setOperators(activeOps)

      setBaseCNC01({
        staticRuntimeMs: accumulatedRuntimeMsRef.current,
        lastTimestamp: lastProcessedTimestampRef.current,
        plannedTime: Number(cnc01row.planned_time || 0),
        partNumber: cnc01row.part_no || "",
        status: String(cnc01row.status || "idle").toLowerCase(),
        cycleTime: lastCycleTimeRef.current,
        idealCycleTime: Number(cnc01row.idle_cycle_time || 0),
        targetCount: Number(cnc01row.target_count || 0),
        actualCount: accumulatedActualCountRef.current,
        goodParts: Number(cnc01row.good_parts || 0),
        operatorId: activeOps.length > 0 ? activeOps[0].employeeId : null,
        operatorName: activeOps.length > 0 ? activeOps[0].name : null,
      })

      const dbOthers = ((machinesRes.data || []) as any[])
        .filter((r) => r.machine_no !== "CNC-01")
        .map((r, i) => dbToMachine(r, i))

      setOthers(dbOthers)
    } catch (err) {
      console.warn("Error loading factory data:", err)
    }
  }, [supabase])

  // Database fetch and realtime subscription
  useEffect(() => {
    // Run initial load
    loadData(true)

    // Polling intervals
    const timer = setInterval(() => loadData(false), 5000)

    // Real-time updates subscription
    const channel = supabase
      .channel(`plc_data_realtime_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plc_data" },
        (payload) => {
          const newRow = payload.new
          if (newRow.id === 1) return // Ignore config row updates

          const rowTime = new Date(newRow.created_at).getTime()
          if (rowTime <= lastProcessedTimestampRef.current) return // Ignore old/duplicate rows

          let addedMs = 0
          if (lastProcessedTimestampRef.current > 0) {
            const diff = rowTime - lastProcessedTimestampRef.current
            if (diff > 0 && diff <= THRESHOLD_MS) {
              addedMs = diff
            }
          }
          lastProcessedTimestampRef.current = rowTime

          // Handle cycle count and cycle time in real-time
          const currentDi7 = Number(newRow.di7)
          const currentDi12 = Number(newRow.di12)

          if (prevDi7Ref.current !== undefined && prevDi12Ref.current !== undefined) {
            if (prevDi7Ref.current === 1 && currentDi7 === 0) {
              if (cycleStartTimestampRef.current === null) {
                cycleStartTimestampRef.current = rowTime
              }
            }

            if (prevDi12Ref.current === 0 && currentDi12 === 1) {
              if (cycleStartTimestampRef.current !== null) {
                accumulatedActualCountRef.current += 1
                lastCycleTimeRef.current = (rowTime - cycleStartTimestampRef.current) / 1000
                cycleStartTimestampRef.current = null
              }
            }
          }

          prevDi7Ref.current = currentDi7
          prevDi12Ref.current = currentDi12
          accumulatedRuntimeMsRef.current += addedMs

          setBaseCNC01((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              staticRuntimeMs: accumulatedRuntimeMsRef.current,
              lastTimestamp: lastProcessedTimestampRef.current,
              actualCount: accumulatedActualCountRef.current,
              cycleTime: lastCycleTimeRef.current,
            }
          })
        }
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [loadData, supabase])

  // Calculate live values when database updates
  useEffect(() => {
    if (!baseCNC01) return

    const runtimeInMinutes = baseCNC01.staticRuntimeMs / 60000
    const downtimeInMinutes = Math.max(0, baseCNC01.plannedTime - runtimeInMinutes)

    const cnc01: Machine = {
      id: "CNC-01" as any,
      machineNo: "CNC-01",
      partNumber: baseCNC01.partNumber,
      status: baseCNC01.status as any,
      cycleTime: baseCNC01.cycleTime,
      idealCycleTime: baseCNC01.idealCycleTime,
      runtime: runtimeInMinutes,
      downtime: downtimeInMinutes,
      plannedTime: baseCNC01.plannedTime,
      targetCount: baseCNC01.targetCount,
      actualCount: baseCNC01.actualCount,
      goodParts: baseCNC01.goodParts,
      operatorId: baseCNC01.operatorId,
      operatorName: baseCNC01.operatorName,
    }

    setMachines([cnc01, ...others])
  }, [baseCNC01, others])

  const refresh = useCallback(async () => {
    await loadData(true)
  }, [loadData])

  return (
    <FactoryContext.Provider
      value={{
        machines,
        operators,
        trend,
        alerts,
        live,
        toggleLive: () => setLive((v) => !v),
        refresh,
      }}
    >
      {children}
    </FactoryContext.Provider>
  )
}

export function useFactory() {
  const c = useContext(FactoryContext)
  if (!c) throw new Error("useFactory must be used within FactoryProvider")
  return c
}
