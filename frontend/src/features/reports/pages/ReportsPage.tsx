import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { CalorieTrendChart } from "@/features/reports/components/CalorieTrendChart";
import { GoalComparisonChart } from "@/features/reports/components/GoalComparisonChart";
import { MacroBreakdownChart } from "@/features/reports/components/MacroBreakdownChart";
import { MicronutrientSummary } from "@/features/reports/components/MicronutrientSummary";
import { rangeEndingToday } from "@/lib/dates";

const REPORT_PRESETS = [
  { id: "7d" as const, label: "7 days" },
  { id: "30d" as const, label: "30 days" },
  { id: "90d" as const, label: "90 days" },
];

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = useMemo(() => rangeEndingToday(7), []);
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");

  const startDate = searchParams.get("start_date") || defaults.start_date;
  const endDate = searchParams.get("end_date") || defaults.end_date;

  const range = useMemo(
    () => ({ start_date: startDate, end_date: endDate }),
    [startDate, endDate],
  );

  function updateRange(next: { start_date: string; end_date: string }) {
    const params = new URLSearchParams();
    params.set("start_date", next.start_date);
    params.set("end_date", next.end_date);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-extrabold tracking-tight">Reports</h1>
        <DateRangePicker
          compact
          startDate={startDate}
          endDate={endDate}
          onChange={updateRange}
          presets={REPORT_PRESETS}
        />
        <p className="text-[11px] text-muted-foreground">Up to 92 days in one range.</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <h2 className="text-sm font-bold">Calories per day</h2>
        <CalorieTrendChart range={range} />
      </section>

      <MacroBreakdownChart range={range} groupBy={groupBy} onGroupByChange={setGroupBy} />

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Goal vs actual</h2>
          <p className="text-[11px] text-muted-foreground">Only days with a goal in effect.</p>
        </div>
        <GoalComparisonChart range={range} />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Micronutrients</h2>
          <p className="text-[11px] text-muted-foreground">Daily average, percent of daily value.</p>
        </div>
        <MicronutrientSummary range={range} />
      </section>
    </div>
  );
}
