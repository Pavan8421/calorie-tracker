import { Camera, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { DeleteEntryDialog } from "@/features/entries/components/DeleteEntryDialog";
import { EditEntryDialog } from "@/features/entries/components/EditEntryDialog";
import { EntryForm } from "@/features/entries/components/EntryForm";
import { RecentFoodsPicker } from "@/features/entries/components/RecentFoodsPicker";
import {
  draftToFormValues,
  emptyEntryFormValues,
  recentFoodToFormValues,
} from "@/features/entries/formDefaults";
import { useCreateEntry, useEntries } from "@/features/entries/hooks";
import type { EntryFormValues } from "@/features/entries/schemas";
import type {
  ClientEntrySource,
  FoodEntry,
  FoodEntryCreatePayload,
  MealType,
} from "@/features/entries/types";
import { MEAL_TYPES } from "@/features/entries/types";
import { useDailySummary } from "@/features/reports/hooks";
import { ScanPhotoDialog } from "@/features/scan/components/ScanPhotoDialog";
import type { DraftFoodItem } from "@/features/scan/types";
import { todayISO } from "@/lib/dates";
import { formatDecimal } from "@/lib/numbers";

function mealFromParam(value: string | null): MealType | null {
  if (!value) return null;
  return MEAL_TYPES.some((meal) => meal.value === value) ? (value as MealType) : null;
}

function formForMeal(meal: MealType | null): EntryFormValues {
  const blank = emptyEntryFormValues();
  return meal ? { ...blank, meal_type: meal } : blank;
}

export function LogMealPage() {
  const [searchParams] = useSearchParams();
  const presetMeal = mealFromParam(searchParams.get("meal"));
  const createEntry = useCreateEntry();
  const summary = useDailySummary();
  const day = summary.data?.date ?? todayISO();
  const todayEntries = useEntries({
    start_date: day,
    end_date: day,
    meal_types: [],
    page: 1,
    page_size: 20,
  });
  const [formValues, setFormValues] = useState<EntryFormValues>(() => formForMeal(presetMeal));
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!presetMeal) return;
    setFormValues((current) =>
      current.meal_type === presetMeal ? current : { ...current, meal_type: presetMeal },
    );
  }, [presetMeal]);
  const [entrySource, setEntrySource] = useState<ClientEntrySource>("manual");
  const [scanOpen, setScanOpen] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [deleting, setDeleting] = useState<FoodEntry | null>(null);

  async function handleCreate(payload: FoodEntryCreatePayload) {
    await createEntry.mutateAsync(payload);
    setFormValues(formForMeal(presetMeal));
    setEntrySource("manual");
    setFormKey((k) => k + 1);
  }

  function applyRecent(entry: FoodEntry) {
    setFormValues(recentFoodToFormValues(entry, formValues.meal_type));
    setEntrySource("manual");
    setFormKey((k) => k + 1);
  }

  function applyDraft(item: DraftFoodItem, analysisNotes: string) {
    setFormValues(draftToFormValues(item, formValues.meal_type as MealType, analysisNotes));
    setEntrySource("ai_image");
    setFormKey((k) => k + 1);
  }

  const logged = todayEntries.data?.items ?? [];

  return (
    <div className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-0.5">
        <h1 className="text-lg font-extrabold tracking-tight">Log meal</h1>
        <p className="text-xs text-muted-foreground">
          Pick a recent food, scan a photo, or enter it yourself.
        </p>
        {entrySource === "ai_image" ? (
          <p className="text-xs font-medium text-primary">
            Form pre-filled from a photo. Review the numbers, then save.
          </p>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:overflow-hidden">
        <section className="overflow-y-auto rounded-2xl border border-border bg-card px-3 py-3 sm:px-4">
          <EntryForm
            key={formKey}
            initialValues={formValues}
            source={entrySource}
            showImpact
            onSubmit={handleCreate}
          />
        </section>

        <div className="flex min-h-0 flex-col gap-2">
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex min-h-16 flex-col items-start justify-between gap-1 rounded-xl bg-primary-deep px-3 py-2.5 text-left text-primary-foreground"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              <span>
                <span className="block text-xs font-bold">Scan a photo</span>
                <span className="block text-[11px] text-[#C5E8E2]">Plate or nutrition label</span>
              </span>
            </button>
            <Link
              to="/chat"
              className="flex min-h-16 flex-col items-start justify-between gap-1 rounded-xl border border-border bg-card px-3 py-2.5 text-foreground no-underline"
            >
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-xs font-bold">Describe in chat</span>
                <span className="block text-[11px] text-muted-foreground">“2 idlis and sambar”</span>
              </span>
            </Link>
          </div>

          <RecentFoodsPicker onSelect={applyRecent} />

          <section className="flex max-h-36 shrink-0 flex-col gap-1 overflow-hidden rounded-2xl border border-border bg-card px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold">Logged today</h2>
              <Link to="/entries" className="text-xs font-semibold text-foreground no-underline hover:text-primary">
                All entries
              </Link>
            </div>
            {todayEntries.isLoading ? <LoadingState label="Loading today’s meals..." /> : null}
            {todayEntries.isError ? (
              <ErrorState
                message="Could not load today’s meals."
                onRetry={() => void todayEntries.refetch()}
              />
            ) : null}
            {!todayEntries.isLoading && !todayEntries.isError && logged.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing logged yet today.</p>
            ) : null}
            {logged.length > 0 ? (
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {logged.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{entry.food_name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {MEAL_TYPES.find((meal) => meal.value === entry.meal_type)?.label ??
                          entry.meal_type}
                        , {formatDecimal(entry.quantity, 0)} {entry.unit}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="text-xs font-bold">
                        {formatDecimal(entry.calories_kcal, 0)} kcal
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 px-0"
                        aria-label={`Edit ${entry.food_name}`}
                        onClick={() => setEditing(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${entry.food_name}`}
                        onClick={() => setDeleting(entry)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>

      <ScanPhotoDialog open={scanOpen} onClose={() => setScanOpen(false)} onUseDraft={applyDraft} />
      <EditEntryDialog entry={editing} open={Boolean(editing)} onClose={() => setEditing(null)} />
      <DeleteEntryDialog
        entry={deleting}
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
