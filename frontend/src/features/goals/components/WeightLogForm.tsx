import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateWeightLog } from "@/features/goals/hooks";
import { weightLogSchema, type WeightLogFormValues } from "@/features/goals/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";

const fieldClass = "h-9 rounded-xl px-3 text-xs font-medium";

export function WeightLogForm() {
  const createLog = useCreateWeightLog();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<WeightLogFormValues>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      weight_kg: undefined as unknown as number,
      logged_on: undefined,
    },
  });

  async function onSubmit(values: WeightLogFormValues) {
    try {
      await createLog.mutateAsync({
        weight_kg: values.weight_kg,
        logged_on: values.logged_on ?? null,
      });
      reset({ weight_kg: undefined as unknown as number, logged_on: values.logged_on });
    } catch (error) {
      applyApiFieldErrors(error, setError);
    }
  }

  return (
    <form
      className="flex flex-col gap-2 border-t border-[#F0EBE3] pt-3"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-1">
          <Label htmlFor="weight_kg" required className="text-xs">
            Log today’s weight, kg
          </Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.01"
            className={fieldClass}
            {...register("weight_kg")}
            aria-invalid={Boolean(errors.weight_kg)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="logged_on" className="text-xs">
            Date
          </Label>
          <Controller
            control={control}
            name="logged_on"
            render={({ field }) => (
              <DatePicker
                id="logged_on"
                name={field.name}
                value={field.value ?? ""}
                placeholder="Today"
                clearable
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.logged_on)}
              />
            )}
          />
        </div>
        <Button type="submit" size="sm" disabled={createLog.isPending}>
          {createLog.isPending ? "Saving..." : "Log weight"}
        </Button>
      </div>
      {errors.weight_kg ? (
        <p className="text-[11px] text-destructive">{errors.weight_kg.message}</p>
      ) : null}
      {errors.logged_on ? (
        <p className="text-[11px] text-destructive">{errors.logged_on.message}</p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">Date defaults to today. Logging again updates that day.</p>
    </form>
  );
}
