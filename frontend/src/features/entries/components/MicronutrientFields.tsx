import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntryFormValues } from "@/features/entries/schemas";
import type { Nutrient } from "@/features/entries/types";

type MicronutrientFieldsProps = {
  nutrients: Nutrient[];
};

export function MicronutrientFields({ nutrients }: MicronutrientFieldsProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "micronutrients",
  });

  const selectedCodes = new Set(
    (watch("micronutrients") ?? []).map((row) => row.code).filter(Boolean),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Micronutrients</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const next = nutrients.find((n) => !selectedCodes.has(n.code));
            if (!next) return;
            append({ code: next.code, value: 0 });
          }}
          disabled={selectedCodes.size >= nutrients.length}
        >
          <Plus className="h-3.5 w-3.5" />
          Add nutrient
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Optional — add vitamins or minerals.</p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const code = watch(`micronutrients.${index}.code`);
          const nutrient = nutrients.find((n) => n.code === code);
          const available = nutrients.filter(
            (n) => n.code === code || !selectedCodes.has(n.code),
          );

          return (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <div className="space-y-1">
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  {...register(`micronutrients.${index}.code`)}
                >
                  {available.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.name}
                    </option>
                  ))}
                </select>
                {errors.micronutrients?.[index]?.code ? (
                  <p className="text-xs text-destructive">
                    {errors.micronutrients[index]?.code?.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="pr-10"
                    {...register(`micronutrients.${index}.value`)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                    {nutrient?.unit ?? ""}
                  </span>
                </div>
                {errors.micronutrients?.[index]?.value ? (
                  <p className="text-xs text-destructive">
                    {errors.micronutrients[index]?.value?.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                aria-label="Remove nutrient"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
