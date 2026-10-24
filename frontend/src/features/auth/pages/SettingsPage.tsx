import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as authApi from "@/features/auth/api";
import { settingsSchema, type SettingsFormValues } from "@/features/auth/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { getTimezoneOptions } from "@/lib/timezones";
import { useAuth } from "@/providers/auth-context";

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const timezones = useMemo(() => getTimezoneOptions(), []);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      timezone: user?.timezone ?? "UTC",
    },
  });

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
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>My profile</CardTitle>
          <CardDescription>Update your display name and timezone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled readOnly />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                autoComplete="name"
                {...register("full_name")}
                aria-invalid={Boolean(errors.full_name)}
              />
              {errors.full_name ? (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register("timezone")}
                aria-invalid={Boolean(errors.timezone)}
              >
                {timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              {errors.timezone ? (
                <p className="text-xs text-destructive">{errors.timezone.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={submitting || !isDirty}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
