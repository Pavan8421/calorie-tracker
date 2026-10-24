import { format, subDays } from "date-fns";

/** Local calendar date as `YYYY-MM-DD`. */
export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayISO(): string {
  return formatDateISO(new Date());
}

/** Default list range: today and the previous 6 days (7 days total). */
export function defaultEntryRange(): { start_date: string; end_date: string } {
  return rangeEndingToday(7);
}

/** Inclusive day span ending today (e.g. 7 → today + previous 6 days). */
export function rangeEndingToday(days: number): { start_date: string; end_date: string } {
  const end = new Date();
  const start = subDays(end, Math.max(days, 1) - 1);
  return { start_date: formatDateISO(start), end_date: formatDateISO(end) };
}

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export function rangeForPreset(
  preset: Exclude<DateRangePreset, "custom">,
): { start_date: string; end_date: string } {
  if (preset === "today") {
    const day = todayISO();
    return { start_date: day, end_date: day };
  }
  if (preset === "7d") return rangeEndingToday(7);
  if (preset === "30d") return rangeEndingToday(30);
  return rangeEndingToday(90);
}

export function detectPreset(
  start: string,
  end: string,
  allowed: Exclude<DateRangePreset, "custom">[] = ["today", "7d", "30d"],
): DateRangePreset {
  for (const id of allowed) {
    const range = rangeForPreset(id);
    if (start === range.start_date && end === range.end_date) return id;
  }
  return "custom";
}
