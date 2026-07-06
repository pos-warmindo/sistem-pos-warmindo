# Warmindo WP 2 POS

Aplikasi **Point of Sale (POS)** khusus untuk bisnis F&B (Warmindo). Aplikasi ini dibangun dengan teknologi modern untuk memastikan performa yang cepat, antarmuka yang ramah pengguna, serta manajemen data yang aman menggunakan Supabase.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Database & Auth**: Supabase
- **State Management**: React Hooks (Zustand/Context API)

## Fitur Utama

- **Role-Based Access Control (RBAC)**: Terdapat peran _Owner_ (manajemen penuh) dan _Cashier_ (operasional kasir harian).
- **Manajemen Kasir (POS)**: Katalog produk interaktif, manajemen varian menu, manajemen keranjang, kalkulasi harga dinamis.
- **Manajemen Shift**: Kasir harus memulai shift sebelum bisa menerima pesanan.
- **Manajemen Inventaris**: Pengurangan stok otomatis berdasarkan komposisi bahan baku setiap menu yang terjual.
- **Dashboard Owner**: Ringkasan performa harian/bulanan, tren penjualan, notifikasi stok menipis, manajemen menu dan _modifier_.

## Setup & Instalasi Lokal

### 1. Prasyarat
- Node.js (v18 atau lebih baru)
- npm atau yarn

### 2. Kloning Repositori
```bash
git clone <url-repo-kamu>
cd sistem-pos-warmindo
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment (Variabel Lingkungan)
Buat file `.env.local` di root proyek dan tambahkan kunci akses Supabase milikmu:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```
> **Penting:** Dapatkan kredensial ini dari dashboard proyek Supabase (Settings > API).

### 5. Setup Database (Supabase)
Semua skema database (Tabel, RLS Policies, Functions, Triggers) telah terdokumentasi dan dapat diimpor langsung.
Jika kamu memiliki Supabase CLI yang sudah terkonfigurasi, kamu bisa menjalankan sinkronisasi migrasi, atau jalankan SQL dump terbaru di _SQL Editor_ pada dashboard Supabase.

### 6. Jalankan Development Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browsermu.

## Struktur Proyek Utama

- `/src/app`: Konfigurasi routing utama Next.js (App Router).
- `/src/components`: Berisi komponen-komponen UI modular (Dashboard, POS, Layout, dan komponen `shadcn`).
- `/src/lib`: Hooks _custom_, _utility functions_, konfigurasi Supabase, dan ekspor Ikon tersentralisasi.
- `/src/types`: Definisi tipe data TypeScript (terutama skema Supabase).
- `/supabase`: Berisi skrip migrasi SQL dan trigger/fungsi untuk database.

## Standar Pengembangan

1. **Komponen**: Selalu prioritaskan penggunaan ulang komponen yang ada di folder `ui` (berbasis `shadcn/ui`).
2. **Icons**: Hanya gunakan ikon yang diekspor melalui file `/src/lib/icons.ts` (berbasis `lucide-react`).
3. **Penyimpanan State**: Operasi database langsung dilakukan via Supabase Client; state UI dijaga serendah mungkin menggunakan hooks bawaan React.

## Deployment

Aplikasi ini sangat cocok di-deploy ke Vercel:
1. Hubungkan repositori GitHub ini ke Vercel.
2. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada *Environment Variables* Vercel.
3. Klik Deploy.
