"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

export type TopProduct = { name: string; qty: number };

interface Props { data: TopProduct[] }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{payload[0].payload.name}</p>
      <p className="font-bold text-orange-600">{payload[0].value} terjual</p>
    </div>
  );
}

export default function TopProductsChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">
        Tidak ada data produk pada periode ini.
      </div>
    );
  }

  // Truncate long names for display
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 18 ? d.name.substring(0, 16) + "…" : d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          width={110}
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fff7ed" }} />
        <Bar dataKey="qty" radius={[0, 6, 6, 0]} maxBarSize={24}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={i === 0 ? "#f97316" : i === 1 ? "#fb923c" : "#fdba74"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
