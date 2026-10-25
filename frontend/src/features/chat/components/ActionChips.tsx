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
          className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-teal-900"
        >
          {LABELS[action.type] ?? action.type}
          {action.id ? (
            <span className="ml-1 font-normal text-teal-800/70">
              · {action.id.slice(0, 8)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
