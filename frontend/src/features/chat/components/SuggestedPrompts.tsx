import { Button } from "@/components/ui/button";
import { SUGGESTED_PROMPTS } from "@/features/chat/types";

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="mx-auto max-w-lg space-y-3 px-2 py-6 text-center">
      <p className="text-sm text-muted-foreground">
        Ask anything about logging meals, goals, weight, or summaries.
      </p>
      <ul className="flex flex-col gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full whitespace-normal px-3 py-2 text-left text-sm font-normal"
              disabled={disabled}
              onClick={() => onSelect(prompt)}
            >
              {prompt}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
