"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, User, Cpu, Users, Activity, TrendingUp } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { login, isAuthed, ready } = useAuth()

  useEffect(() => {
    if (ready && isAuthed) {
      router.replace("/dashboard")
    }
  }, [ready, isAuthed, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!employeeId.trim() || !password.trim()) {
      setError("Employee ID and Password are required")
      return
    }

    setLoading(true)

    try {
      await login(employeeId, password)
      router.replace("/dashboard")
    } catch (err: any) {
      setError(err?.message || "Invalid Employee ID or Password")
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#070b19]">
        <div className="flex items-center gap-3 text-slate-400">
          <Cpu className="h-5 w-5 animate-pulse text-indigo-500" />
          Loading command center…
        </div>
      </div>
    )
  }

  if (isAuthed) return null

  return (
    <div className="min-h-screen bg-[#070b19] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#070b19] to-[#04060f] flex items-center justify-center p-6 sm:p-10 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Left Column: Product Info Card */}
        <div className="flex flex-col justify-between bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 sm:p-10 backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col gap-8 relative z-10">
            {/* Logo block */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Cpu size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider leading-none">NEXUS</h2>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Smart Factory Command Center</span>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Industry 4.0 monitoring for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">25-machine</span> CNC floor
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed font-normal">
                Real-time PLC telemetry, RFID operator mapping, live OEE and Man-Machine Ratio unified in one command center.
              </p>
            </div>

            {/* Feature lists */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/30 flex items-center justify-center text-cyan-400">
                  <Users size={14} />
                </div>
                <span className="text-xs font-medium text-slate-300">RFID operator-to-machine assignment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/30 flex items-center justify-center text-cyan-400">
                  <Activity size={14} />
                </div>
                <span className="text-xs font-medium text-slate-300">Live PLC status & utilization tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/30 flex items-center justify-center text-cyan-400">
                  <TrendingUp size={14} />
                </div>
                <span className="text-xs font-medium text-slate-300">Per-machine OEE & quality analytics</span>
              </div>
            </div>
          </div>

          {/* Operational Status */}
          <div className="flex items-center gap-2 mt-8 sm:mt-0 relative z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">All systems operational</span>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="flex flex-col justify-center bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 sm:p-10 backdrop-blur-md shadow-2xl relative">
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Operator Sign In</h2>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              Authenticate to access the live factory dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Employee ID
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-101"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs font-medium bg-red-950/20 border border-red-800/30 px-3.5 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? "Accessing..." : "Access Command Center"}
            </button>

            <p className="text-[11px] text-center text-slate-500 mt-4 leading-normal">
              Use your Employee ID (e.g. EMP-101) and your assigned password.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
