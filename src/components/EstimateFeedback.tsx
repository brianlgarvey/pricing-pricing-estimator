import { useState, useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show the popup after a short delay so results render first
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = (value: FeedbackRating) => {
    if (selected) return;
    setSelected(value);
    onSubmit(value);
    // Auto-close after a brief moment
    setTimeout(() => {
      setOpen(false);
      setDismissed(true);
    }, 1500);
  };

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  if (dismissed && !selected) return null;
  if (!open && !selected) return null;

  // After dismissed with a selection, don't show anything
  if (!open && selected) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-base font-medium mb-1">
              How does this estimate feel?
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Your feedback helps us improve our estimates
            </p>

            <div className="flex items-center justify-center gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  disabled={!!selected}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all ${
                    selected === option.value
                      ? "bg-muted ring-2 ring-primary/30 scale-110"
                      : selected
                        ? "opacity-40 cursor-default"
                        : "hover:bg-muted/60 hover:scale-105 cursor-pointer"
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            {selected && (
              <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Thanks for the feedback!
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
