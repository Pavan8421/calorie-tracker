import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  /** When set, wraps the mark in a router link. Omit for decorative use. */
  to?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Use on dark/teal panels where the wordmark should be light. */
  inverted?: boolean;
  onClick?: () => void;
};

const sizeMap = {
  sm: { box: 24, stroke: 4 },
  md: { box: 30, stroke: 5 },
  lg: { box: 36, stroke: 5 },
} as const;

const wordmarkClass = {
  sm: "text-base font-extrabold tracking-tight",
  md: "text-[19px] font-extrabold tracking-tight",
  lg: "text-2xl font-extrabold tracking-tight",
} as const;

export function BrandMark({
  to,
  showWordmark = true,
  size = "md",
  className,
  inverted = false,
  onClick,
}: BrandMarkProps) {
  const { box, stroke } = sizeMap[size];
  const r = 12;
  const circumference = 2 * Math.PI * r;
  const progress = 0.41;
  const dash = circumference * progress;

  const content = (
    <>
      <svg
        width={box}
        height={box}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          className={inverted ? "stroke-[#2B6A64]" : "stroke-ring-track"}
          strokeWidth={stroke}
        />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          className={inverted ? "stroke-accent-teal" : "stroke-primary"}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
        />
      </svg>
      {showWordmark ? (
        <span
          className={cn(
            wordmarkClass[size],
            inverted ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Calorie Tracker
        </span>
      ) : (
        <span className="sr-only">Calorie Tracker</span>
      )}
    </>
  );

  const sharedClass = cn(
    "inline-flex items-center gap-2.5",
    inverted ? "text-primary-foreground" : "text-foreground",
    className,
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cn(sharedClass, "no-underline")}>
        {content}
      </Link>
    );
  }

  return (
    <div className={sharedClass} onClick={onClick}>
      {content}
    </div>
  );
}
