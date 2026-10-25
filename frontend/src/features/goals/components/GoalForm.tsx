import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateGoal } from "@/features/goals/hooks";
import { goalFormSchema, type GoalFormValues } from "@/features/goals/schemas";
import type { CurrentGoal } from "@/features/goals/types";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { toNumber } from "@/lib/numbers";

type GoalFormProps = {
  current?: CurrentGoal | null;
  formId?: string;
};

const fieldClass = "h-9 rounded-xl px-3 text-xs font-medium";

function toFormValues(goal?: CurrentGoal | null): GoalFormValues {
  if (!goal) {
    return {
      calories_kcal: 2000,
      protein_g: 150,
      carbs_g: 200,
      fat_g: 60,
      fiber_g: 30,
      target_weight_kg: undefined,
      target_date: undefined,
      effective_from: undefined,
    };
  }
  return {
    calories_kcal: goal.calories_kcal,
    protein_g: toNumber(goal.protein_g) ?? 0,
    carbs_g: toNumber(goal.carbs_g) ?? 0,
    fat_g: toNumber(goal.fat_g) ?? 0,
    fiber_g: toNumber(goal.fiber_g) ?? undefined,
    target_weight_kg: toNumber(goal.target_weight_kg) ?? undefined,
    target_date: goal.target_date ?? undefined,
    effective_from: undefined,
  };
}

export function GoalForm({ current, formId = "goal-form" }: GoalFormProps) {
  const createGoal = useCreateGoal();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: toFormValues(current),
  });

  useEffect(() => {
    reset(toFormValues(current));
  }, [current, reset]);

  const protein = Number(watch("protein_g")) || 0;
  const carbs = Number(watch("carbs_g")) || 0;
  const fat = Number(watch("fat_g")) || 0;
  const macroKcal = Math.round(protein * 4 + carbs * 4 + fat * 9);

  async function onSubmit(values: GoalFormValues) {
    try {
      await createGoal.mutateAsync({
        calories_kcal: values.calories_kcal,
        protein_g: values.protein_g,
        carbs_g: values.carbs_g,
        fat_g: values.fat_g,
        fiber_g: values.fiber_g ?? null,
        target_weight_kg: values.target_weight_kg ?? null,
        target_date: values.target_date ?? null,
        effective_from: values.effective_from ?? null,
      });
    } catch (error) {
      applyApiFieldErrors(error, setError);
    }
  }

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="calories_kcal" label="Calories, kcal" required error={errors.calories_kcal?.message}>
          <Input
            id="calories_kcal"
            type="number"
            step={1}
            className={fieldClass}
            {...register("calories_kcal")}
            aria-invalid={Boolean(errors.calories_kcal)}
          />
        </Field>
        <Field id="protein_g" label="Protein, g" dot="#115E59" required error={errors.protein_g?.message}>
          <Input
            id="protein_g"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("protein_g")}
            aria-invalid={Boolean(errors.protein_g)}
          />
        </Field>
        <Field id="carbs_g" label="Carbs, g" dot="#E3A828" required error={errors.carbs_g?.message}>
          <Input
            id="carbs_g"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("carbs_g")}
            aria-invalid={Boolean(errors.carbs_g)}
          />
        </Field>
        <Field id="fat_g" label="Fat, g" dot="#8A68B4" required error={errors.fat_g?.message}>
          <Input
            id="fat_g"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("fat_g")}
            aria-invalid={Boolean(errors.fat_g)}
          />
        </Field>
        <Field id="fiber_g" label="Fiber, g" error={errors.fiber_g?.message}>
          <Input
            id="fiber_g"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("fiber_g")}
            aria-invalid={Boolean(errors.fiber_g)}
          />
        </Field>
        <Field
          id="target_weight_kg"
          label="Target weight, kg"
          error={errors.target_weight_kg?.message}
        >
          <Input
            id="target_weight_kg"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("target_weight_kg")}
            aria-invalid={Boolean(errors.target_weight_kg)}
          />
        </Field>
        <Field id="target_date" label="Target date" error={errors.target_date?.message}>
          <Controller
            control={control}
            name="target_date"
            render={({ field }) => (
              <DatePicker
                id="target_date"
                name={field.name}
                value={field.value ?? ""}
                clearable
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.target_date)}
              />
            )}
          />
        </Field>
        <Field
          id="effective_from"
          label="Effective from"
          error={errors.effective_from?.message}
        >
          <Controller
            control={control}
            name="effective_from"
            render={({ field }) => (
              <DatePicker
                id="effective_from"
                name={field.name}
                value={field.value ?? ""}
                clearable
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.effective_from)}
              />
            )}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-700">
          Macros add up to {macroKcal.toLocaleString()} kcal
        </p>
        <Button type="submit" size="sm" disabled={createGoal.isPending}>
          {createGoal.isPending ? "Saving..." : "Save goals"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  dot,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  dot?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} required={required} className="text-xs">
        {dot ? (
          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: dot }} />
        ) : null}
        {label}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
