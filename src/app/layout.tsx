import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Toaster } from "@/components/ui/sonner";
import { ShiftProvider } from "@/lib/hooks/useShift";
import { CartProvider } from "@/lib/hooks/useCart";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Warmindo WP 2 POS",
  description: "Point of Sale System for Warmindo WP 2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ShiftProvider>
          <CartProvider>
            <AppNavbar />
            {children}
            <Toaster richColors position="top-right" />
          </CartProvider>
        </ShiftProvider>
      </body>
    </html>
  );
}
