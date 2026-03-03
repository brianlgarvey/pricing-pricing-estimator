import { useState } from "react";
import { CheckCircle } from "lucide-react";

type FeedbackRating =
  | "way_too_low"
  | "a_bit_low"
  | "about_right"
  | "a_bit_high"
  | "way_too_high";

const FEEDBACK_OPTIONS: {
  value: FeedbackRating;
  emoji: string;
  label: string;
}[] = [
  { value: "way_too_low", emoji: "\u{1F62C}", label: "Way too low" },
  { value: "a_bit_low", emoji: "\u{1F914}", label: "A bit low" },
  { value: "about_right", emoji: "\u{1F44D}", label: "About right" },
  { value: "a_bit_high", emoji: "\u{1F60F}", label: "A bit high" },
  { value: "way_too_high", emoji: "\u{1F633}", label: "Way too high" },
];

interface EstimateFeedbackProps {
  onSubmit: (rating: string) => void;
}

export function EstimateFeedback({ onSubmit }: EstimateFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackRating | null>(null);

  const handleSelect = (value: FeedbackRating) => {
    if (selected) return;
    setSelected(value);
    onSubmit(value);
  };

  return (
    <div className="text-center py-4">
      <p className="text-sm text-muted-foreground mb-3">
        How does this estimate feel?
      </p>
      <div className="flex items-center justify-center gap-2">
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={!!selected}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              selected === option.value
                ? "bg-muted ring-2 ring-primary/30"
                : selected
                  ? "opacity-40 cursor-default"
                  : "hover:bg-muted/60 cursor-pointer"
            }`}
          >
            <span className="text-2xl">{option.emoji}</span>
            <span className="text-[11px] text-muted-foreground">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Thanks for the feedback!
        </p>
      )}
    </div>
  );
}
