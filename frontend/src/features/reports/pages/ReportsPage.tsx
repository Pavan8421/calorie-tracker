import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            Trends and comparisons for a date range (max 92 days on the API).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={updateRange}
            presets={REPORT_PRESETS}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calorie trend</CardTitle>
          <CardDescription>Daily calories with goal line when a goal applies.</CardDescription>
        </CardHeader>
        <CardContent>
          <CalorieTrendChart range={range} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macro breakdown</CardTitle>
          <CardDescription>Stacked grams over time and calorie share.</CardDescription>
        </CardHeader>
        <CardContent>
          <MacroBreakdownChart
            range={range}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Micronutrients</CardTitle>
          <CardDescription>
            Daily average vs daily value (low / adequate / high).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MicronutrientSummary range={range} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goal vs actual</CardTitle>
          <CardDescription>
            Calories compared to the goal in effect each day, plus adherence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalComparisonChart range={range} />
        </CardContent>
      </Card>
    </div>
  );
}
