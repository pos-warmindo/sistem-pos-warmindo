"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { AlertTriangle, LogOut, WifiOff } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type UserRole = "cashier" | "owner"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Track existing session so we can show "already logged in" state
  const [existingEmail, setExistingEmail] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // On mount: check if there's already an active session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setExistingEmail(data.user.email)
      }
      setCheckingSession(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogoutFirst = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setExistingEmail(null)
    setIsLoading(false)
    toast.success("Berhasil logout. Silakan login dengan akun lain.")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return
    setIsLoading(true)

    try {
      // If still has session, sign out first to prevent token conflict
      await supabase.auth.signOut()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message, {
          icon: <WifiOff className="size-4" />,
        })
        return
      }

      const userId = data.user?.id
      if (!userId) {
        toast.error("Session login tidak ditemukan.", {
          icon: <AlertTriangle className="size-4" />,
        })
        return
      }

      // Use get_my_role() RPC — SECURITY DEFINER bypasses RLS
      const { data: roleData, error: roleError } = await supabase
        .rpc("get_my_role")

      if (roleError) {
        console.error("[Login] get_my_role error:", roleError)
        // Fallback: try direct query
        const { data: fallbackRole } = await supabase
          .from("user_roles")
          .select("roles ( name )")
          .eq("user_id", userId)
          .maybeSingle()

        const rel = fallbackRole?.roles as unknown as { name?: UserRole } | null
        const name = rel?.name

        if (name === "owner") {
          router.push("/owner/dashboard")
          router.refresh()
          return
        }
        router.push("/cashier/pos")
        router.refresh()
        return
      }

      const roleName = roleData as UserRole | null

      if (roleName === "owner") {
        router.push("/owner/dashboard")
        router.refresh()
        return
      }

      router.push("/cashier/pos")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal.", {
        icon: <AlertTriangle className="size-4" />,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Loading skeleton while checking session
  if (checkingSession) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="h-64 w-full max-w-md animate-pulse rounded-2xl bg-muted" />
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-medium tracking-[0.25em] text-primary">
            WARMINDO WP 2
          </p>
          <h1 className="text-2xl font-semibold">Login POS</h1>
          <p className="text-sm text-muted-foreground">
            Masuk menggunakan email dan password akun kasir atau owner.
          </p>
        </div>

        {/* Already logged in banner */}
        {existingEmail && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-amber-800">
                Sesi aktif:
              </p>
              <p className="text-sm font-semibold text-amber-900">
                {existingEmail}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoutFirst}
              disabled={isLoading}
              className="shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              <LogOut className="size-3.5" />
              Logout
            </Button>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="kasir@warmindo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </section>
    </main>
  )
}
