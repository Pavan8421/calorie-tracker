import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicronutrientFields } from "@/features/entries/components/MicronutrientFields";
import {
  emptyEntryFormValues,
  entryToFormValues,
  formValuesToPayload,
} from "@/features/entries/formDefaults";
import { useNutrients } from "@/features/entries/hooks";
import { entryFormSchema, type EntryFormValues } from "@/features/entries/schemas";
import type { FoodEntry, FoodEntryCreatePayload } from "@/features/entries/types";
import { MEAL_TYPES, UNITS } from "@/features/entries/types";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { LoadingState } from "@/components/common/LoadingState";

type EntryFormProps = {
  initialEntry?: FoodEntry | null;
  initialValues?: EntryFormValues | null;
  submitLabel?: string;
  onSubmit: (payload: FoodEntryCreatePayload) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({
  initialEntry,
  initialValues,
  submitLabel = "Log meal",
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const nutrientsQuery = useNutrients();
  const methods = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initialValues ?? (initialEntry ? entryToFormValues(initialEntry) : emptyEntryFormValues()),
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = methods;

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
      return;
    }
    if (initialEntry) {
      reset(entryToFormValues(initialEntry));
    }
  }, [initialEntry, initialValues, reset]);

  async function submit(values: EntryFormValues) {
    try {
      await onSubmit(formValuesToPayload(values));
    } catch (error) {
      applyApiFieldErrors(error, setError);
    }
  }

  if (nutrientsQuery.isLoading) {
    return <LoadingState label="Loading nutrients..." />;
  }

  return (
    <FormProvider {...methods}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="meal_type" label="Meal type" required error={errors.meal_type?.message}>
            <select
              id="meal_type"
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("meal_type")}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="food_name" label="Food name" required error={errors.food_name?.message}>
            <Input id="food_name" {...register("food_name")} />
          </Field>
          <Field id="quantity" label="Quantity" required error={errors.quantity?.message}>
            <Input id="quantity" type="number" step="0.01" min={0} {...register("quantity")} />
          </Field>
          <Field id="unit" label="Unit" required error={errors.unit?.message}>
            <select
              id="unit"
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("unit")}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="consumed_at_local"
            label="Date & time"
            error={errors.consumed_at_local?.message}
          >
            <Input id="consumed_at_local" type="datetime-local" {...register("consumed_at_local")} />
          </Field>
          <Field
            id="calories_kcal"
            label="Calories (kcal)"
            required
            error={errors.calories_kcal?.message}
          >
            <Input
              id="calories_kcal"
              type="number"
              step="0.01"
              min={0}
              {...register("calories_kcal")}
            />
          </Field>
          <Field id="protein_g" label="Protein (g)" required error={errors.protein_g?.message}>
            <Input id="protein_g" type="number" step="0.01" min={0} {...register("protein_g")} />
          </Field>
          <Field id="carbs_g" label="Carbs (g)" required error={errors.carbs_g?.message}>
            <Input id="carbs_g" type="number" step="0.01" min={0} {...register("carbs_g")} />
          </Field>
          <Field id="fat_g" label="Fat (g)" required error={errors.fat_g?.message}>
            <Input id="fat_g" type="number" step="0.01" min={0} {...register("fat_g")} />
          </Field>
          <Field id="fiber_g" label="Fiber (g)" error={errors.fiber_g?.message}>
            <Input id="fiber_g" type="number" step="0.01" min={0} {...register("fiber_g")} />
          </Field>
          <Field id="sugar_g" label="Sugar (g)" error={errors.sugar_g?.message}>
            <Input id="sugar_g" type="number" step="0.01" min={0} {...register("sugar_g")} />
          </Field>
        </div>

        <Field id="notes" label="Notes" error={errors.notes?.message}>
          <Input id="notes" {...register("notes")} />
        </Field>

        <MicronutrientFields nutrients={nutrientsQuery.data ?? []} />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
