"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Home,
  Package,
  UtensilsCrossed,
  FileText,
  LogOut,
  User,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function OwnerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [ownerName, setOwnerName] = useState<string>("Owner");
  const [ownerEmail, setOwnerEmail] = useState<string>("");

  useEffect(() => {
    async function getOwnerProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOwnerEmail(user.email || "");
        const { data: profile } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setOwnerName(profile.display_name);
        } else if (user.email) {
          setOwnerName(user.email.split("@")[0]);
        }
      }
    }
    getOwnerProfile();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Berhasil keluar.");
      router.push("/auth/login");
    } catch (err: any) {
      console.error("Logout error:", err);
      toast.error("Gagal keluar dari sesi.");
    }
  };

  const navItems: NavigationItem[] = [
    { name: "Beranda", href: "/owner/dashboard", icon: Home },
    { name: "Menu",    href: "/owner/menu",       icon: UtensilsCrossed },
    { name: "Stok",    href: "/owner/stok",        icon: Package },
    { name: "Laporan", href: "/owner/laporan",     icon: FileText },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white shadow-sm z-20">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <Link href="/owner/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">WP2 POS Owner</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center space-x-3 px-2 py-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{ownerName}</p>
              <p className="text-xs text-slate-400 truncate">{ownerEmail || "Owner Account"}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-500"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-red-500" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 md:pl-60 pb-20 md:pb-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center justify-between px-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <Link href="/owner/dashboard">
            <span className="text-lg font-bold text-primary">WP2 POS Owner</span>
          </Link>
          <div className="flex items-center space-x-2 text-slate-800 text-sm font-medium">
            <span className="truncate max-w-[100px]">{ownerName}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto focus:outline-none">{children}</div>
      </div>

      {/* ── Bottom Nav Mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-md flex justify-around py-2 px-1 z-30 shadow-lg pb-safe">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 rounded-md transition-all duration-200",
                isActive ? "text-orange-500" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-semibold tracking-wider">
                {item.name}
              </span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 py-1 rounded-md text-red-500 hover:text-red-700 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-semibold tracking-wider">Keluar</span>
        </button>
      </nav>
    </div>
  );
}
