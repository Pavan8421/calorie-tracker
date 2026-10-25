import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthBrandRing,
  AuthSplitLayout,
  authFormCardClassName,
} from "@/features/auth/components/AuthSplitLayout";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { useAuth } from "@/providers/auth-context";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    try {
      await login(values);
      navigate(from, { replace: true });
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
          <div className="hidden min-h-0 flex-1 items-center justify-center py-1 lg:flex">
            <AuthBrandRing />
          </div>
          <div className="flex max-w-[420px] shrink-0 flex-col gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-[28px] sm:leading-[1.2]">
              See where every calorie goes.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#C5E8E2] sm:text-base">
              Log meals by hand, from a photo or in chat, and watch the day fill up against your
              goal.
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-[32px]">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Welcome back. Use your email and password.
        </p>
      </div>

      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-[15px] font-semibold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-[15px] font-semibold">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full text-base font-bold" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-[15px] text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-bold text-foreground no-underline hover:text-primary">
          Create an account
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
