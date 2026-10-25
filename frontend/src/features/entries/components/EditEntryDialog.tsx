import { EntryForm } from "@/features/entries/components/EntryForm";
import { useUpdateEntry } from "@/features/entries/hooks";
import type { FoodEntry, FoodEntryCreatePayload } from "@/features/entries/types";

type EditEntryDialogProps = {
  entry: FoodEntry | null;
  open: boolean;
  onClose: () => void;
};

export function EditEntryDialog({ entry, open, onClose }: EditEntryDialogProps) {
  const updateEntry = useUpdateEntry();

  if (!open || !entry) return null;

  async function handleSubmit(payload: FoodEntryCreatePayload) {
    await updateEntry.mutateAsync({ id: entry!.id, payload });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/30"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-entry-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-4"
      >
        <h2 id="edit-entry-title" className="mb-3 text-sm font-bold">
          Edit entry
        </h2>
        <EntryForm
          initialEntry={entry}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
