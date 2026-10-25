import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Array<SelectOption | string>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Select({
  id,
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search",
  disabled = false,
  searchable = false,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const items = useMemo(() => normalizeOptions(options), [options]);
  const selected = items.find((item) => item.value === value) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = 280;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 60,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const frame = window.requestAnimationFrame(() => {
      if (searchRef.current) searchRef.current.focus();
      else menuRef.current?.focus();
    });

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = menuRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      onBlurRef.current?.();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    onBlur?.();
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    onBlur?.();
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const selectedIndex = items.findIndex((item) => item.value === value);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) choose(option.value);
    }
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        onClick={() => {
          if (disabled) return;
          if (open) {
            close();
            return;
          }
          const selectedIndex = items.findIndex((item) => item.value === value);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setOpen(true);
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-card px-3.5 text-left text-base font-medium text-foreground outline-none transition-colors",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          ariaInvalid && "border-destructive",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "font-normal text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-labelledby={id}
              tabIndex={-1}
              style={menuStyle}
              onKeyDown={onMenuKeyDown}
              onMouseDown={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("input, textarea")) return;
                event.preventDefault();
              }}
              className="overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg"
            >
              {searchable ? (
                <div className="border-b border-border p-2">
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>
              ) : null}
              <div className="max-h-56 overflow-y-auto p-1 [scrollbar-color:#d9d0c2_transparent] [scrollbar-width:thin]">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        data-index={index}
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(option.value)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                          isSelected
                            ? "bg-primary-soft font-semibold text-primary-ink"
                            : "text-foreground",
                          isActive && !isSelected && "bg-muted",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function normalizeOptions(options: Array<SelectOption | string>): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
}
