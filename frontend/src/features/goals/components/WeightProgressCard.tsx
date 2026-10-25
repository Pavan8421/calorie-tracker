import { format } from "date-fns";

import type { CurrentGoal } from "@/features/goals/types";
import { parseLocalDate } from "@/lib/dates";
import { formatDecimal, toNumber } from "@/lib/numbers";

type WeightProgressCardProps = {
  goal: CurrentGoal | null;
};

export function WeightProgressCard({ goal }: WeightProgressCardProps) {
  const progress = goal?.weight_progress ?? null;
  const target = toNumber(goal?.target_weight_kg);
  const targetDate = goal?.target_date
    ? format(parseLocalDate(goal.target_date), "d MMM yyyy")
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Weight</h2>
        <span className="text-[11px] text-muted-foreground">
          {target != null
            ? `Target ${formatDecimal(target)} kg${targetDate ? ` by ${targetDate}` : ""}`
            : "No target yet"}
        </span>
      </div>

      {progress ? <ProgressBody progress={progress} /> : (
        <p className="text-xs text-muted-foreground">
          Log a weight to see how far you are from your target.
        </p>
      )}
    </div>
  );
}

function ProgressBody({
  progress,
}: {
  progress: NonNullable<CurrentGoal["weight_progress"]>;
}) {
  const start = toNumber(progress.start_kg) ?? 0;
  const current = toNumber(progress.current_kg) ?? 0;
  const target = toNumber(progress.target_kg) ?? 0;
  const toGo = Math.abs(current - target);
  const delta = current - start;
  const markers = scaleMarkers(start, current, target);
  const bandLeft = Math.min(markers.target, markers.now);
  const bandWidth = Math.abs(markers.now - markers.target);

  const since =
    Math.abs(delta) < 0.05
      ? "Same weight as when you started."
      : `${delta > 0 ? "Up" : "Down"} ${formatDecimal(Math.abs(delta))} kg since you started.`;

  return (
    <>
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight">{formatDecimal(current)}</span>
        <span className="text-xs text-muted-foreground">
          kg today, {toGo < 0.05 ? "on target" : `${formatDecimal(toGo)} kg to go`}
        </span>
      </p>
      <div
        className="relative h-12"
        role="img"
        aria-label={`Target ${formatDecimal(target)} kg, start ${formatDecimal(start)} kg, current ${formatDecimal(current)} kg`}
      >
        <div className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-ring-track" />
        {bandWidth > 0.5 ? (
          <div
            className="absolute top-2 h-1.5 bg-[#C27A12]/35"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
          />
        ) : null}
        {placedMarkers(markers, start, current, target).map((marker) => (
          <Marker key={marker.kind} {...marker} />
        ))}
      </div>
      <p className="text-xs text-stone-700">{since}</p>
    </>
  );
}

type MarkerAlign = "start" | "center" | "end";
type MarkerKind = "target" | "start" | "now";

function Marker({
  left,
  kind,
  label,
  align,
}: {
  left: number;
  kind: MarkerKind;
  label: string;
  align: MarkerAlign;
}) {
  const shift = align === "start" ? "translate-x-0" : align === "end" ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <>
      <span
        className={
          kind === "target"
            ? "absolute top-0.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-white"
            : kind === "start"
              ? "absolute top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#B8AD9C]"
              : "absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow-[0_0_0_1px_#1C1917]"
        }
        style={{ left: `${left}%` }}
      />
      <span
        className={
          kind === "target"
            ? `absolute top-6 ${shift} whitespace-nowrap text-[11px] font-semibold text-primary`
            : kind === "start"
              ? `absolute top-6 ${shift} whitespace-nowrap text-[11px] text-muted-foreground`
              : `absolute top-6 ${shift} whitespace-nowrap text-[11px] font-bold`
        }
        style={{ left: `${left}%` }}
      >
        {label}
      </span>
    </>
  );
}

function placedMarkers(
  markers: { target: number; start: number; now: number },
  start: number,
  current: number,
  target: number,
) {
  const items: { kind: MarkerKind; left: number; label: string }[] = [
    { kind: "target", left: markers.target, label: `Target ${formatDecimal(target)}` },
    { kind: "now", left: markers.now, label: `Now ${formatDecimal(current)}` },
  ];
  const startClear =
    Math.abs(markers.start - markers.now) >= 14 && Math.abs(markers.start - markers.target) >= 14;
  if (startClear) {
    items.push({ kind: "start", left: markers.start, label: `Start ${formatDecimal(start)}` });
  }

  const sorted = [...items].sort((a, b) => a.left - b.left);
  return items.map((item) => {
    const index = sorted.findIndex((entry) => entry.kind === item.kind);
    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    let align: MarkerAlign = "center";
    if (item.left <= 8) align = "start";
    else if (item.left >= 92) align = "end";
    else if (next && next.left - item.left < 18) align = "end";
    else if (prev && item.left - prev.left < 18) align = "start";
    return { ...item, align };
  });
}

function scaleMarkers(start: number, current: number, target: number) {
  const min = Math.min(start, current, target);
  const max = Math.max(start, current, target);
  const span = Math.max(max - min, 1);
  const pad = span * 0.18;
  const lo = min - pad;
  const hi = max + pad;
  const pct = (value: number) => ((value - lo) / (hi - lo)) * 100;
  return { target: pct(target), start: pct(start), now: pct(current) };
}
