import { SUGGESTED_PROMPTS } from "@/features/chat/types";

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="h-7 rounded-full border border-border bg-card px-2.5 text-[11px] font-medium text-stone-700 hover:bg-muted disabled:opacity-50"
          >
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  );
}
