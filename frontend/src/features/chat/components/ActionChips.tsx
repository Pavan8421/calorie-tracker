import type { ChatAction } from "@/features/chat/types";

type ActionChipsProps = {
  actions: ChatAction[];
};

const LABELS: Record<string, string> = {
  entry_created: "Logged meal",
  entry_updated: "Updated entry",
  entry_deleted: "Deleted entry",
  goal_set: "Updated goals",
  weight_logged: "Logged weight",
};

export function ActionChips({ actions }: ActionChipsProps) {
  if (!actions.length) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((action, index) => (
        <li
          key={`${action.type}-${action.id ?? index}`}
          className="inline-flex rounded-full border border-[#CFE6E1] bg-[#F2FAF8] px-2.5 py-1 text-[11px] font-semibold text-primary-ink"
        >
          {LABELS[action.type] ?? action.type}
          {action.id ? (
            <span className="ml-1 font-normal text-primary/70">
              · {action.id.slice(0, 8)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
