"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Cpu,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Gauge,
  ScanLine,
  FileBarChart2,
  X,
  Radio,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { FactoryProvider, useFactory } from "@/components/factory-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitoring", label: "Live Monitoring", icon: MonitorCog },
  { href: "/oee", label: "Machine OEE", icon: Gauge },
  { href: "/operators", label: "Operator Mapping", icon: ScanLine },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
]

function LiveBadge() {
  const { live, toggleLive } = useFactory()
  return (
    <button
      onClick={toggleLive}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        live
          ? "border-running/40 bg-running/10 text-running"
          : "border-border bg-secondary text-muted-foreground",
      )}
    >
      <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse-dot")} />
      {live ? "Live" : "Paused"}
    </button>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { employeeId, logout } = useAuth()

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <Link href="/dashboard" className="mb-4 flex items-center gap-3 px-2 py-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary glow-purple">
          <Cpu className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight">NEXUS</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Command Center</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary/15 text-foreground glow-purple"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "")} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="rounded-xl border border-border bg-secondary/50 p-3">
        <p className="text-[11px] text-muted-foreground">Signed in as</p>
        <p className="truncate text-sm font-medium">{employeeId ?? "—"}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout()
            router.replace("/")
          }}
          className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

function ShellInner({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-balance text-lg font-semibold leading-tight sm:text-xl">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <LiveBadge />
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter()
  const { isAuthed, ready } = useAuth()

  useEffect(() => {
    if (ready && !isAuthed) router.replace("/")
  }, [ready, isAuthed, router])

  if (!ready || !isAuthed) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Cpu className="h-5 w-5 animate-pulse text-primary" />
          Loading command center…
        </div>
      </div>
    )
  }

  return (
    <FactoryProvider>
      <ShellInner title={title} subtitle={subtitle}>
        {children}
      </ShellInner>
    </FactoryProvider>
  )
}
