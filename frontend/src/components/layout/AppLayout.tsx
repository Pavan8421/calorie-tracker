import { Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <BrandMark to="/" size="sm" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0"
            aria-expanded={mobileOpen}
            aria-controls={drawerId}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </header>

        <main className="mx-auto flex w-full max-w-[1192px] min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <Outlet />
        </main>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-foreground/30 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close navigation"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobile}
        />
        <div
          id={drawerId}
          className={cn(
            "absolute inset-y-0 left-0 shadow-xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AppSidebar onNavigate={closeMobile} className="border-r border-border" />
        </div>
      </div>
    </div>
  );
}
