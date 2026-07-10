"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Wifi,
  WifiOff,
  Users,
  Cpu,
  Clock,
  BadgeCheck,
  Shield,
  FileSpreadsheet,
  Power,
  RefreshCw,
  Lock,
  Terminal,
  User,
} from "lucide-react"
import { useFactory } from "@/components/factory-provider"
import { KpiCard } from "@/components/kpi-card"
import { Panel } from "@/components/panel"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MachineStatus } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

// Helper to map ESP32 machine status to project status type
const mapStatus = (st?: string): MachineStatus => {
  const s = st?.toLowerCase()
  if (s === "running") return "running"
  if (s === "fault" || s === "error" || s === "maintenance") return "fault"
  return "idle"
}

// Helper to format seconds to time string
const fmtTimeDuration = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Get initials for avatar fallback
const getInitials = (name = ""): string => {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "OP"
}

export function OperatorsContent() {
  const [espIP, setEspIP] = useState("")
  const [espBase, setEspBase] = useState("")
  const [connStatus, setConnStatus] = useState<"Disconnected" | "Connecting" | "Live">("Disconnected")
  const [status, setStatus] = useState<any>(null)
  const [logEntries, setLogEntries] = useState<any[]>([])
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  const supabase = createClient()
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const prevActive = useRef(false)
  const lastActiveRef = useRef<any>(null)

  // Restore saved IP
  useEffect(() => {
    const saved = localStorage.getItem("esp32_ip")
    if (saved) {
      setEspIP(saved)
      setEspBase(`http://${saved}`)
    }
  }, [])

  // Fetch initial access logs from Supabase
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("operators_new")
          .select("*")
          .order("created_at", { ascending: false })
        if (error) {
          console.warn("Error fetching operator logs (handled):", error)
        } else if (data) {
          setLogEntries(data)
        }
      } catch (err) {
        console.warn("Exception during fetchLogs:", err)
      }
    }
    fetchLogs()
  }, [])

  // Real-time updates subscription
  useEffect(() => {
    const channel = supabase
      .channel(`operators_new_realtime_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "operators_new" },
        (payload) => {
          setLogEntries((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch /status from ESP32
  const fetchStatus = useCallback(async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error("Bad response")
      const data = await res.json()
      setStatus(data)
      setConnStatus("Live")
      setLastSeen(new Date())

      // Sync session timer with ESP value
      if (data.active && typeof data.session_seconds === "number") {
        setSessionSeconds(data.session_seconds)
      }

      // Record active operator state details to resolve logouts
      if (data.active) {
        lastActiveRef.current = {
          operator_id: data.operator_id || null,
          operator_name: data.operator_name || null,
          rfid_uid: data.uid || null,
          machine_id: data.machine_id || "CNC-01",
          shift: data.shift || null,
        }
      }

      const isActiveState = !!data.active
      const prevActiveState = prevActive.current
      const currentOpId = data.operator_id || null
      const prevOpId = lastActiveRef.current?.operator_id || null

      const isLoginTransition = (isActiveState && !prevActiveState)
      const isLogoutTransition = (!isActiveState && prevActiveState)
      const isOperatorSwitch = (isActiveState && prevActiveState && currentOpId !== prevOpId)

      prevActive.current = isActiveState

      if (isOperatorSwitch) {
        // Logout previous operator first
        if (prevOpId) {
          const { data: latestRes } = await supabase
            .from("operators_new")
            .select("*")
            .eq("operator_id", prevOpId)
            .order("created_at", { ascending: false })
            .limit(1)

          const latestEvent = latestRes && latestRes[0]
          if (latestEvent && latestEvent.event === "LOGIN") {
            const logoutRecord = {
              operator_id: prevOpId,
              operator_name: lastActiveRef.current?.operator_name || null,
              rfid_uid: lastActiveRef.current?.rfid_uid || null,
              machine_id: lastActiveRef.current?.machine_id || "CNC-01",
              shift: data.shift || lastActiveRef.current?.shift || null,
              event: "LOGOUT",
            }
            await supabase.from("operators_new").insert(logoutRecord)
          }
        }

        // Login new operator
        if (currentOpId) {
          const { data: latestRes } = await supabase
            .from("operators_new")
            .select("*")
            .eq("operator_id", currentOpId)
            .order("created_at", { ascending: false })
            .limit(1)

          const latestEvent = latestRes && latestRes[0]
          if (!latestEvent || latestEvent.event !== "LOGIN") {
            const loginRecord = {
              operator_id: currentOpId,
              operator_name: data.operator_name || null,
              rfid_uid: data.uid || null,
              machine_id: data.machine_id || "CNC-01",
              shift: data.shift || null,
              event: "LOGIN",
            }
            await supabase.from("operators_new").insert(loginRecord)
          }
        }
      } else if (isLoginTransition) {
        if (currentOpId) {
          const { data: latestRes } = await supabase
            .from("operators_new")
            .select("*")
            .eq("operator_id", currentOpId)
            .order("created_at", { ascending: false })
            .limit(1)

          const latestEvent = latestRes && latestRes[0]
          if (!latestEvent || latestEvent.event !== "LOGIN") {
            const loginRecord = {
              operator_id: currentOpId,
              operator_name: data.operator_name || null,
              rfid_uid: data.uid || null,
              machine_id: data.machine_id || "CNC-01",
              shift: data.shift || null,
              event: "LOGIN",
            }
            await supabase.from("operators_new").insert(loginRecord)
          }
        }
      } else if (isLogoutTransition) {
        const lastOp = lastActiveRef.current || {}
        if (lastOp.operator_id) {
          const { data: latestRes } = await supabase
            .from("operators_new")
            .select("*")
            .eq("operator_id", lastOp.operator_id)
            .order("created_at", { ascending: false })
            .limit(1)

          const latestEvent = latestRes && latestRes[0]
          if (latestEvent && latestEvent.event === "LOGIN") {
            const logoutRecord = {
              operator_id: lastOp.operator_id,
              operator_name: lastOp.operator_name || null,
              rfid_uid: lastOp.rfid_uid || null,
              machine_id: lastOp.machine_id || "CNC-01",
              shift: data.shift || lastOp.shift || null,
              event: "LOGOUT",
            }
            await supabase.from("operators_new").insert(logoutRecord)
          }
        }
      }
    } catch {
      setConnStatus("Disconnected")
    }
  }, [])

  // Start / stop polling
  useEffect(() => {
    if (!espBase) return
    setConnStatus("Connecting")
    fetchStatus(espBase)
    pollRef.current = setInterval(() => fetchStatus(espBase), 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [espBase, fetchStatus])

  // Session ticker
  useEffect(() => {
    if (status?.active) {
      tickRef.current = setInterval(() => setSessionSeconds((s) => s + 1), 1000)
    } else {
      setSessionSeconds(0)
      if (tickRef.current) clearInterval(tickRef.current)
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [status?.active])

  // Connect handler
  const handleConnect = () => {
    const ip = espIP.trim().replace(/^https?:\/\//, "")
    if (!ip) return
    localStorage.setItem("esp32_ip", ip)
    setEspBase(`http://${ip}`)
  }

  // Force Logout via ESP32 /logout
  const forceLogout = async () => {
    if (!espBase) return
    try {
      await fetch(`${espBase}/logout`, { signal: AbortSignal.timeout(3000) })
      setTimeout(() => fetchStatus(espBase), 300)
    } catch {
      alert("Could not reach ESP32. Check IP and WiFi connection.")
    }
  }

  // Export CSV helper
  const exportCSV = () => {
    if (!logEntries.length) {
      alert("No log entries to export.")
      return
    }
    const headers = ["Time", "Operator Name", "Operator ID", "RFID UID", "Machine ID", "Shift", "Event"]
    const rows = logEntries.map((e) => [
      new Date(e.created_at).toLocaleString(),
      e.operator_name || "—",
      e.operator_id || "—",
      e.rfid_uid || "—",
      e.machine_id || "—",
      e.shift || "—",
      e.event || "—",
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `Access_Log_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // Derived variables
  const isLive = connStatus === "Live"
  const isActive = status?.active === true
  const machSt = mapStatus(status?.machine_status)

  return (
    <div className="flex flex-col gap-5">
      {/* ESP32 Connection Control Panel */}
      <Panel
        title="RFID Reader Controller"
        description="Configure connection to the physical ESP32 reader on the shop floor"
        action={
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${isLive
                ? "bg-running/10 border-running/30 text-running"
                : connStatus === "Connecting"
                  ? "bg-idle/10 border-idle/30 text-idle"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isLive ? "bg-running animate-pulse-dot" : connStatus === "Connecting" ? "bg-idle animate-pulse" : "bg-muted-foreground"
                }`}
            />
            {connStatus}
            {isLive && lastSeen && (
              <span className="text-[10px] font-normal text-muted-foreground/80">
                · Sync {lastSeen.toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Cpu className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="e.g. 192.168.1.100"
              value={espIP}
              onChange={(e) => setEspIP(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-background/50 border-border focus-visible:ring-primary"
            />
          </div>
          <Button onClick={handleConnect} disabled={connStatus === "Connecting"} className="rounded-xl px-5 h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20">
            Connect
          </Button>
        </div>
      </Panel>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Active Operators"
          value={isActive ? 1 : 0}
          icon={Users}
          accent="cyan"
          hint={isActive ? "1 operator mapped" : "0 operators mapped"}
        />
        <KpiCard
          label="Machine Status"
          value={isActive ? "Active" : "Offline"}
          icon={Cpu}
          accent={isActive ? "running" : "fault"}
          hint={isActive ? `Device ID: ${status?.machine_id}` : "Reader Idle"}
        />
        <KpiCard
          label="Current Shift"
          value={isActive ? status?.shift || "Morning" : "Morning"}
          icon={Shield}
          accent="primary"
          hint="Assigned work shift"
        />
        <KpiCard
          label="Session Time"
          value={isActive ? fmtTimeDuration(sessionSeconds) : "—"}
          icon={Clock}
          accent={isActive ? "running" : "primary"}
          hint={isActive ? "Duration ticker running" : "Reader waiting for scan"}
        />
      </div>

      {/* Main Grid: Access Log and Details */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* LEFT COLUMN: Access Log Table */}
        <div className="xl:col-span-2">
          <Panel
            title="Access Log"
            description="Login / logout events detected during this session"
            action={
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-8 rounded-xl font-semibold text-xs border-border hover:bg-secondary">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <Button variant="outline" size="icon" onClick={() => fetchStatus(espBase)} className="h-8 w-8 rounded-xl border-border hover:bg-secondary">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto border border-border/60 rounded-xl bg-background/30 max-h-[350px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background/90 backdrop-blur z-10 border-b border-border/60">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-12">#</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Time</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Operator</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">ID</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Machine</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Shift</TableHead>
                    <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground text-right">Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logEntries.length > 0 ? (
                    logEntries.map((e, i) => {
                      const num = logEntries.length - i
                      const isLogin = e.event === "LOGIN"
                      return (
                        <TableRow key={e.id || i} className="border-border/40 hover:bg-secondary/15">
                          <TableCell className="font-mono text-xs text-muted-foreground">{num}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{e.operator_name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-accent font-semibold">{e.operator_id || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{e.machine_id || "—"}</TableCell>
                          <TableCell className="text-xs">{e.shift || "—"}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${isLogin
                                  ? "bg-running/15 border-running/30 text-running"
                                  : "bg-secondary text-muted-foreground border-border"
                                }`}
                            >
                              {e.event}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs py-8">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Terminal className="h-6 w-6 text-muted-foreground/50 stroke-1" />
                          <p>No events yet. Events are captured automatically as cards are scanned.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN: Profile, Registered Cards and Info */}
        <div className="flex flex-col gap-5">
          {/* Session Detail / Profile Card */}
          <Panel
            title="Session Details"
            description={isActive ? `Machine: ${status?.machine_name}` : "No active session"}
          >
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {isActive ? (
                <div className="w-full flex flex-col items-center">
                  {/* Initials Avatar */}
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-accent to-primary text-primary-foreground font-black text-xl shadow-[0_0_20px_rgba(var(--primary-color),0.35)] glow-cyan mb-3">
                    {getInitials(status.operator_name)}
                  </div>

                  <h3 className="text-base font-bold text-foreground leading-tight">{status.operator_name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{status.operator_id}</p>

                  <div className="text-3xl font-black font-mono text-running mt-4 tracking-wider animate-pulse">
                    {fmtTimeDuration(sessionSeconds)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                    session timer
                  </div>

                  {/* Operator Metadata List */}
                  <div className="w-full mt-6 text-xs text-left divide-y divide-border/40">
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">RFID UID</span>
                      <span className="font-mono font-semibold text-foreground">{status.uid || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Machine ID</span>
                      <span className="font-mono font-semibold text-foreground">{status.machine_id || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Machine Name</span>
                      <span className="font-semibold text-foreground">{status.machine_name || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Shift</span>
                      <span className="font-semibold text-foreground">{status.shift || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2.5 items-center">
                      <span className="text-muted-foreground">Machine Status</span>
                      <StatusBadge status={machSt} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/80 border border-border text-muted-foreground/60">
                    <Lock className="h-6 w-6 stroke-1.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Reader Idle</h4>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[200px] leading-relaxed">
                      Present an authorized RFID card to the ESP32 reader to start a session.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Authorized Operators Panel */}
          <Panel
            title="Authorized Operators"
            description="Registered in ESP32 firmware"
          >
            <div className="flex flex-col gap-2">
              {[
                { id: "OP001", name: "Neeraj", uid: "50C06F1E" },
                { id: "OP002", name: "Parvez", uid: "73793706" },
                { id: "OP003", name: "Nayaz", uid: "459AF605" },
                { id: "OP004", name: "Priya", uid: "7A42F505" },
              ].map((op) => {
                const active = isActive && status?.uid === op.uid
                return (
                  <div
                    key={op.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${active
                        ? "bg-running/10 border-running/30"
                        : "bg-secondary/40 border-border/50 hover:bg-secondary/60"
                      }`}
                  >
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black shrink-0 ${active
                          ? "bg-gradient-to-tr from-accent to-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {getInitials(op.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {op.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {op.id} · {op.uid}
                      </div>
                    </div>
                    {active && (
                      <span className="text-[9px] font-bold bg-running/20 border border-running/30 text-running px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* Machine Info Panel */}
          <Panel
            title="Machine Info"
            description="From ESP32 firmware config"
          >
            <div className="text-xs divide-y divide-border/40">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Machine Name</span>
                <span className="font-semibold text-foreground">{status?.machine_name || "CNC Machine"}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Machine ID</span>
                <span className="font-mono font-semibold text-foreground">{status?.machine_id || "CNC-01"}</span>
              </div>
              <div className="flex justify-between py-2.5 items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={machSt} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
