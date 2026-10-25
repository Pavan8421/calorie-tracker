import type { ReactNode } from "react";

import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/utils";

export const authFormCardClassName =
  "rounded-2xl border border-border bg-card px-6 py-7 shadow-[0_10px_30px_rgba(28,25,23,0.06)] sm:px-8";

type AuthSplitLayoutProps = {
  brand: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthSplitLayout({
  brand,
  children,
  className,
  contentClassName,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "grid min-h-svh bg-background text-foreground",
        "lg:h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:overflow-hidden",
        className,
      )}
    >
      <section
        className={cn(
          "relative flex flex-col overflow-hidden bg-primary-deep text-primary-foreground",
          "gap-6 px-8 py-8 sm:px-10 sm:py-9",
          "lg:h-full lg:min-h-0 lg:justify-between lg:gap-5 lg:px-12 lg:py-8",
        )}
      >
        <BrandMark inverted size="md" className="shrink-0" />
        {brand}
      </section>

      <section className="flex min-h-0 items-center justify-center overflow-hidden px-6 py-6 sm:px-10 lg:px-12 lg:py-5">
        <div className={cn("flex w-full max-w-[440px] flex-col gap-5", contentClassName)}>
          {children}
        </div>
      </section>
    </div>
  );
}

/** Decorative multi-segment ring used on the Sign in brand panel. */
export function AuthBrandRing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 232 232"
      aria-hidden="true"
      className={cn(
        "mx-auto aspect-square w-full max-h-[min(240px,32vh)] max-w-[240px] shrink",
        className,
      )}
    >
      <g transform="rotate(-90 116 116)" fill="none" strokeWidth="22">
        <circle cx="116" cy="116" r="96" className="stroke-[#1D605A]" />
        <circle
          cx="116"
          cy="116"
          r="96"
          className="stroke-[#9ED7CE]"
          strokeDasharray="118 485.19"
        />
        <circle
          cx="116"
          cy="116"
          r="96"
          className="stroke-accent-teal"
          strokeDasharray="168 435.19"
          strokeDashoffset="-122"
        />
        <circle
          cx="116"
          cy="116"
          r="96"
          className="stroke-accent-gold"
          strokeDasharray="76 527.19"
          strokeDashoffset="-294"
        />
      </g>
    </svg>
  );
}
