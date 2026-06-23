import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <AppNavbar />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
