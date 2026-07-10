"use client"

import { useEffect, useState } from "react"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useFactory } from "@/components/factory-provider"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { calculateOee, calculateUtilization } from "@/lib/oee"
import type { Machine } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface ReportRow {
  machineNo: string
  operator: string
  partNumber: string
  target: number
  actual: number
  runtime: number
  downtime: number
  utilization: number
  oee: number
}

const HEADERS = [
  "Machine No",
  "Operator",
  "Part Number",
  "Target Qty",
  "Actual Qty",
  "Runtime (min)",
  "Downtime (min)",
  "Utilization %",
  "OEE %",
]

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export function ReportsContent() {
  const { machines: liveMachines } = useFactory()

  const [filterType, setFilterType] = useState<"live" | "year" | "month" | "date" | "time" | "custom">("live")
  const [filterYear, setFilterYear] = useState("2026")
  const [filterMonth, setFilterMonth] = useState("07")
  const [filterDate, setFilterDate] = useState("2026-07-08")
  const [filterTime, setFilterTime] = useState("10:30")
  const [filterCustomFrom, setFilterCustomFrom] = useState("2026-07-08T09:00")
  const [filterCustomTo, setFilterCustomTo] = useState("2026-07-08T10:00")

  const [rows, setRows] = useState<ReportRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Helper to map DB row format to front-end Machine type
  const mapDBToMachine = (m: any): Machine => ({
    id: m.id,
    machineNo: m.machine_no,
    partNumber: m.part_number,
    status: m.status,
    cycleTime: m.cycle_time,
    idealCycleTime: m.ideal_cycle_time,
    runtime: m.runtime,
    downtime: m.downtime,
    plannedTime: m.planned_time,
    targetCount: m.target_count,
    actualCount: m.actual_count,
    goodParts: m.good_parts,
    operatorId: null,
    operatorName: null,
  })

  // Compute live rows using the standard buildRows mapping
  const buildRows = (machinesList: Machine[]): ReportRow[] => {
    return machinesList.map((m) => ({
      machineNo: m.machineNo,
      operator: m.operatorName ?? "Unassigned",
      partNumber: m.partNumber,
      target: m.targetCount,
      actual: m.actualCount,
      runtime: m.runtime,
      downtime: m.downtime,
      utilization: Number(calculateUtilization(m).toFixed(1)),
      oee: Number(calculateOee(m).oee.toFixed(1)),
    }))
  }

  // Compute start/end date range
  const getRange = () => {
    let start = new Date()
    let end = new Date()

    if (filterType === "live") {
      start = new Date(Date.now() - 24 * 60 * 60 * 1000)
      end = new Date()
    } else if (filterType === "year") {
      start = new Date(`${filterYear}-01-01T00:00:00`)
      end = new Date(`${filterYear}-12-31T23:59:59`)
    } else if (filterType === "month") {
      start = new Date(`${filterYear}-${filterMonth}-01T00:00:00`)
      const y = parseInt(filterYear, 10)
      const m = parseInt(filterMonth, 10)
      const lastDay = new Date(y, m, 0).getDate()
      end = new Date(`${filterYear}-${filterMonth}-${String(lastDay).padStart(2, "0")}T23:59:59`)
    } else if (filterType === "date") {
      start = new Date(`${filterDate}T00:00:00`)
      end = new Date(`${filterDate}T23:59:59`)
    } else if (filterType === "time") {
      start = new Date(`${filterDate}T00:00:00`)
      end = new Date(`${filterDate}T${filterTime}:59`)
    } else if (filterType === "custom") {
      start = new Date(filterCustomFrom)
      end = new Date(filterCustomTo)
    }

    if (isNaN(start.getTime())) start = new Date()
    if (isNaN(end.getTime())) end = new Date()

    return { start, end }
  }

  const { start: startDateTime, end: endDateTime } = getRange()

  // Handle live updates when filter is set to live
  useEffect(() => {
    if (filterType === "live") {
      setRows(buildRows(liveMachines))
    }
  }, [filterType, liveMachines])

  // Handle historical reports queries
  useEffect(() => {
    if (filterType === "live") return

    const loadReportData = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const startISO = startDateTime.toISOString()
        const endISO = endDateTime.toISOString()

        // 1. Fetch plc_data within range from Supabase
        const { data: plcRows, error: plcError } = await supabase
          .from("plc_data")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .order("created_at", { ascending: true })

        if (plcError) throw plcError

        // 2. Fetch config row and machines active records
        const [refPLCRes, machinesRes] = await Promise.all([
          supabase.from("plc_data").select("*").eq("id", 1).maybeSingle(),
          supabase.from("machines").select("*").order("machine_no"),
        ])

        const refPLC = refPLCRes.data || {}
        const machinesDB = machinesRes.data || []

        // 3. Compute CNC-01 values from the filtered plcRows
        let cnc01Actual = 0
        let cnc01RuntimeMs = 0

        if (plcRows && plcRows.length > 0) {
          let prevDi7 = 1
          let prevDi12 = 0
          let cycleStart: number | null = null

          for (let i = 0; i < plcRows.length; i++) {
            const row = plcRows[i]
            const rowTime = new Date(row.created_at).getTime()
            const currentDi3 = row.di3 ?? 0
            const currentDi7 = row.di7 ?? 0
            const currentDi12 = row.di12 ?? 0

            if (i > 0) {
              const prevRow = plcRows[i - 1]
              const timeDiff = rowTime - new Date(prevRow.created_at).getTime()

              if (prevRow.di3 === 1 && timeDiff > 0 && timeDiff < 10000) {
                cnc01RuntimeMs += timeDiff
              }

              if (prevDi7 === 1 && currentDi7 === 0) {
                if (cycleStart === null) cycleStart = rowTime
              }

              if (prevDi12 === 0 && currentDi12 === 1) {
                if (cycleStart !== null) {
                  cnc01Actual += 1
                  cycleStart = null
                }
              }
            }

            prevDi7 = currentDi7
            prevDi12 = currentDi12
          }
        }

        const cnc01Runtime = Math.round(cnc01RuntimeMs / 60000)
        const durationMins = Math.max(1, (endDateTime.getTime() - startDateTime.getTime()) / 60000)

        // Dynamic scaling factor for target/planned (since they scale relative to range duration)
        const refPlannedTime = Number(refPLC.planned_time || 480)
        const scale = durationMins / refPlannedTime

        // Compute OEE for CNC-01
        const cnc01IdealCycle = Number(refPLC.idle_cycle_time || 40)
        const cnc01Planned = Math.round(durationMins)
        const cnc01Target = Math.round(Number(refPLC.target_count || 720) * scale)

        // Reference Good Parts ratio
        const liveCNC01 = liveMachines.find((m) => m.machineNo === "CNC-01")
        const cnc01ActualTotal = liveCNC01 ? liveCNC01.actualCount : 600
        const cnc01GoodRatio = cnc01ActualTotal > 0 ? Number(refPLC.good_parts || 0) / cnc01ActualTotal : 0.95
        const cnc01Good = Math.min(cnc01Actual, Math.round(cnc01Actual * cnc01GoodRatio))
        const cnc01Downtime = Math.max(0, cnc01Planned - cnc01Runtime)

        const cnc01Availability = cnc01Planned > 0 ? cnc01Runtime / cnc01Planned : 0
        const cnc01Performance = cnc01Runtime > 0 ? (cnc01IdealCycle * cnc01Actual) / (cnc01Runtime * 60) : 0
        const cnc01Quality = cnc01Actual > 0 ? cnc01Good / cnc01Actual : 1

        const cnc01Oee = Number((Math.min(100, Math.max(0, cnc01Availability * cnc01Performance * cnc01Quality * 100))).toFixed(1))
        const cnc01Util = Number((Math.min(100, Math.max(0, (cnc01Runtime / cnc01Planned) * 100))).toFixed(1))

        const computedRows: ReportRow[] = []

        // CNC-01 row
        computedRows.push({
          machineNo: "CNC-01",
          operator: "Neeraj",
          partNumber: refPLC.part_no || "PN-UPDATE-101",
          target: cnc01Target,
          actual: cnc01Actual,
          runtime: cnc01Runtime,
          downtime: cnc01Downtime,
          utilization: cnc01Util,
          oee: cnc01Oee,
        })

        // CNC-02 to CNC-25 rows - Fetched directly from database (NO ESTIMATED OR SCALED VALUES)
        for (const m of machinesDB) {
          const mObj = mapDBToMachine(m)
          const mUtil = Number(calculateUtilization(mObj).toFixed(1))
          const mOee = Number(calculateOee(mObj).oee.toFixed(1))

          computedRows.push({
            machineNo: m.machine_no,
            operator: "Unassigned",
            partNumber: m.part_number,
            target: m.target_count,
            actual: m.actual_count,
            runtime: m.runtime,
            downtime: m.downtime,
            utilization: mUtil,
            oee: mOee,
          })
        }

        // Sort by machine number numerically (CNC-01 to CNC-25)
        computedRows.sort((a, b) => {
          const numA = parseInt(a.machineNo.replace("CNC-", ""), 10)
          const numB = parseInt(b.machineNo.replace("CNC-", ""), 10)
          return numA - numB
        })

        setRows(computedRows)
      } catch (err) {
        console.warn("Failed to load report data:", err)
        toast.error("Failed to fetch report data from Supabase.")
      } finally {
        setIsLoading(false)
      }
    }

    loadReportData()
  }, [
    filterType,
    filterYear,
    filterMonth,
    filterDate,
    filterTime,
    filterCustomFrom,
    filterCustomTo,
  ])

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx")
      const wsRows = [
        ["Production & Performance Report"],
        ["Report Period:"],
        [`From: ${formatDate(startDateTime)}`],
        [`To:   ${formatDate(endDateTime)}`],
        ["Generated On:"],
        [`${formatDate(new Date())}`],
        [],
        HEADERS,
      ]

      rows.forEach((r) => {
        wsRows.push([
          r.machineNo,
          r.operator,
          r.partNumber,
          String(r.target),
          String(r.actual),
          String(r.runtime),
          String(r.downtime),
          `${r.utilization}%`,
          `${r.oee}%`,
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Production Report")
      XLSX.writeFile(wb, `factory-report-${formatDate(new Date()).replace(/[:\s]/g, "-")}.xlsx`)
      toast.success("Excel report exported")
    } catch {
      toast.error("Failed to export Excel")
    }
  }

  const exportPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF({ orientation: "landscape" })

      doc.setFontSize(14)
      doc.text("Production & Performance Report", 14, 15)

      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text("Report Period:", 14, 22)
      doc.text(`From: ${formatDate(startDateTime)}`, 14, 27)
      doc.text(`To:   ${formatDate(endDateTime)}`, 14, 32)

      doc.text("Generated On:", 220, 22)
      doc.text(`${formatDate(new Date())}`, 220, 27)

      autoTable(doc, {
        startY: 38,
        head: [HEADERS],
        body: rows.map((r) => [
          r.machineNo,
          r.operator,
          r.partNumber,
          r.target,
          r.actual,
          r.runtime,
          r.downtime,
          `${r.utilization}%`,
          `${r.oee}%`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [243, 240, 255] },
      })

      doc.save(`factory-report-${formatDate(new Date()).replace(/[:\s]/g, "-")}.pdf`)
      toast.success("PDF report exported")
    } catch {
      toast.error("Failed to export PDF")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Production & Performance Report"
        description={`${rows.length} machines · live snapshot`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm font-semibold text-foreground focus:outline-none focus:border-primary dark:bg-input/30"
              >
                <option value="live">Live Snapshot</option>
                <option value="year">By Year</option>
                <option value="month">By Month</option>
                <option value="date">By Date</option>
                <option value="time">By Specific Time</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>

            {/* Year Selector */}
            {filterType === "year" && (
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm text-foreground focus:outline-none dark:bg-input/30"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}

            {/* Month Selector */}
            {filterType === "month" && (
              <div className="flex items-center gap-1.5">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm text-foreground focus:outline-none dark:bg-input/30"
                >
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm text-foreground focus:outline-none dark:bg-input/30"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            )}

            {/* Date Selector */}
            {(filterType === "date" || filterType === "time") && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm text-foreground focus:outline-none dark:bg-input/30"
              />
            )}

            {/* Time Selector */}
            {filterType === "time" && (
              <input
                type="time"
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="bg-secondary/60 border border-border/40 rounded-xl px-2.5 py-1 text-sm text-foreground focus:outline-none dark:bg-input/30"
              />
            )}

            {/* Custom Range Selector */}
            {filterType === "custom" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">From:</span>
                <input
                  type="datetime-local"
                  value={filterCustomFrom}
                  onChange={(e) => setFilterCustomFrom(e.target.value)}
                  className="bg-secondary/60 border border-border/40 rounded-xl px-2 py-0.5 text-sm text-foreground focus:outline-none dark:bg-input/30"
                />
                <span className="text-xs text-muted-foreground">To:</span>
                <input
                  type="datetime-local"
                  value={filterCustomTo}
                  onChange={(e) => setFilterCustomTo(e.target.value)}
                  className="bg-secondary/60 border border-border/40 rounded-xl px-2 py-0.5 text-sm text-foreground focus:outline-none dark:bg-input/30"
                />
              </div>
            )}

            {/* Export buttons */}
            <div className="flex gap-1.5 border-l border-border/40 pl-3">
              <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2 bg-secondary/50 h-8 rounded-xl font-semibold">
                <FileText className="h-4 w-4 text-fault" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2 bg-secondary/50 h-8 rounded-xl font-semibold">
                <FileSpreadsheet className="h-4 w-4 text-running" />
                Excel
              </Button>
            </div>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-xs font-mono bg-secondary/25 border border-border/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Report Period:</span>
            <span className="text-foreground font-semibold">{formatDate(startDateTime)}</span>
            <span className="text-muted-foreground/60">to</span>
            <span className="text-foreground font-semibold">{formatDate(endDateTime)}</span>
          </div>
          {isLoading && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Fetching report data from Supabase...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {HEADERS.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.machineNo} className="border-border">
                  <TableCell className="font-medium">{r.machineNo}</TableCell>
                  <TableCell>{r.operator}</TableCell>
                  <TableCell className="font-mono text-xs">{r.partNumber}</TableCell>
                  <TableCell className="tabular-nums">{r.target.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{r.actual.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{r.runtime}</TableCell>
                  <TableCell className="tabular-nums">{r.downtime}</TableCell>
                  <TableCell className="tabular-nums">{r.utilization}%</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                        r.oee >= 75
                          ? "bg-running/15 text-running"
                          : r.oee >= 55
                            ? "bg-accent/15 text-accent"
                            : "bg-fault/15 text-fault",
                      )}
                    >
                      {r.oee}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  )
}
