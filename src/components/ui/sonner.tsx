"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// [KUSTOMISASI TOAST] Komponen ini mengatur tampilan popup notifikasi (Toast) di seluruh aplikasi.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      /* [KUSTOMISASI] Mengganti icon bawaan toast (Sukses, Info, Warning, Error, Loading) */
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      /* [KUSTOMISASI] Mengatur variabel CSS warna background, teks, border, dan kelengkungan sudut toast */
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      /* [KUSTOMISASI] Mengatur class CSS bawaan toast (Anda bisa menambahkan warna khusus untuk success/error di sini) */
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // [KUSTOMISASI CONTOH]: Un-comment baris di bawah untuk memberi background hijau pada toast sukses:
          // success: "bg-emerald-600 text-white border-emerald-700",
          // error: "bg-red-600 text-white border-red-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
