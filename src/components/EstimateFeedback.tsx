import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";

export function EstimateFeedback() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
        onClick={() => setDismissed(true)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold mb-1">
              This is just an estimate
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              For an accurate quote tailored to your project, get matched with vetted HubSpot experts — it&apos;s free and there&apos;s no commitment.
            </p>

            <a
              href="https://profound.ly/get-started?hsCtaAttrib=193271833768"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Get matched with experts
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={() => setDismissed(true)}
              className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll keep exploring for now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
