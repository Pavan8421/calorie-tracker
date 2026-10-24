import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateWeightLog } from "@/features/goals/hooks";
import { weightLogSchema, type WeightLogFormValues } from "@/features/goals/schemas";
import { applyApiFieldErrors } from "@/lib/formErrors";

export function WeightLogForm() {
  const createLog = useCreateWeightLog();
  const {
    register,
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
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weight_kg" required>
            Weight (kg)
          </Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.01"
            {...register("weight_kg")}
            aria-invalid={Boolean(errors.weight_kg)}
          />
          {errors.weight_kg ? (
            <p className="text-xs text-destructive">{errors.weight_kg.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="logged_on">Date (optional)</Label>
          <Input
            id="logged_on"
            type="date"
            {...register("logged_on")}
            aria-invalid={Boolean(errors.logged_on)}
          />
          {errors.logged_on ? (
            <p className="text-xs text-destructive">{errors.logged_on.message}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">Defaults to today in your timezone.</p>
        </div>
      </div>
      <Button type="submit" disabled={createLog.isPending}>
        {createLog.isPending ? "Saving..." : "Log weight"}
      </Button>
    </form>
  );
}
