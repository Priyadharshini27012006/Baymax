"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthState {
  employeeId: string | null
  isAuthed: boolean
  login: (employeeId: string, password: string) => Promise<void>
  logout: () => Promise<void>
  ready: boolean
  error: string | null
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTabAuthed, setIsTabAuthed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Check sessionStorage immediately on mount
    const checkTabAuth = () => {
      const stored = sessionStorage.getItem("nexus_is_authed")
      if (stored === "true") {
        setIsTabAuthed(true)
      } else {
        setIsTabAuthed(false)
      }
    }
    checkTabAuth()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (employeeId: string, password: string) => {
    setError(null)
    const email = `${employeeId.toLowerCase()}@factory.local`
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError("Invalid Employee ID or password. Please try again.")
      throw authError
    }
    // Set tab-scoped auth states on successful login
    sessionStorage.setItem("nexus_is_authed", "true")
    sessionStorage.setItem("nexus_employee_id", employeeId.toUpperCase())
    setIsTabAuthed(true)
  }

  const logout = async () => {
    sessionStorage.removeItem("nexus_is_authed")
    sessionStorage.removeItem("nexus_employee_id")
    setIsTabAuthed(false)
    await supabase.auth.signOut()
  }

  const employeeId = isTabAuthed
    ? (user?.email
        ? user.email.replace("@factory.local", "").toUpperCase()
        : sessionStorage.getItem("nexus_employee_id"))
    : null

  const isAuthed = !!user && isTabAuthed

  return (
    <AuthContext.Provider value={{ employeeId, isAuthed, login, logout, ready, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}