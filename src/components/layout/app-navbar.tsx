"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
  shiftStatus = "closed",
  userName = "Kasir",
}: AppNavbarProps) {
  const pathname = usePathname()

  // Hide navbar on auth pages
  if (pathname?.startsWith("/auth")) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Mobile hamburger + Logo */}
        <div className="flex items-center gap-3">
          <Sheet>
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

            <SheetContent side="left" className="w-80">
              <SheetHeader className="space-y-2 border-b border-border pb-4">
                <SheetTitle className="flex items-center gap-2 text-left text-lg">
                  <Package className="size-5 text-primary" />
                  WP2 POS
                </SheetTitle>
                <SheetDescription className="text-left">
                  Navigasi kasir dan owner.
                </SheetDescription>
              </SheetHeader>

              <nav className="flex flex-col gap-2 p-4" aria-label="Navigasi mobile">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
            variant={shiftStatus === "active" ? "default" : "destructive"}
            className="hidden items-center gap-1.5 sm:inline-flex"
            aria-label={`Status shift: ${shiftStatus === "active" ? "aktif" : "tutup"}`}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {shiftStatus === "active" ? "Shift Aktif" : "Shift Tutup"}
          </Badge>

          {/* User menu button */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={`Menu pengguna: ${userName}`}
            aria-haspopup="true"
          >
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-28 truncate">{userName}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </button>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keluar dari aplikasi"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}
