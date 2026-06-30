/**
 * Utility helpers for date range filtering in the laporan page.
 */

export type PeriodKey = "today" | "7days" | "30days" | "thisMonth" | "custom";

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

export function getPeriodRange(period: PeriodKey, custom?: DateRange): DateRange {
  const now = new Date();
  const toDate = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { from: toDate, to: toDate };
    case "7days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to: toDate };
    }
    case "30days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split("T")[0], to: toDate };
    }
    case "thisMonth": {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return { from, to: toDate };
    }
    case "custom":
      return custom ?? { from: toDate, to: toDate };
  }
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
