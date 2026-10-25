import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import * as authApi from "@/features/auth/api";
import { settingsSchema, type SettingsFormValues } from "@/features/auth/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { getTimezoneOptions } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";

const fieldClass = "h-9 rounded-xl px-3 text-xs font-medium";

export function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const timezones = useMemo(() => getTimezoneOptions(), []);

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      timezone: user?.timezone ?? "UTC",
    },
  });

  const displayName = watch("full_name") || user?.full_name || "Account";

  async function onSubmit(values: SettingsFormValues) {
    setSubmitting(true);
    try {
      const updated = await authApi.updateMe(values);
      setUser(updated);
      reset({ full_name: updated.full_name, timezone: updated.timezone });
      toast.success("Profile updated");
    } catch (error) {
      if (applyApiFieldErrors(error, setError)) return;
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">Your profile and how days are counted.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {userInitials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="full_name" className="text-xs">
                Full name
              </Label>
              <Input
                id="full_name"
                autoComplete="name"
                className={fieldClass}
                {...register("full_name")}
                aria-invalid={Boolean(errors.full_name)}
              />
              {errors.full_name ? (
                <p className="text-[11px] text-destructive">{errors.full_name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input
                id="email"
                value={user.email}
                disabled
                readOnly
                className={cn(fieldClass, "bg-muted text-stone-700")}
                aria-describedby="email-hint"
              />
              <p id="email-hint" className="text-[11px] text-muted-foreground">
                Your sign-in email can’t be changed.
              </p>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="timezone" className="text-xs">
                Timezone
              </Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select
                    id="timezone"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={timezones}
                    searchable
                    searchPlaceholder="Search timezones"
                    aria-describedby="timezone-hint"
                    aria-invalid={Boolean(errors.timezone)}
                    className={cn(fieldClass, "max-w-md")}
                  />
                )}
              />
              {errors.timezone ? (
                <p className="text-[11px] text-destructive">{errors.timezone.message}</p>
              ) : null}
              <p id="timezone-hint" className="text-[11px] text-muted-foreground">
                Your day starts and ends at midnight in this timezone, for totals and reports.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#F0EBE3] pt-3">
            <p className="text-[11px] text-muted-foreground">
              {isDirty ? "Unsaved changes" : "No unsaved changes"}
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !isDirty}
              className="disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            >
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Log out</h2>
          <p className="text-[11px] text-muted-foreground">
            Sign out of Calorie Tracker on this browser.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          Log out
        </Button>
      </section>
    </div>
  );
}

function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}
