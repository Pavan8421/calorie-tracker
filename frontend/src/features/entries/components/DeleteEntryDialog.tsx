import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useDeleteEntry } from "@/features/entries/hooks";
import type { FoodEntry } from "@/features/entries/types";

type DeleteEntryDialogProps = {
  entry: FoodEntry | null;
  open: boolean;
  onClose: () => void;
};

export function DeleteEntryDialog({ entry, open, onClose }: DeleteEntryDialogProps) {
  const deleteEntry = useDeleteEntry();

  return (
    <ConfirmDialog
      open={open && Boolean(entry)}
      title="Delete entry?"
      description={
        entry
          ? `Remove “${entry.food_name}” (${entry.consumed_on})? This cannot be undone.`
          : undefined
      }
      confirmLabel="Delete"
      destructive
      confirming={deleteEntry.isPending}
      onCancel={onClose}
      onConfirm={() => {
        if (!entry) return;
        void deleteEntry.mutateAsync(entry.id).then(onClose);
      }}
    />
  );
}
