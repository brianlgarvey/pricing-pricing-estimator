import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProjectInput } from "@/components/ProjectInput";
import { EmailCaptureModal, type ContactInfo } from "@/components/EmailCaptureModal";
import { PriceDisplay } from "@/components/PriceDisplay";
import { EstimateFeedback } from "@/components/EstimateFeedback";
import { SimilarProjectsList } from "@/components/SimilarProjectsList";
import { PriceChart } from "@/components/PriceChart";
import { loadProposals } from "@/lib/csvParser";
import { buildCorpus, findSimilar, type TfIdfCorpus, type SimilarMatch } from "@/lib/similarity";
import { analyzeScopeSignals } from "@/lib/scopeAnalyzer";
import { calculatePriceEstimate, type PriceEstimate } from "@/lib/priceCalculator";
import { Disclaimer } from "@/components/DisclaimerCta";
import { submitEstimate } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

type AppState = "loading" | "ready" | "email-capture" | "analyzing" | "results" | "error";

export default function Index() {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string>("");
  const corpusRef = useRef<TfIdfCorpus | null>(null);

  // Pending description (submitted before email capture)
  const [pendingDescription, setPendingDescription] = useState("");

  // Results
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const submissionIdPromiseRef = useRef<Promise<string | null>>(Promise.resolve(null));

  useEffect(() => {
    async function init() {
      try {
        const proposals = await loadProposals();
        const corpus = buildCorpus(proposals);
        corpusRef.current = corpus;
        setState("ready");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load proposal data"
        );
        setState("error");
      }
    }
    init();
  }, []);

  const runAnalysis = useCallback(
    (description: string, email: string) => {
      if (!corpusRef.current) return;

      setState("analyzing");

      setTimeout(() => {
        try {
          const corpus = corpusRef.current!;
          const similar = findSimilar(description, corpus);
          const scope = analyzeScopeSignals(description);
          const estimate = calculatePriceEstimate(similar, scope);

          setMatches(similar);
          setPriceEstimate(estimate);
          setState("results");

          submissionIdPromiseRef.current = submitEstimate(email, description, estimate);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Analysis failed"
          );
          setState("error");
        }
      }, 50);
    },
    []
  );

  // Called when user submits description (no email yet)
  const handleDescriptionSubmit = useCallback(
    (description: string) => {
      setPendingDescription(description);
      setState("email-capture");
    },
    []
  );

  // Called when URL has both description and email (auto-submit from RFP tool)
  const handleAutoSubmit = useCallback(
    (description: string, email: string) => {
      setPendingDescription(description);
      runAnalysis(description, email);
    },
    [runAnalysis]
  );

  // Called when user submits email in the modal
  const handleEmailSubmit = useCallback(
    (contact: ContactInfo) => {
      runAnalysis(pendingDescription, contact.email);
    },
    [pendingDescription, runAnalysis]
  );



  const handleReset = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
    setMatches([]);
    setPriceEstimate(null);
    setPendingDescription("");
    setState("ready");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex flex-1 flex-col mx-auto w-full max-w-5xl px-4 py-8">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Loading proposal data and building similarity index...
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-destructive font-medium">Error</p>
            <p className="text-muted-foreground text-sm max-w-md text-center">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary underline hover:no-underline"
            >
              Reload page
            </button>
          </div>
        )}

        {(state === "ready" || state === "analyzing") && (
          <ProjectInput
            onSubmitDescription={handleDescriptionSubmit}
            onAutoSubmit={handleAutoSubmit}
            isAnalyzing={state === "analyzing"}
          />
        )}

        {state === "email-capture" && (
          <div className="relative">
            <div className="blur-sm brightness-[0.97] pointer-events-none select-none">
              <ProjectInput
                onSubmitDescription={() => {}}
                isAnalyzing={false}
              />
            </div>
            <EmailCaptureModal open={true} onSubmit={handleEmailSubmit} />
          </div>
        )}

        {state === "results" && priceEstimate && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analysis Results</h2>
              <button
                onClick={handleReset}
                className="text-sm text-primary hover:underline"
              >
                New estimate
              </button>
            </div>

            <PriceDisplay estimate={priceEstimate} matches={matches} />

            <Disclaimer />

            <EstimateFeedback />

            {matches.length >= 3 && (
              <PriceChart matches={matches} estimate={priceEstimate} />
            )}

            <SimilarProjectsList matches={matches} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
