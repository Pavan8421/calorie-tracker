import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  detectPreset,
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
}: DateRangePickerProps) {
  const allowed = presets.map((p) => p.id);
  const preset = detectPreset(startDate, endDate, allowed);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={preset === item.id ? "default" : "outline"}
            className={cn(preset === item.id && "pointer-events-none")}
            onClick={() => onChange(rangeForPreset(item.id))}
          >
            {item.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={preset === "custom" ? "default" : "outline"}
          onClick={() => onChange({ start_date: startDate, end_date: endDate })}
        >
          Custom
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => onChange({ start_date: e.target.value, end_date: endDate })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End date</Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => onChange({ start_date: startDate, end_date: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
