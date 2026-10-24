import { NavLink, Outlet } from "react-router-dom";

import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/log", label: "Log meal" },
  { to: "/entries", label: "Entries" },
  { to: "/reports", label: "Reports" },
  { to: "/goals", label: "Goals" },
  { to: "/chat", label: "Chat" },
  { to: "/import", label: "Import" },
];

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-6 rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
          <div className="mb-6 px-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal</p>
            <h1 className="text-xl font-semibold text-primary">Calorie Tracker</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium text-teal-900"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Track meals, goals, and nutrition trends in one place.
          </p>
          <UserMenu />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
