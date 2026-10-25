import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MicronutrientFields } from "@/features/entries/components/MicronutrientFields";
import {
  emptyEntryFormValues,
  entryToFormValues,
  formValuesToPayload,
} from "@/features/entries/formDefaults";
import { useNutrients } from "@/features/entries/hooks";
import { entryFormSchema, type EntryFormValues } from "@/features/entries/schemas";
import type {
  ClientEntrySource,
  FoodEntry,
  FoodEntryCreatePayload,
  MealType,
} from "@/features/entries/types";
import { MEAL_TYPES, UNITS } from "@/features/entries/types";
import { useDailySummary } from "@/features/reports/hooks";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";

const fieldControlClass = "h-9 text-xs";

type EntryFormProps = {
  initialEntry?: FoodEntry | null;
  initialValues?: EntryFormValues | null;
  submitLabel?: string;
  source?: ClientEntrySource;
  /** Live “adds X kcal / Y left” line, using today’s summary. */
  showImpact?: boolean;
  onSubmit: (payload: FoodEntryCreatePayload) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({
  initialEntry,
  initialValues,
  submitLabel = "Log meal",
  source = "manual",
  showImpact = false,
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const nutrientsQuery = useNutrients();
  const summary = useDailySummary();
  const [microsOpen, setMicrosOpen] = useState(
    () =>
      (initialValues?.micronutrients.length ?? 0) > 0 ||
      Object.keys(initialEntry?.micronutrients ?? {}).length > 0,
  );
  const methods = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initialValues ?? (initialEntry ? entryToFormValues(initialEntry) : emptyEntryFormValues()),
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  const mealType = watch("meal_type");
  const calories = Number(watch("calories_kcal")) || 0;
  const microCount = watch("micronutrients")?.length ?? 0;

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
      setMicrosOpen(initialValues.micronutrients.length > 0);
      return;
    }
    if (initialEntry) {
      const next = entryToFormValues(initialEntry);
      reset(next);
      setMicrosOpen(next.micronutrients.length > 0);
    }
  }, [initialEntry, initialValues, reset]);

  async function submit(values: EntryFormValues) {
    try {
      await onSubmit(formValuesToPayload(values, source));
    } catch (error) {
      applyApiFieldErrors(error, setError);
    }
  }

  if (nutrientsQuery.isLoading) {
    return <LoadingState label="Loading nutrients..." />;
  }

  const mealLabel = MEAL_TYPES.find((meal) => meal.value === mealType)?.label ?? "meal";

  return (
    <FormProvider {...methods}>
      <form className="flex flex-col gap-2" onSubmit={handleSubmit(submit)} noValidate>
        <div className="flex flex-col gap-1">
          <span id="meal-type-label" className="text-xs font-semibold">
            Meal
          </span>
          <Controller
            control={control}
            name="meal_type"
            render={({ field }) => (
              <div
                role="group"
                aria-labelledby="meal-type-label"
                className="grid grid-cols-2 gap-1 rounded-xl bg-ring-track p-1 sm:grid-cols-4"
              >
                {MEAL_TYPES.map((meal) => {
                  const selected = field.value === meal.value;
                  return (
                    <button
                      key={meal.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => field.onChange(meal.value as MealType)}
                      className={cn(
                        "h-8 rounded-lg text-xs",
                        selected
                          ? "bg-card font-bold text-primary-ink shadow-sm"
                          : "font-medium text-stone-700 hover:text-foreground",
                      )}
                    >
                      {meal.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.meal_type ? (
            <p className="text-xs text-destructive">{errors.meal_type.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field id="food_name" label="Food" required error={errors.food_name?.message}>
            <Input id="food_name" className={fieldControlClass} {...register("food_name")} />
          </Field>
          <Field id="quantity" label="Quantity" required error={errors.quantity?.message}>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("quantity")}
            />
          </Field>
          <Field id="unit" label="Unit" required error={errors.unit?.message}>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select
                  id="unit"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={UNITS.map((unit) => unit)}
                  aria-invalid={Boolean(errors.unit)}
                  className={fieldControlClass}
                />
              )}
            />
          </Field>
        </div>

        <div className="grid gap-2 rounded-xl border border-[#F0EBE3] bg-surface p-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="calories_kcal" label="Calories" required error={errors.calories_kcal?.message}>
            <Input
              id="calories_kcal"
              type="number"
              step="0.01"
              min={0}
              className={cn(fieldControlClass, "border-primary font-semibold")}
              {...register("calories_kcal")}
            />
          </Field>
          <Field
            id="protein_g"
            label="Protein, g"
            dotClassName="bg-[#115E59]"
            required
            error={errors.protein_g?.message}
          >
            <Input
              id="protein_g"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("protein_g")}
            />
          </Field>
          <Field
            id="carbs_g"
            label="Carbs, g"
            dotClassName="bg-accent-gold"
            required
            error={errors.carbs_g?.message}
          >
            <Input
              id="carbs_g"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("carbs_g")}
            />
          </Field>
          <Field
            id="fat_g"
            label="Fat, g"
            dotClassName="bg-accent-purple"
            required
            error={errors.fat_g?.message}
          >
            <Input
              id="fat_g"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("fat_g")}
            />
          </Field>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Field id="consumed_at_local" label="When" error={errors.consumed_at_local?.message}>
            <Controller
              control={control}
              name="consumed_at_local"
              render={({ field }) => {
                const { date, time } = splitDatetimeLocal(field.value);
                return (
                  <div className="flex gap-1.5">
                    <DatePicker
                      id="consumed_at_local"
                      value={date}
                      className="min-w-0 flex-1"
                      aria-invalid={Boolean(errors.consumed_at_local)}
                      onChange={(next) => field.onChange(joinDatetimeLocal(next, time || "00:00"))}
                      onBlur={field.onBlur}
                    />
                    <Input
                      type="time"
                      aria-label="Time"
                      value={time}
                      className={cn(fieldControlClass, "w-[6.25rem] shrink-0")}
                      onChange={(event) =>
                        field.onChange(joinDatetimeLocal(date, event.target.value))
                      }
                      onBlur={field.onBlur}
                    />
                  </div>
                );
              }}
            />
          </Field>
          <Field id="fiber_g" label="Fiber, g" optional error={errors.fiber_g?.message}>
            <Input
              id="fiber_g"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("fiber_g")}
            />
          </Field>
          <Field id="sugar_g" label="Sugar, g" optional error={errors.sugar_g?.message}>
            <Input
              id="sugar_g"
              type="number"
              step="0.01"
              min={0}
              className={fieldControlClass}
              {...register("sugar_g")}
            />
          </Field>
        </div>

        <Field id="notes" label="Notes" optional error={errors.notes?.message}>
          <Input
            id="notes"
            placeholder="With coconut chutney"
            className={fieldControlClass}
            {...register("notes")}
          />
        </Field>

        {microsOpen || microCount > 0 ? (
          <MicronutrientFields nutrients={nutrientsQuery.data ?? []} />
        ) : (
          <button
            type="button"
            onClick={() => setMicrosOpen(true)}
            className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-dashed border-[#CFC5B5] px-2.5 text-xs font-semibold text-primary hover:bg-primary-soft"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add vitamins or minerals
          </button>
        )}

        <div className="flex flex-col gap-2 border-t border-[#F0EBE3] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
          {showImpact ? (
            <p className="text-xs text-muted-foreground">
              {impactLine(mealLabel, calories, summary.data)}
            </p>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : showImpact
                  ? `Save to ${mealLabel.toLowerCase()}`
                  : submitLabel}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function impactLine(
  mealLabel: string,
  calories: number,
  summary: { totals: { calories_kcal: string | number }; goal: { calories_kcal: number } | null } | undefined,
): string {
  const adds = `Adds ${formatKcal(calories)} kcal to ${mealLabel.toLowerCase()}.`;
  const goal = summary?.goal?.calories_kcal ?? null;
  const eaten = toNumber(summary?.totals.calories_kcal) ?? 0;
  if (goal == null) return adds;
  const after = goal - eaten - calories;
  if (after >= 0) return `${adds} ${formatKcal(after)} kcal left after this.`;
  return `${adds} ${formatKcal(Math.abs(after))} kcal over after this.`;
}

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString();
}

function splitDatetimeLocal(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: (time ?? "").slice(0, 5) };
}

function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function Field({
  id,
  label,
  required,
  optional,
  error,
  dotClassName,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  dotClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} required={required} className="text-xs font-semibold">
        {dotClassName ? (
          <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-sm", dotClassName)} />
        ) : null}
        {label}
        {optional ? <span className="font-medium text-muted-foreground"> optional</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
