"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import { formatDateLabel } from "@/lib/utils/dateRange";

export type DailyRevenue = { date: string; total: number };

interface Props { data: DailyRevenue[] }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{formatDateLabel(label)}</p>
      <p className="font-bold text-orange-600">{formatRupiah(payload[0].value)}</p>
    </div>
  );
}

export default function RevenueChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
        Tidak ada data pendapatan pada periode ini.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    total: d.total,
    label: formatDateLabel(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fff7ed" }} />
        <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
