"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useShift } from "@/lib/hooks/useShift"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import ShiftCloseModal from "@/components/pos/ShiftCloseModal"

import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  TrendingUp,
  User,
} from "@/lib/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigationItems = [
  { href: "/cashier/pos", label: "POS", icon: ShoppingCart },
  { href: "/owner/dashboard", label: "Dashboard", icon: TrendingUp },
]

type AppNavbarProps = {
  shiftStatus?: "active" | "closed"
  userName?: string
}

export function AppNavbar({
  shiftStatus: defaultShiftStatus,
  userName: defaultUserName = "Kasir",
}: AppNavbarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [displayName, setDisplayName] = useState(defaultUserName)
  const [role, setRole] = useState<string>("")
  useEffect(() => {
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch display name
        const { data: profile } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.display_name) {
          setDisplayName(profile.display_name)
        } else if (user.email) {
          setDisplayName(user.email.split("@")[0])
        }

        // Fetch role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("roles ( name )")
          .eq("user_id", user.id)
          .maybeSingle()

        const rel = roleData?.roles as any
        if (rel?.name) {
          setRole(rel.name)
        }
      } else {
        setDisplayName(defaultUserName)
        setRole("")
      }
    }
    getUserProfile()
  }, [supabase, pathname, defaultUserName])

  const { activeShift, closeShift, refreshShift } = useShift()

  // Refresh shift state on navigation/route changes
  useEffect(() => {
    refreshShift()
  }, [pathname, refreshShift])

  // Hide navbar on auth pages
  if (pathname?.startsWith("/auth")) {
    return null
  }

  const shiftActive = activeShift !== null
  const displayShiftStatus = defaultShiftStatus || (shiftActive ? "active" : "closed")

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Mobile hamburger + Logo */}
        <div className="flex items-center gap-3">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            {/* SheetTrigger renders its children as the trigger element */}
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Buka menu navigasi"
                />
              }
            >
              <Menu />
            </SheetTrigger>

            <SheetContent side="left" className="w-80 flex flex-col h-full">
              <SheetHeader className="space-y-2 border-b border-border pb-4">
                <SheetTitle className="flex items-center gap-2 text-left text-lg">
                  <Package className="size-5 text-primary" />
                  WP2 POS
                </SheetTitle>
                <SheetDescription className="text-left">
                  Navigasi kasir dan owner.
                </SheetDescription>
              </SheetHeader>

              <nav className="flex flex-col gap-2 py-4 flex-1 overflow-y-auto" aria-label="Navigasi mobile">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto border-t border-border pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <User className="size-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-heading">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shiftActive ? "Shift Aktif" : "Shift Tutup"}
                    </p>
                  </div>
                </div>
                {shiftActive && (
                  <Button
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsCloseModalOpen(true)
                    }}
                  >
                    Tutup Shift
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground"
            aria-label="Beranda WP2 POS"
          >
            <Package className="size-5 text-primary" />
            <span>WP2 POS</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: shift badge + user menu + logout */}
        <div className="ml-auto flex items-center gap-2">
          {/* Shift status badge */}
          <Badge
            variant={displayShiftStatus === "active" ? "default" : "destructive"}
            className="hidden items-center gap-1.5 sm:inline-flex"
            aria-label={`Status shift: ${displayShiftStatus === "active" ? "aktif" : "tutup"}`}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {displayShiftStatus === "active" ? "Shift Aktif" : "Shift Tutup"}
          </Badge>

          {/* Tutup Shift desktop button */}
          {shiftActive && (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 font-medium"
              onClick={() => setIsCloseModalOpen(true)}
            >
              Tutup Shift
            </Button>
          )}

          {/* User menu button */}
          <div
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium text-foreground select-none"
            aria-label={`Menu pengguna: ${displayName}`}
          >
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col items-start leading-none pr-1">
              <span className="max-w-28 truncate text-xs font-bold text-heading">
                {displayName}
              </span>
              <span className="text-[9px] text-muted-foreground capitalize font-semibold mt-0.5">
                {role === "owner" ? "Owner" : role === "cashier" ? "Kasir" : "Staff"}
              </span>
            </div>
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keluar dari aplikasi"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              sessionStorage.clear();
              window.location.href = "/auth/logout"
            }}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </div>
      {activeShift && (
        <ShiftCloseModal
          isOpen={isCloseModalOpen}
          onOpenChange={setIsCloseModalOpen}
          activeShift={activeShift}
          onCloseShift={async (cashCounted, notes) => {
            const data = await closeShift(cashCounted, notes)
            sessionStorage.setItem("shiftClosedThisSession", "true")
            toast.success("Shift berhasil ditutup.")
            return data;
          }}
        />
      )}
    </header>
  )
}
