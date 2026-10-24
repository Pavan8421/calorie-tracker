import { User } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-10 rounded-full p-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <User className="h-4 w-4" aria-hidden="true" />
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-md"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="p-1">
            <MenuLink to="/settings" onSelect={() => setOpen(false)}>
              My profile
            </MenuLink>
            <MenuLink to="/settings" onSelect={() => setOpen(false)}>
              Settings
            </MenuLink>
            <button
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-destructive",
                "hover:bg-muted",
              )}
              onClick={() => {
                setOpen(false);
                void logout();
              }}
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  to,
  onSelect,
  children,
}: {
  to: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-muted"
      onClick={onSelect}
    >
      {children}
    </Link>
  );
}
