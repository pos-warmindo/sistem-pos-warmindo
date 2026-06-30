"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatRupiah } from "@/lib/utils/format";

export type PaymentMethodData = { method: string; count: number; total: number };

interface Props { data: PaymentMethodData[] }

const COLORS: Record<string, string> = {
  TUNAI: "#f97316",
  QRIS:  "#3b82f6",
};
const FALLBACK_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = payload[0].payload.__total ?? 0;
  const pct = total > 0 ? ((d.total / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{d.method}</p>
      <p className="text-slate-500">{d.count} transaksi</p>
      <p className="font-bold" style={{ color: COLORS[d.method] ?? FALLBACK_COLORS[0] }}>
        {formatRupiah(d.total)} ({pct}%)
      </p>
    </div>
  );
}

export default function PaymentMethodChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-slate-400">
        Tidak ada data pembayaran pada periode ini.
      </div>
    );
  }

  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const chartData  = data.map((d) => ({ ...d, __total: grandTotal }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="total"
          nameKey="method"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
        >
          {chartData.map((entry, i) => (
            <Cell
              key={entry.method}
              fill={COLORS[entry.method] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs font-semibold text-slate-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
