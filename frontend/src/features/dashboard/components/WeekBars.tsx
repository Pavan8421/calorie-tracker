import { format } from "date-fns";
import { Link } from "react-router-dom";

import type { CalorieTrendPoint } from "@/features/reports/types";
import { formatKcal } from "@/features/dashboard/meals";
import { parseLocalDate } from "@/lib/dates";
import { toNumber } from "@/lib/numbers";

type WeekBarsProps = {
  points: CalorieTrendPoint[];
  today: string;
  loading?: boolean;
};

export function WeekBars({ points, today, loading = false }: WeekBarsProps) {
  const values = points.map((point) => toNumber(point.calories) ?? 0);
  const goal =
    [...points].reverse().find((point) => point.goal_calories != null)?.goal_calories ?? null;
  const max = Math.max(goal ?? 0, ...values, 1);
  const emptyDays = points
    .filter((point) => (toNumber(point.calories) ?? 0) <= 0)
    .map((point) => format(parseLocalDate(point.day), "EEE"));

  const caption = [
    goal != null ? `Goal ${formatKcal(goal)} kcal.` : "No calorie goal for this week.",
    emptyDays.length > 0 ? `Nothing logged ${joinLabels(emptyDays)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">Last 7 days</h2>
        <Link to="/reports" className="text-xs font-semibold text-foreground no-underline hover:text-primary">
          Open reports
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading the week…</p>
      ) : (
        <>
          <div className="relative h-[112px]">
            {goal != null ? (
              <div
                className="absolute inset-x-0 border-t-[1.5px] border-dashed border-[#B8AD9C]"
                style={{ bottom: `${(goal / max) * 104}px` }}
                aria-hidden="true"
              />
            ) : null}
            <div
              className="absolute inset-x-0 bottom-0 grid h-[104px] grid-cols-7 items-end gap-2"
              role="img"
              aria-label={caption}
            >
              {points.map((point) => {
                const calories = toNumber(point.calories) ?? 0;
                const isToday = point.day === today;
                const height = calories <= 0 ? 3 : Math.max(8, (calories / max) * 104);
                return (
                  <div
                    key={point.day}
                    className={
                      calories <= 0
                        ? "rounded-sm bg-border"
                        : isToday
                          ? "rounded-t-lg rounded-b-sm bg-accent-teal"
                          : "rounded-t-lg rounded-b-sm bg-primary"
                    }
                    style={{ height }}
                    title={`${format(parseLocalDate(point.day), "EEE")} ${formatKcal(calories)} kcal`}
                  />
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
            {points.map((point) => (
              <span
                key={point.day}
                className={point.day === today ? "font-bold text-foreground" : undefined}
              >
                {point.day === today ? "Today" : format(parseLocalDate(point.day), "EEE")}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-stone-700">
            <span className="inline-block w-4 border-t-[1.5px] border-dashed border-[#B8AD9C]" />
            {caption}
          </p>
        </>
      )}
    </section>
  );
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
