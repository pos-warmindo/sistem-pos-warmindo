"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { AlertTriangle, WifiOff } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type UserRole = "cashier" | "owner"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
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

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("roles ( name )")
        .eq("user_id", userId)
        .maybeSingle()

      if (roleError || !roleData) {
        toast.error("Gagal membaca role pengguna.", {
          icon: <AlertTriangle className="size-4" />,
        })
        return
      }

      const roleRelation = roleData.roles as unknown as
        | { name?: UserRole }
        | { name?: UserRole }[]
        | null

      const roleName = Array.isArray(roleRelation)
        ? roleRelation[0]?.name
        : roleRelation?.name

      if (roleName === "owner") {
        router.push("/owner/dashboard")
        router.refresh()
        return
      }

      router.push("/cashier/pos")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login gagal.", {
        icon: <AlertTriangle className="size-4" />,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-medium tracking-[0.25em] text-primary">
            WARMINDO WP 2
          </p>
          <h1 className="text-2xl font-semibold text-heading">Login POS</h1>
          <p className="text-sm text-muted-foreground">
            Masuk menggunakan email dan password akun kasir atau owner.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="kasir@warmindo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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