import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { formatDateISO, parseLocalDate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePicker({
  id,
  name,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled = false,
  placeholder = "Select date",
  clearable = false,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? parseLocalDate(value) : new Date()));
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const selected = value ? parseLocalDate(value) : null;
  const today = todayISO();

  useEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 280;
      const height = 320;
      const gap = 6;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < height && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        left,
        width,
        zIndex: 60,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const frame = window.requestAnimationFrame(() => menuRef.current?.focus());
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      onBlurRef.current?.();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      onBlurRef.current?.();
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setView(value ? parseLocalDate(value) : new Date());
    setOpen(true);
  }

  function choose(day: Date) {
    const next = formatDateISO(day);
    if (isDisabled(next, min, max)) return;
    onChange(next);
    setOpen(false);
    onBlur?.();
    triggerRef.current?.focus();
  }

  const days = monthGrid(view);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-card px-3 text-left text-xs font-medium text-foreground outline-none",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          ariaInvalid && "border-destructive",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "font-normal text-muted-foreground")}>
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </span>
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="dialog"
              aria-label="Choose a date"
              tabIndex={-1}
              style={menuStyle}
              className="rounded-xl border border-border bg-card p-3 shadow-lg outline-none"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-700 hover:bg-muted"
                  aria-label="Previous month"
                  onClick={() => setView((current) => subMonths(current, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-xs font-bold">{format(view, "MMMM yyyy")}</p>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-700 hover:bg-muted"
                  aria-label="Next month"
                  onClick={() => setView((current) => addMonths(current, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-muted-foreground">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const iso = formatDateISO(day);
                  const inMonth = isSameMonth(day, view);
                  const isSelected = selected ? isSameDay(day, selected) : false;
                  const isToday = iso === today;
                  const blocked = isDisabled(iso, min, max);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={blocked}
                      onClick={() => choose(day)}
                      className={cn(
                        "h-8 rounded-lg text-xs font-semibold",
                        !inMonth && "text-muted-foreground/50",
                        inMonth && !isSelected && "text-foreground hover:bg-muted",
                        isToday && !isSelected && "bg-primary-soft text-primary-ink",
                        isSelected && "bg-primary text-primary-foreground",
                        blocked && "cursor-not-allowed opacity-30 hover:bg-transparent",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#F0EBE3] pt-2">
                <button
                  type="button"
                  className="h-7 rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary-soft disabled:opacity-40"
                  disabled={isDisabled(today, min, max)}
                  onClick={() => choose(parseLocalDate(today))}
                >
                  Today
                </button>
                {clearable && value ? (
                  <button
                    type="button"
                    className="h-7 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                      onBlur?.();
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function monthGrid(view: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 1 }),
  });
}

function isDisabled(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}
