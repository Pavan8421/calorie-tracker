import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AuthSplitLayout, authFormCardClassName } from "@/features/auth/components/AuthSplitLayout";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { cn } from "@/lib/utils";
import { getBrowserTimezone, getTimezoneOptions } from "@/lib/timezones";
import { useAuth } from "@/providers/auth-context";

const fieldControlClass =
  "h-10 rounded-xl border-border-strong px-3 text-sm font-medium";

const onboardingSteps = [
  "Create your account",
  "Set a daily calorie and macro goal",
  "Log your first meal, or import a food diary PDF",
] as const;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const timezones = useMemo(() => getTimezoneOptions(), []);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      timezone: getBrowserTimezone(),
    },
  });

  const password = useWatch({ control, name: "password", defaultValue: "" }) ?? "";
  const passwordHints = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "A letter", met: /[A-Za-z]/.test(password) },
    { label: "A digit", met: /\d/.test(password) },
  ];

  async function onSubmit(values: RegisterFormValues) {
    setSubmitting(true);
    try {
      await registerAccount({
        ...values,
        email: values.email.trim().toLowerCase(),
      });
      toast.success("Account created");
      navigate("/", { replace: true });
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

  return (
    <AuthSplitLayout
      contentClassName={authFormCardClassName}
      brand={
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
            <h2 className="max-w-[420px] text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-[28px] sm:leading-[1.2]">
              Set up in a minute.
            </h2>
            <ol className="flex max-w-[420px] flex-col gap-3.5 text-[15px] leading-relaxed text-[#C5E8E2] sm:text-base">
              {onboardingSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D605A] text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="shrink-0 text-sm text-[#9ED7CE]">Your data stays in your account.</p>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Already have one?{" "}
          <Link to="/login" className="font-bold text-foreground no-underline hover:text-primary">
            Sign in
          </Link>
        </p>
      </div>

      <form className="flex flex-col gap-2.5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-1">
          <Label htmlFor="full_name" className="text-sm font-semibold">
            Full name
          </Label>
          <Input
            id="full_name"
            autoComplete="name"
            className={fieldControlClass}
            {...register("full_name")}
            aria-invalid={Boolean(errors.full_name)}
          />
          {errors.full_name ? (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="email" className="text-sm font-semibold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldControlClass}
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" className="text-sm font-semibold">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-hints"
            className={fieldControlClass}
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
          <p id="password-hints" className="flex flex-wrap gap-x-4 text-xs font-semibold">
            {passwordHints.map((hint) => (
              <span
                key={hint.label}
                className={cn(hint.met ? "text-primary" : "text-muted-foreground")}
              >
                {hint.label}
              </span>
            ))}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="timezone" className="text-sm font-semibold">
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
                className={fieldControlClass}
              />
            )}
          />
          {errors.timezone ? (
            <p className="text-xs text-destructive">{errors.timezone.message}</p>
          ) : null}
          <p id="timezone-hint" className="text-xs text-muted-foreground">
            Detected from your browser. Days start at midnight in this timezone.
          </p>
        </div>

        <Button type="submit" className="mt-1 w-full font-bold" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
