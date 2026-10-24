import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEntryDialog } from "@/features/entries/components/DeleteEntryDialog";
import { EditEntryDialog } from "@/features/entries/components/EditEntryDialog";
import { EntryForm } from "@/features/entries/components/EntryForm";
import { RecentFoodsPicker } from "@/features/entries/components/RecentFoodsPicker";
import { emptyEntryFormValues, recentFoodToFormValues } from "@/features/entries/formDefaults";
import { useCreateEntry, useRecentEntries } from "@/features/entries/hooks";
import type { EntryFormValues } from "@/features/entries/schemas";
import type { FoodEntry, FoodEntryCreatePayload } from "@/features/entries/types";
import { MEAL_TYPES } from "@/features/entries/types";
import { formatDecimal } from "@/lib/numbers";

export function LogMealPage() {
  const createEntry = useCreateEntry();
  const recent = useRecentEntries(1, 20);
  const [formValues, setFormValues] = useState<EntryFormValues>(emptyEntryFormValues());
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [deleting, setDeleting] = useState<FoodEntry | null>(null);

  async function handleCreate(payload: FoodEntryCreatePayload) {
    await createEntry.mutateAsync(payload);
    setFormValues(emptyEntryFormValues());
    setFormKey((k) => k + 1);
  }

  function applyRecent(entry: FoodEntry) {
    setFormValues(recentFoodToFormValues(entry, formValues.meal_type));
    setFormKey((k) => k + 1);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent foods</CardTitle>
          <CardDescription>Click a food to pre-fill the form below.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentFoodsPicker onSelect={applyRecent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log meal</CardTitle>
          <CardDescription>
            Enter meal details, macros, and optional micronutrients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntryForm
            key={formKey}
            initialValues={formValues}
            submitLabel="Log meal"
            onSubmit={handleCreate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently logged</CardTitle>
          <CardDescription>Edit or delete a recent entry (one row per food name).</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? <LoadingState label="Loading entries..." /> : null}
          {recent.isError ? (
            <ErrorState
              message="Could not load recent entries."
              onRetry={() => void recent.refetch()}
            />
          ) : null}
          {recent.data && recent.data.items.length === 0 ? (
            <EmptyState
              title="No entries yet"
              description="Log your first meal using the form above."
            />
          ) : null}
          {recent.data && recent.data.items.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Food</th>
                    <th className="px-3 py-2 font-medium">Meal</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Calories</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {recent.data.items.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{entry.food_name}</td>
                      <td className="px-3 py-2 capitalize">
                        {MEAL_TYPES.find((m) => m.value === entry.meal_type)?.label ??
                          entry.meal_type}
                      </td>
                      <td className="px-3 py-2">{entry.consumed_on}</td>
                      <td className="px-3 py-2">{formatDecimal(entry.calories_kcal)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(entry)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(entry)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EditEntryDialog
        entry={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      />
      <DeleteEntryDialog
        entry={deleting}
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
