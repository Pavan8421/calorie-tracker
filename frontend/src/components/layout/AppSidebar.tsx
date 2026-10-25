import {
  BarChart3,
  ChevronUp,
  CircleGauge,
  List,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";

const navItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Today", icon: CircleGauge, end: true },
  { to: "/log", label: "Log meal", icon: Plus },
  { to: "/entries", label: "Entries", icon: List },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/import", label: "Import", icon: Upload },
];

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = userInitials(user?.full_name ?? "");
  const onSettings = location.pathname === "/settings";

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <aside
      className={cn(
        "flex h-full w-[248px] shrink-0 flex-col gap-7 bg-background px-4 pb-6 pt-7 text-foreground",
        className,
      )}
    >
      <BrandMark to="/" className="px-3" onClick={onNavigate} />

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline transition-colors",
                  isActive
                    ? "bg-primary-soft font-bold text-primary-ink"
                    : "font-medium text-stone-700 hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div ref={menuRef} className="relative mt-auto border-t border-border pt-4">
        {menuOpen ? (
          <div
            role="menu"
            aria-label="Account"
            className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-border bg-card p-1 shadow-lg"
          >
            <NavLink
              to="/settings"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
              }}
              className={({ isActive }) =>
                cn(
                  "flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold no-underline",
                  isActive
                    ? "bg-primary-soft text-primary-ink"
                    : "text-stone-700 hover:bg-muted",
                )
              }
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Settings
            </NavLink>
            <button
              type="button"
              role="menuitem"
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-stone-700 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
                void logout();
              }}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Log out
            </button>
          </div>
        ) : null}

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
            menuOpen || onSettings
              ? "bg-primary-soft text-primary-ink"
              : "text-foreground hover:bg-muted",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">{user?.full_name ?? "Account"}</span>
            <span className="truncate text-[11px] text-muted-foreground">{user?.email}</span>
          </span>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              menuOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </aside>
  );
}

function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}
