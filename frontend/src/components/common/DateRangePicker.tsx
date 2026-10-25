import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  detectPreset,
  parseLocalDate,
  rangeForPreset,
  type DateRangePreset,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

type PresetOption = { id: Exclude<DateRangePreset, "custom">; label: string };

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (range: { start_date: string; end_date: string }) => void;
  presets?: PresetOption[];
  /** Chips plus a range label. Date inputs show only for Custom. */
  compact?: boolean;
};

const DEFAULT_PRESETS: PresetOption[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  presets = DEFAULT_PRESETS,
  compact = false,
}: DateRangePickerProps) {
  const allowed = presets.map((p) => p.id);
  const preset = detectPreset(startDate, endDate, allowed);
  const [customOpen, setCustomOpen] = useState(false);
  const customSelected = customOpen || preset === "custom";

  return (
    <div className={compact ? "flex flex-col gap-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((item) => (
          <RangeChip
            key={item.id}
            active={!customSelected && preset === item.id}
            compact={compact}
            onClick={() => {
              setCustomOpen(false);
              onChange(rangeForPreset(item.id));
            }}
          >
            {item.label}
          </RangeChip>
        ))}
        <RangeChip
          active={customSelected}
          compact={compact}
          onClick={() => setCustomOpen(true)}
        >
          Custom
        </RangeChip>
        {compact ? (
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {formatRangeLabel(startDate, endDate)}
          </span>
        ) : null}
      </div>

      {!compact || customSelected ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <DatePicker
            id="start_date"
            value={startDate}
            max={endDate}
            onChange={(next) => onChange({ start_date: next, end_date: endDate })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End date</Label>
          <DatePicker
            id="end_date"
            value={endDate}
            min={startDate}
            onChange={(next) => onChange({ start_date: startDate, end_date: next })}
          />
        </div>
      </div>
      ) : null}
    </div>
  );
}

function RangeChip({
  active,
  compact,
  onClick,
  children,
}: {
  active: boolean;
  compact: boolean;
  onClick: () => void;
  children: string;
}) {
  if (!compact) {
    return (
      <Button
        type="button"
        size="sm"
        variant={active ? "default" : "outline"}
        className={cn(active && "pointer-events-none")}
        onClick={onClick}
      >
        {children}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 rounded-lg px-2.5 text-xs font-semibold",
        active ? "bg-primary-soft text-primary-ink" : "text-stone-700 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function formatRangeLabel(start: string, end: string): string {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (start === end) return format(startDate, "d MMM yyyy");
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "d MMM")} – ${format(endDate, "d MMM yyyy")}`;
  }
  return `${format(startDate, "d MMM yyyy")} – ${format(endDate, "d MMM yyyy")}`;
}
